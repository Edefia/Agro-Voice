import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import axios from 'axios';
import { UploadApiResponse } from 'cloudinary';
import { cloudinary, isCloudinaryConfigured } from '../../config/cloudinary';
import { env } from '../../config/environment';
import { AppError } from '../../utils/AppError';

export type MediaKind = 'audio' | 'image' | 'generated-audio';

export interface StoredMedia {
  // Either a Cloudinary https URL or a local relative path (uploads/...).
  url: string;
  publicId: string | null;
  provider: 'cloudinary' | 'local';
}

// Cloudinary stores audio under the "video" resource type.
function resourceTypeFor(kind: MediaKind): 'image' | 'video' {
  return kind === 'image' ? 'image' : 'video';
}

function folderFor(kind: MediaKind): string {
  return `${env.CLOUDINARY_FOLDER}/${kind}`;
}

const UPLOADS_ROOT = path.join(process.cwd(), 'uploads');

function uploadToCloudinary(
  buffer: Buffer,
  kind: MediaKind
): Promise<UploadApiResponse> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: folderFor(kind),
        resource_type: resourceTypeFor(kind),
      },
      (error, result) => {
        if (error || !result) {
          reject(error ?? new Error('Cloudinary upload failed'));
          return;
        }
        resolve(result);
      }
    );
    stream.end(buffer);
  });
}

async function saveLocally(
  buffer: Buffer,
  kind: MediaKind,
  extension: string
): Promise<StoredMedia> {
  const dir = path.join(UPLOADS_ROOT, kind);
  await fs.promises.mkdir(dir, { recursive: true });
  const filename = `${Date.now()}-${crypto.randomBytes(12).toString('hex')}${extension}`;
  await fs.promises.writeFile(path.join(dir, filename), buffer);
  return {
    url: path.posix.join('uploads', kind, filename),
    publicId: null,
    provider: 'local',
  };
}

// Persists a media buffer and returns a reference (URL or local path).
export async function uploadMedia(
  buffer: Buffer,
  kind: MediaKind,
  extension = ''
): Promise<StoredMedia> {
  if (isCloudinaryConfigured) {
    try {
      const result = await uploadToCloudinary(buffer, kind);
      return { url: result.secure_url, publicId: result.public_id, provider: 'cloudinary' };
    } catch (error) {
      const detail =
        (error as { message?: string })?.message ?? 'unknown error';
      throw new AppError(
        `Media upload to Cloudinary failed: ${detail}`,
        502,
        'MEDIA_UPLOAD_FAILED'
      );
    }
  }
  return saveLocally(buffer, kind, extension);
}

export function isRemote(ref: string): boolean {
  return /^https?:\/\//i.test(ref);
}

// Retrieves the bytes for a stored reference, whether remote or local.
export async function fetchMedia(ref: string): Promise<Buffer> {
  if (isRemote(ref)) {
    try {
      const response = await axios.get<ArrayBuffer>(ref, {
        responseType: 'arraybuffer',
        timeout: env.SNWOLLEY_TIMEOUT,
      });
      return Buffer.from(response.data);
    } catch {
      throw new AppError('Stored media could not be retrieved', 502, 'MEDIA_FETCH_FAILED');
    }
  }

  const absolute = path.join(process.cwd(), ref);
  if (!fs.existsSync(absolute)) {
    throw new AppError('Stored media not found', 404, 'MEDIA_NOT_FOUND');
  }
  return fs.promises.readFile(absolute);
}
