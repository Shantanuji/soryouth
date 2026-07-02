
import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import os from 'os';
import fs from 'fs/promises';
import { format, parseISO } from 'date-fns';
import { getTemplateById } from '@/app/(app)/manage-templates/actions';
import type { DocumentType } from '@/types';
import { uploadFileToS3, getFileFromS3, deleteFileFromS3 } from '@/lib/s3';
import prisma from '@/lib/prisma';
import { verifySession } from '@/lib/auth';
import { getFinancialDocumentTypes } from '@/app/(app)/settings/actions';

function camelCaseToTitleCase(text: string) {
    const result = text.replace(/([A-Z])/g, " $1");
    return result.charAt(0).toUpperCase() + result.slice(1);
}

function getTemplateData(formData: any, documentType: DocumentType) {
    const data: Record<string, any> = {
        date_today: format(new Date(), 'dd MMM, yyyy'),
    };
    for (const key in formData) {
        if (Object.prototype.hasOwnProperty.call(formData, key)) {
            const value = formData[key];
            const placeholderKey = key.replace(/ /g, '_').toLowerCase();
            data[placeholderKey] = value;
        }
    }
    return data;
}

export async function POST(request: NextRequest) {
  let tempFilePath: string | null = null;
  const session = await verifySession();
  if (!session?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { templateId, formData, documentType, documentIdToUpdate } = await request.json();

    if (!templateId || !formData || !documentType) {
      return NextResponse.json({ error: 'Missing templateId, formData, or documentType' }, { status: 400 });
    }

    const template = await getTemplateById(templateId);

    if (!template || !template.originalDocxPath) {
      return NextResponse.json({ error: 'Template not found or has no associated file.' }, { status: 404 });
    }
    
    // Determine if this is a financial document type
    const financialDocTypes = await getFinancialDocumentTypes();
    const financialDocTypeNames = financialDocTypes.map(t => t.name);
    const isFinancialDocument = financialDocTypeNames.includes(documentType);
    
    const s3Url = new URL(template.originalDocxPath);
    const templateKey = s3Url.pathname.substring(1);
    const templateBuffer = await getFileFromS3(templateKey);
    
    const tempDir = os.tmpdir();
    tempFilePath = path.join(tempDir, `template-${Date.now()}.docx`);
    await fs.writeFile(tempFilePath, templateBuffer);

    const templateData = getTemplateData(formData, documentType);
    
    const pythonServiceUrl = process.env.PYTHON_MICROSERVICE_URL ? `${process.env.PYTHON_MICROSERVICE_URL}/generate` : 'http://127.0.0.1:5001/generate';
    const response = await fetch(pythonServiceUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            template_path: tempFilePath,
            data: templateData
        })
    });

    if (!response.ok) {
        const errorBody = await response.json();
        throw new Error(errorBody.error || `Python service failed with status ${response.status}`);
    }

    const result = await response.json();

    if (!result.success || !result.pdf_b64 || !result.docx_b64) {
      throw new Error("Python service returned an invalid payload.");
    }
    
    const pdfBuffer = Buffer.from(result.pdf_b64, 'base64');
    const docxBuffer = Buffer.from(result.docx_b64, 'base64');

    const clientName = (formData.client_name || formData.clientName || 'document').toString();
    const baseKey = `documents/${clientName.replace(/\s/g, '_')}_${documentType.replace(/\s/g, '_')}_${Date.now()}`;
    const pdfKey = `${baseKey}.pdf`;
    const docxKey = `${baseKey}.docx`;

    // If updating, delete old files from S3 first
    if (documentIdToUpdate) {
        const dbModel = isFinancialDocument ? prisma.financialDocument : prisma.generatedDocument;
        const oldDoc = await (dbModel as any).findUnique({ where: { id: documentIdToUpdate } });
        if (oldDoc) {
            await Promise.all([
                deleteFileFromS3(new URL(oldDoc.pdfUrl).pathname.substring(1)),
                deleteFileFromS3(new URL(oldDoc.docxUrl).pathname.substring(1)),
            ]);
        }
    }

    const [pdfUrl, docxUrl] = await Promise.all([
        uploadFileToS3(pdfBuffer, pdfKey, 'application/pdf'),
        uploadFileToS3(docxBuffer, docxKey, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
    ]);
    
    const sharedData = {
        clientName: clientName,
        documentType: documentType,
        pdfUrl: pdfUrl,
        docxUrl: docxUrl,
        templateId: template.id,
        formData: JSON.stringify(formData),
    };

    let savedDocumentId;

    if (documentIdToUpdate) {
        const dbModel = isFinancialDocument ? prisma.financialDocument : prisma.generatedDocument;
        const updatedDoc = await (dbModel as any).update({
            where: { id: documentIdToUpdate },
            data: sharedData,
        });
        savedDocumentId = updatedDoc.id;
    } else {
        if (isFinancialDocument) {
             const newDoc = await prisma.financialDocument.create({
                data: {
                    ...sharedData,
                    status: 'Pending',
                },
            });
            savedDocumentId = newDoc.id;
        } else {
            const newDoc = await prisma.generatedDocument.create({
                data: sharedData,
            });
            savedDocumentId = newDoc.id;
        }
    }

    return NextResponse.json({
      success: true,
      pdfUrl: pdfUrl,
      docxUrl: docxUrl,
      documentId: savedDocumentId,
      isFinancialDocument: isFinancialDocument,
    });

  } catch (error) {
    console.error('Error in document generation orchestrator:', error);
    let errorMessage = 'Failed to generate document.';
    if (error instanceof Error) {
        errorMessage = error.message;
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  } finally {
      if (tempFilePath) {
          await fs.unlink(tempFilePath).catch(err => console.error(`Failed to delete temp file: ${tempFilePath}`, err));
      }
  }
}
