import crypto from "crypto";
import S3Storage from "./s3client";

export default class S3ClientFactory {
  public readonly s3Settings;
  public readonly s3Bucket: string;

  constructor(
    encyptedString: string,
    privKey: string,
    pemPassword: string,
    defaultBucket?: string
  ) {
    const buffer = Buffer.from(encyptedString, "base64");
    const decrypted = crypto.privateDecrypt(
      {
        key: privKey,
        passphrase: pemPassword,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: "sha256",
      },
      buffer
    );

    this.s3Settings = JSON.parse(decrypted.toString("utf8"));
    this.s3Bucket = defaultBucket;
  }

  createS3Client(bucket: string) {
    return new S3Storage(bucket, this.s3Settings);
  }
}
