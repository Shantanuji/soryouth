import { NextResponse, type NextRequest } from 'next/server';
import { uploadFileToS3 } from '@/lib/s3';
import path from 'path';
import fs from 'fs/promises';

export const dynamic = 'force-dynamic';
export const maxDuration = 120; // Allow ample time for 50MB+ uploads

export async function POST(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const nameParam = searchParams.get('name');
    const folderParam = searchParams.get('folder') || 'templates';
    const contentType = request.headers.get('content-type') || '';

    let fileBuffer: Buffer | null = null;
    let fileName = nameParam ? decodeURIComponent(nameParam) : 'template.docx';

    // 1. Direct Binary Stream (Preferred & most resilient for large files up to 100MB)
    if (!contentType.includes('multipart/form-data')) {
      if (request.body) {
        const reader = request.body.getReader();
        const chunks: Uint8Array[] = [];
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) chunks.push(value);
        }
        if (chunks.length > 0) {
          fileBuffer = Buffer.concat(chunks);
        }
      }
      
      if (!fileBuffer) {
        const rawArrayBuffer = await request.arrayBuffer();
        if (rawArrayBuffer && rawArrayBuffer.byteLength > 0) {
          fileBuffer = Buffer.from(rawArrayBuffer);
        }
      }
    } else {
      // 2. Multipart fallback
      try {
        const formData = await request.formData();
        const file = formData.get('file') as File | null;
        if (file) {
          fileName = file.name;
          const bytes = await file.arrayBuffer();
          fileBuffer = Buffer.from(bytes);
        }
      } catch (formErr) {
        if (request.body) {
          const reader = request.body.getReader();
          const chunks: Uint8Array[] = [];
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            if (value) chunks.push(value);
          }
          if (chunks.length > 0) {
            fileBuffer = Buffer.concat(chunks);
          }
        }
      }
    }

    if (!fileBuffer || fileBuffer.length === 0) {
      return NextResponse.json({ error: 'No file received or file was empty.' }, { status: 400 });
    }

    const safeFilename = fileName.replace(/[^a-zA-Z0-9.\-_]/g, '') || `template-${Date.now()}.docx`;
    const uniqueKey = `uploads/${folderParam}/${Date.now()}-${safeFilename}`;

    // 1. ALWAYS save template locally on VPS for fast generation (no S3 round-trip)
    const localSavePath = path.join(process.cwd(), 'public', uniqueKey);
    await fs.mkdir(path.dirname(localSavePath), { recursive: true });
    await fs.writeFile(localSavePath, fileBuffer);
    console.log(`[Template Upload] Saved locally: ${localSavePath}`);

    // 2. Also upload to S3 in background (non-blocking, for backup only)
    let fileUrl = `/${uniqueKey}`; // Default to local relative path
    try {
      const s3Url = await uploadFileToS3(
        fileBuffer,
        uniqueKey,
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      );
      // Keep S3 URL only if it is a real http URL (not local fallback)
      if (s3Url.startsWith('http')) {
        fileUrl = s3Url;
        console.log(`[Template Upload] Also uploaded to S3: ${s3Url}`);
      }
    } catch (s3Err: any) {
      console.warn(`[Template Upload] S3 upload failed (local copy still available): ${s3Err?.message}`);
    }

    // Safely extract placeholders if possible
    let placeholders: string[] = [];
    try {
      const PizZip = (await import('pizzip')).default;
      const zip = new PizZip(fileBuffer);
      const foundSet = new Set<string>();
      const pattern = /\{\{([^}]+)\}\}/g;
      for (const f of Object.keys(zip.files)) {
        if (f.startsWith('word/') && f.endsWith('.xml')) {
          const content = zip.file(f)?.asText() || '';
          const plainText = content.replace(/<[^>]+>/g, '');
          let match;
          while ((match = pattern.exec(plainText)) !== null) {
            const ph = match[1].trim();
            if (ph) {
              foundSet.add(`{{${ph}}}`);
            }
          }
        }
      }
      placeholders = Array.from(foundSet);
    } catch (e) {
      console.warn('Non-fatal placeholder extraction notice:', e);
    }

    return NextResponse.json({
      success: true,
      filePath: fileUrl,
      placeholders: placeholders,
    });

  } catch (error: any) {
    console.error('Error processing upload in route:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to process file upload.' },
      { status: 500 }
    );
  }
}
