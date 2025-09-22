const { S3Client, ListBucketsCommand, ListObjectsV2Command } = require('@aws-sdk/client-s3');

async function checkMinioStatus() {
  const client = new S3Client({
    endpoint: 'http://localhost:9000',
    region: 'us-east-1',
    credentials: {
      accessKeyId: 'minioadmin',
      secretAccessKey: 'minioadmin123',
    },
    forcePathStyle: true,
  });

  console.log('Checking MinIO status...\n');

  try {
    // List buckets
    const bucketsResponse = await client.send(new ListBucketsCommand({}));
    console.log('Available buckets:');
    bucketsResponse.Buckets.forEach(bucket => {
      console.log(`- ${bucket.Name} (Created: ${bucket.CreationDate})`);
    });
    console.log();

    // Check lumea-assets bucket content
    const bucketName = 'lumea-assets';
    try {
      const objectsResponse = await client.send(new ListObjectsV2Command({
        Bucket: bucketName,
      }));

      console.log(`Contents of '${bucketName}' bucket:`);
      if (!objectsResponse.Contents || objectsResponse.Contents.length === 0) {
        console.log('Bucket is empty');
      } else {
        objectsResponse.Contents.forEach(object => {
          console.log(`- ${object.Key} (Size: ${object.Size} bytes, Last modified: ${object.LastModified})`);
        });
      }
    } catch (error) {
      console.error(`Error listing bucket contents:`, error);
    }

  } catch (error) {
    console.error('Error checking MinIO status:', error);
    process.exit(1);
  }
}

checkMinioStatus().catch(console.error);