const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

async function download() {
  const client = new S3Client({
    region: process.env.AWS_REGION || "ap-south-1",
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });

  const bucket = process.env.AWS_S3_BUCKET_NAME;
  const key = "uploads/templates/1782383774583-apex.docx";

  console.log(`Downloading s3://${bucket}/${key}...`);
  const response = await client.send(
    new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    })
  );

  const writeStream = fs.createWriteStream("scratch/template_current.docx");
  response.Body.pipe(writeStream);

  writeStream.on("finish", () => {
    console.log("Downloaded successfully to scratch/template_current.docx");
  });
}

download().catch(console.error);
