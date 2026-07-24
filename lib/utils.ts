import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export async function openS3File(s3Url: string | null | undefined): Promise<boolean> {
  if (!s3Url) return false;
  try {
    let s3Key = s3Url;
    if (s3Url.startsWith('http://') || s3Url.startsWith('https://')) {
      s3Key = new URL(s3Url).pathname.substring(1);
    }
    const response = await fetch(`/api/s3/presigned-url?key=${encodeURIComponent(s3Key)}`);
    if (response.ok) {
      const data = await response.json();
      if (data.url) {
        window.open(data.url, '_blank');
        return true;
      }
    }
    window.open(s3Url, '_blank');
    return true;
  } catch (err) {
    console.error('Error fetching presigned S3 URL:', err);
    window.open(s3Url, '_blank');
    return true;
  }
}
