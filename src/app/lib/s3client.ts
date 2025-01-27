import {
  DeleteObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  ListObjectsV2CommandOutput,
  S3Client,
  S3ClientConfig,
} from "@aws-sdk/client-s3";

export interface FileInfo {
  Key: string;
  Size: number;
  LastModified: Date;
  Metadata: Record<string, string>;
}

export default class S3Storage {
  private s3client: S3Client;
  private bucket: string;
  private metadataCache = new Map<string, Record<string, string>>();

  constructor(bucket: string, config: Partial<S3ClientConfig>) {
    this.bucket = bucket;
    this.s3client = new S3Client({
      region: "eu-west-2",
      credentials: {
        accessKeyId: "",
        secretAccessKey: "",
      },
      ...config,
    });
  }

  async headObject(key: string) {
    if (this.metadataCache.has(key)) {
      return this.metadataCache.get(key);
    }

    const command = new HeadObjectCommand({ Bucket: this.bucket, Key: key });
    const data = await this.s3client.send(command);
    if (data.Metadata) {
      this.metadataCache.set(key, data.Metadata);
    }

    return data.Metadata;
  }

  async deleteObject(key: string) {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    return this.s3client.send(command);
  }

  async listFiles() {
    const fileList: FileInfo[] = [];
    let continuationToken: string | undefined;

    do {
      const command = new ListObjectsV2Command({
        Bucket: this.bucket,
        ContinuationToken: continuationToken,
      });

      const data: ListObjectsV2CommandOutput = await this.s3client.send(
        command
      );
      if (!data.Contents) {
        return false;
      }

      const metadataPromises = data.Contents.filter(
        (obj) => obj.Key.includes(".request") === false
      )
        .map(async (obj) => {
          if (obj.Key) {
            const metadata = await this.headObject(obj.Key);

            return {
              Key: obj.Key,
              LastModified: obj.LastModified,
              Size: obj.Size,
              Metadata: metadata,
            } as FileInfo;
          }
        })
        .filter(Boolean);

      const results = await Promise.all(metadataPromises);
      results.forEach((item) => {
        if (item) {
          fileList.push(item);
        }
      });

      continuationToken = data.ContinuationToken;
    } while (continuationToken);

    return fileList;
  }
}
