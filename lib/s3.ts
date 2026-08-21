
import 'server-only';
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';

const bucketName = process.env.AWS_S3_BUCKET_NAME;
const region = process.env.AWS_REGION;
const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

function getS3Client() {
  if (!bucketName || !region || !accessKeyId || !secretAccessKey) {
    return null;
  }
  return new S3Client({
    region,
    credentials: { accessKeyId, secretAccessKey },
    maxAttempts: 2,
  });
}

function cleanKey(rawKey: string): string {
  // If a full URL was passed, extract the pathname part
  if (rawKey.startsWith('http://') || rawKey.startsWith('https://')) {
    try {
      const url = new URL(rawKey);
      return url.pathname.replace(/^\/+/, '');
    } catch {
      // fallback
    }
  }
  return rawKey.replace(/^\/+/, '');
}

export async function uploadFileToS3(buffer: Buffer, rawKey: string, contentType: string): Promise<string> {
  const key = cleanKey(rawKey);
  const s3Client = getS3Client();

  if (s3Client && bucketName) {
    try {
      const params = {
        Bucket: bucketName,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      };
      const command = new PutObjectCommand(params);
      await s3Client.send(command);
      return `https://${bucketName}.s3.${region}.amazonaws.com/${key}`;
    } catch (s3Error: any) {
      console.warn(`[S3 Upload Warning] S3 upload failed for ${key}: ${s3Error?.message || s3Error}. Falling back to local storage.`);
    }
  }

  // Local filesystem fallback
  const localFilePath = path.join(process.cwd(), 'public', key);
  const localDir = path.dirname(localFilePath);
  await fs.mkdir(localDir, { recursive: true });
  await fs.writeFile(localFilePath, buffer);

  const baseUrl = process.env.NEXTAUTH_URL || `http://localhost:${process.env.PORT || 9002}`;
  const fileUrl = `${baseUrl}/${key}`;
  console.log(`[Local Upload] Saved locally to: ${localFilePath} -> ${fileUrl}`);
  return fileUrl;
}

export async function deleteFileFromS3(rawKey: string): Promise<{ success: boolean }> {
  const key = cleanKey(rawKey);
  
  // Try deleting local file if it exists
  try {
    const localFilePath = path.join(process.cwd(), 'public', key);
    if (existsSync(localFilePath)) {
      await fs.unlink(localFilePath);
    }
  } catch (e) {
    console.warn(`[Local Delete] Failed to delete local file ${key}:`, e);
  }

  const s3Client = getS3Client();
  if (s3Client && bucketName) {
    try {
      const params = { Bucket: bucketName, Key: key };
      const command = new DeleteObjectCommand(params);
      await s3Client.send(command);
    } catch (e) {
      console.warn(`[S3 Delete Warning] Failed to delete from S3:`, e);
    }
  }

  return { success: true };
}

export async function getFileFromS3(rawKey: string): Promise<Buffer> {
  const key = cleanKey(rawKey);

  // 1. Check local storage first
  const localFilePath = path.join(process.cwd(), 'public', key);
  if (existsSync(localFilePath)) {
    return await fs.readFile(localFilePath);
  }

  // 2. Try S3
  const s3Client = getS3Client();
  if (s3Client && bucketName) {
    try {
      const params = { Bucket: bucketName, Key: key };
      const command = new GetObjectCommand(params);
      const response = await s3Client.send(command);
      if (!response.Body) {
        throw new Error(`Failed to get file from S3: ${key}. Body is empty.`);
      }
      const byteArray = await response.Body.transformToByteArray();
      return Buffer.from(byteArray);
    } catch (s3Error: any) {
      throw new Error(`Failed to fetch file from S3 (${key}): ${s3Error.message}`);
    }
  }

  throw new Error(`File not found in local storage or S3: ${key}`);
}

export async function getPresignedUrl(rawKey: string): Promise<string> {
  const key = cleanKey(rawKey);
  const s3Client = getS3Client();
  if (s3Client && bucketName) {
    try {
      const params = { Bucket: bucketName, Key: key };
      const command = new GetObjectCommand(params);
      return await getSignedUrl(s3Client, command, { expiresIn: 300 });
    } catch (e) {
      console.warn('Presigned URL generation failed, falling back to public URL:', e);
    }
  }
  const baseUrl = process.env.NEXTAUTH_URL || `http://localhost:${process.env.PORT || 9002}`;
  return `${baseUrl}/${key}`;
}

export async function getPresignedUploadUrl(rawKey: string, contentType: string): Promise<{ uploadUrl: string; finalUrl: string } | null> {
  const key = cleanKey(rawKey);
  const s3Client = getS3Client();
  if (s3Client && bucketName) {
    try {
      const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        ContentType: contentType,
      });
      const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
      const finalUrl = `https://${bucketName}.s3.${region}.amazonaws.com/${key}`;
      return { uploadUrl, finalUrl };
    } catch (e) {
      console.warn('Presigned upload URL generation failed:', e);
    }
  }
  return null;
}

