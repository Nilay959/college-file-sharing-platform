const multer = require('multer');
const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

// R2 Config
// Assumes environment variables: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME
const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
});

const getBucketName = () => process.env.R2_BUCKET_NAME || 'college-files';

// Memory storage for multer (buffer the file in memory before uploading to R2)
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Helper function to upload to R2
const uploadToR2 = async (buffer, filename, mimetype) => {
  const command = new PutObjectCommand({
    Bucket: getBucketName(),
    Key: filename,
    Body: buffer,
    ContentType: mimetype
  });
  await s3Client.send(command);
  return filename; // The R2 path
};

// Helper function to get a presigned download URL
const getPresignedUrl = async (filename) => {
  const command = new GetObjectCommand({
    Bucket: getBucketName(),
    Key: filename
  });
  // URL valid for 1 hour
  return await getSignedUrl(s3Client, command, { expiresIn: 3600 });
};

// Helper function to delete from R2
const deleteFromR2 = async (filename) => {
  const command = new DeleteObjectCommand({
    Bucket: getBucketName(),
    Key: filename
  });
  await s3Client.send(command);
};

module.exports = { upload, s3Client, uploadToR2, getPresignedUrl, deleteFromR2 };
