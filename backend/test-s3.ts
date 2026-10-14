import 'dotenv/config';
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';

async function probarS3() {
  const region = process.env.AWS_REGION;
  const bucket = process.env.AWS_S3_BUCKET;

  if (!region || !bucket) {
    throw new Error('Faltan AWS_REGION o AWS_S3_BUCKET en .env');
  }

  const s3 = new S3Client({ region });

  try {
    const resultado = await s3.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        MaxKeys: 5,
      }),
    );

    console.log('Conexión con Amazon S3: CORRECTA');
    console.log('Bucket:', bucket);
    console.log('Objetos encontrados:', resultado.KeyCount ?? 0);
  } catch (error) {
    console.error('No se pudo conectar con S3.');
    console.error(error);
    process.exitCode = 1;
  } finally {
    s3.destroy();
  }
}

probarS3();