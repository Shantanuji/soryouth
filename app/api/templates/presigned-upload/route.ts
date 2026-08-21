import { NextResponse, type NextRequest } from 'next/server';
import { getPresignedUploadUrl } from '@/lib/s3';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { filename, contentType, folder } = await request.json();

    const safeFolder = folder || 'templates';
    const rawName = filename || 'template.docx';
    const safeFilename = rawName.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    const uniqueKey = `uploads/${safeFolder}/${Date.now()}-${safeFilename}`;
    const fileType = contentType || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

    const presigned = await getPresignedUploadUrl(uniqueKey, fileType);

    if (presigned) {
      return NextResponse.json({
        success: true,
        isDirectS3: true,
        uploadUrl: presigned.uploadUrl,
        finalUrl: presigned.finalUrl,
      });
    }

    // Fallback: indicate client should use local / server upload route
    return NextResponse.json({
      success: true,
      isDirectS3: false,
      uploadUrl: `/api/templates/upload?name=${encodeURIComponent(safeFilename)}&folder=${encodeURIComponent(safeFolder)}`,
    });

  } catch (error: any) {
    console.error('Error generating presigned upload URL:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to prepare upload.' },
      { status: 500 }
    );
  }
}
