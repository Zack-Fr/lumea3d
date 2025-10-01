const { S3Client, CreateBucketCommand, HeadBucketCommand } = require('@aws-sdk/client-s3');

async function initMinIO() {
  const client = new S3Client({
    endpoint: 'http://localhost:9000',
    region: 'us-east-1',
    credentials: {
      accessKeyId: 'minioadmin',
      secretAccessKey: 'minioadmin123',
    },
    forcePathStyle: true,
  });

  const bucketName = 'lumea-assets';

  try {
    // Check if bucket already exists
    await client.send(new HeadBucketCommand({ Bucket: bucketName }));
    console.log(`Bucket '${bucketName}' already exists.`);
  } catch (error) {
    if (error.name === 'NoSuchBucket' || error.name === 'NotFound') {
      try {
        // Create bucket
        await client.send(new CreateBucketCommand({ Bucket: bucketName }));
        console.log(`Successfully created bucket '${bucketName}'.`);
      } catch (createError) {
        console.error(`Failed to create bucket '${bucketName}':`, createError);
        process.exit(1);
      }
    } else {
      console.error(`Error checking bucket '${bucketName}':`, error);
      process.exit(1);
    }
  }
}

initMinIO().catch(console.error);