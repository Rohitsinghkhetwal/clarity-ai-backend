// import AWS from "aws-sdk"
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs'
import path from "path"


class StorageService {
  constructor() {
    this.S3Client = new S3Client({
      region: process.env.S3_REGION || 'auto',
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY,
        secretAccessKey: process.env.S3_SECRET_KEY
      }
    })
    this.bucket = process.env.S3_BUCKET_NAME;
  }

  async uploadFile(filepath, fileName) {
    try {
      const fileContent = fs.readFileSync(filepath);
      
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: `interviews/${fileName}`,
        Body: fileContent,
        ContentType: this.getContentType(fileName),
        ACL: 'public-read'
      });

      const result = await this.S3Client.send(command);
      
      // Construct the file URL
      const fileUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.S3_REGION}.amazonaws.com/interviews/${fileName}`;
      
      return fileUrl;
    } catch (err) {
      console.error("File upload error", err);
      throw err;
    }
  }

  async uploadAudio(buffer, fileName) {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: `interviews/audio/${fileName}`,
        Body: buffer,
        ContentType: "audio/webm",
        ACL: 'public-read'
      });

      const result = await this.S3Client.send(command);
      
      const fileUrl = `${process.env.S3_ENDPOINT}/${this.bucket}/interviews/audio/${fileName}`;
      
      return fileUrl;
    } catch (err) {
      console.log("Something went wrong while uploading the audio", err);
      throw err;
    }
  }


  async deleteFile(fileUrl) {
    try {
      const key = fileUrl.split('.com/')[1];
      
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key
      });

      await this.S3Client.send(command);
      
      console.log(`File deleted successfully: ${key}`);
    } catch (err) {
      console.log("File delete error", err);
      throw err;
    }
  }

 
  getContentType(fileName) {
    const ext = path.extname(fileName).toLowerCase();
    const types = {
      '.mp3': 'audio/mpeg',
      '.webm': 'audio/webm',
      '.wav': 'audio/wav',
      '.mp4': 'video/mp4'
    };
    return types[ext] || 'application/octet-stream';
  }
}


export default new StorageService();