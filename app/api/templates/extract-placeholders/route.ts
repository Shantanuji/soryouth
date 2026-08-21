
import { NextRequest, NextResponse } from 'next/server';
import PizZip from 'pizzip';

export const dynamic = 'force-dynamic';

function parseMultipartBody(buffer: Buffer, boundary: string): Buffer | null {
  const boundaryBuffer = Buffer.from(`--${boundary}`);
  let start = 0;

  while (start < buffer.length) {
    const boundaryIdx = buffer.indexOf(boundaryBuffer, start);
    if (boundaryIdx === -1) break;

    const partStart = boundaryIdx + boundaryBuffer.length;
    const nextBoundaryIdx = buffer.indexOf(boundaryBuffer, partStart);
    if (nextBoundaryIdx === -1) break;

    const part = buffer.subarray(partStart, nextBoundaryIdx);
    start = nextBoundaryIdx;

    const headerSepIdx = part.indexOf(Buffer.from('\r\n\r\n'));
    if (headerSepIdx === -1) continue;

    const headerText = part.subarray(0, headerSepIdx).toString('utf-8');
    let body = part.subarray(headerSepIdx + 4);
    if (body.length >= 2 && body[body.length - 2] === 13 && body[body.length - 1] === 10) {
      body = body.subarray(0, body.length - 2);
    }

    if (/filename=/i.test(headerText)) {
      return body;
    }
  }
  return null;
}

export async function POST(request: NextRequest) {
  let fileBuffer: Buffer | null = null;
  
  try {
    try {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      if (file) {
        const arrayBuffer = await file.arrayBuffer();
        fileBuffer = Buffer.from(arrayBuffer);
      }
    } catch (formErr) {
      const ct = request.headers.get('content-type') || '';
      const boundaryMatch = ct.match(/boundary=(?:["']?)([^"';\s]+)(?:["']?)/i);
      const rawArrayBuffer = await request.arrayBuffer();
      const rawBuffer = Buffer.from(rawArrayBuffer);

      if (boundaryMatch) {
        fileBuffer = parseMultipartBody(rawBuffer, boundaryMatch[1]);
      } else {
        fileBuffer = rawBuffer;
      }
    }

    if (!fileBuffer || fileBuffer.length === 0) {
      return NextResponse.json({ success: true, placeholders: [] });
    }

    // Direct JS extraction using PizZip
    const zip = new PizZip(fileBuffer);
    const placeholders = new Set<string>();
    const pattern = /\{\{([^}]+)\}\}/g;

    for (const fileName of Object.keys(zip.files)) {
      if (fileName.startsWith('word/') && fileName.endsWith('.xml')) {
        const content = zip.file(fileName)?.asText() || '';
        const plainText = content.replace(/<[^>]+>/g, '');
        let match;
        while ((match = pattern.exec(plainText)) !== null) {
          const ph = match[1].trim();
          if (ph) {
            placeholders.add(`{{${ph}}}`);
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      placeholders: Array.from(placeholders),
    });

  } catch (error: any) {
    console.error('Placeholder extraction error:', error);
    // Never fail the user's upload if placeholder extraction has an issue
    return NextResponse.json({ success: true, placeholders: [] });
  }
}
