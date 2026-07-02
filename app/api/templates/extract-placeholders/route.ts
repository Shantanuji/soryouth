
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

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
    console.error('Error in /api/templates/extract-placeholders:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
