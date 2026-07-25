import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';

/*
 * Direct-to-R2 uploads (onboarding B1). The API never touches the bytes: it mints
 * a short-lived presigned PUT, the client uploads straight to Cloudflare R2, and
 * returns the object key (stored on the shop/rider record). Proof is PRIVATE —
 * viewing is a presigned GET, allowed only to the object's owner or an ADMIN.
 *
 * Ships INERT: with no R2_* env the module still loads; the endpoints 503 until
 * configured (same posture as Sentry).
 */
const ALLOWED_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
};

const EXPIRY_S = 300; // presigned URLs live 5 minutes

@Injectable()
export class UploadsService {
  private client: S3Client | null = null;

  configured(): boolean {
    return Boolean(
      process.env.R2_ENDPOINT &&
        process.env.R2_ACCESS_KEY_ID &&
        process.env.R2_SECRET_ACCESS_KEY &&
        process.env.R2_BUCKET,
    );
  }

  private s3(): { client: S3Client; bucket: string } {
    const endpoint = process.env.R2_ENDPOINT;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    const bucket = process.env.R2_BUCKET;
    if (!endpoint || !accessKeyId || !secretAccessKey || !bucket) {
      throw new ServiceUnavailableException('File uploads are not configured');
    }
    if (!this.client) {
      // R2 is S3-compatible; region is a required-but-ignored "auto".
      this.client = new S3Client({
        region: 'auto',
        endpoint,
        credentials: { accessKeyId, secretAccessKey },
      });
    }
    return { client: this.client, bucket };
  }

  // Presigned PUT for a caller-owned object. The key is namespaced by user id, so
  // a caller can only ever write under their own prefix.
  async presignUpload(
    userId: string,
    contentType: string,
  ): Promise<{ key: string; putUrl: string }> {
    const ext = ALLOWED_TYPES[contentType];
    if (!ext) {
      throw new BadRequestException('Unsupported file type (jpg, png, webp, pdf only)');
    }
    const { client, bucket } = this.s3();
    const key = `uploads/${userId}/${randomUUID()}.${ext}`;
    const putUrl = await getSignedUrl(
      client,
      new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType }),
      { expiresIn: EXPIRY_S },
    );
    return { key, putUrl };
  }

  // Presigned GET — caller must own the key (prefix match) or be ADMIN (proof review).
  async presignView(
    key: string,
    caller: { id: string; roles: string[] },
  ): Promise<{ url: string }> {
    const owns = key.startsWith(`uploads/${caller.id}/`);
    const isAdmin = caller.roles.includes('ADMIN');
    if (!owns && !isAdmin) {
      throw new ForbiddenException('Not allowed to view this file');
    }
    const { client, bucket } = this.s3();
    const url = await getSignedUrl(
      client,
      new GetObjectCommand({ Bucket: bucket, Key: key }),
      { expiresIn: EXPIRY_S },
    );
    return { url };
  }
}
