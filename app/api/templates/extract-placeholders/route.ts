
import { NextRequest, NextResponse } from 'next/server';
import PizZip from 'pizzip';

export async function POST(request: NextRequest) {
  let fileBuffer: Buffer | null = null;
  let file: File | null = null;
  
  try {
    const formData = await request.formData();
    file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    fileBuffer = Buffer.from(arrayBuffer);

    // The Python service expects FormData, so we reconstruct it for forwarding.
    const pythonServiceFormData = new FormData();
    pythonServiceFormData.append('file', file);

    const pythonServiceUrl = process.env.PYTHON_MICROSERVICE_URL
      ? `${process.env.PYTHON_MICROSERVICE_URL.replace('/generate', '')}/extract-placeholders`
      : 'http://127.0.0.1:5001/extract-placeholders';
      
    const response = await fetch(pythonServiceUrl, {
      method: 'POST',
      body: pythonServiceFormData,
    });

    if (!response.ok) {
      const errorBody = await response.json();
      throw new Error(errorBody.error || `Python service failed with status ${response.status}`);
    }

    const result = await response.json();
    return NextResponse.json(result);

  } catch (error) {
    console.error('Error in /api/templates/extract-placeholders, executing JS fallback:', error);
    
    // JS Fallback using PizZip to extract placeholders directly from the DOCX file archive
    if (fileBuffer) {
      try {
        const zip = new PizZip(fileBuffer);
        const placeholders = new Set<string>();
        const pattern = /\{\{([^}]+)\}\}/g;

        // Read main document text
        const docXml = zip.file('word/document.xml')?.asText() || '';
        const plainText = docXml.replace(/<[^>]+>/g, '');
        let match;
        while ((match = pattern.exec(plainText)) !== null) {
          placeholders.add(`{{${match[1].trim()}}}`);
        }

        // Read headers/footers
        const files = Object.keys(zip.files);
        for (const f of files) {
          if (f.startsWith('word/header') || f.startsWith('word/footer')) {
            const xml = zip.file(f)?.asText() || '';
            const text = xml.replace(/<[^>]+>/g, '');
            let m;
            while ((m = pattern.exec(text)) !== null) {
              placeholders.add(`{{${m[1].trim()}}}`);
            }
          }
        }

        return NextResponse.json({
          success: true,
          placeholders: Array.from(placeholders).sort(),
          fallback: true
        });
      } catch (fallbackError) {
        console.error('JS Fallback extraction failed:', fallbackError);
      }
    }

    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

