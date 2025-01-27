import S3ClientFactory from "../lib/s3clientFactory";

export default function s3listFilesHandler(
  s3ClientFactory: S3ClientFactory,
  bucket?: string
) {
  const s3client = s3ClientFactory.createS3Client(
    bucket ?? s3ClientFactory.s3Bucket
  );

  return s3client.listFiles();
}
