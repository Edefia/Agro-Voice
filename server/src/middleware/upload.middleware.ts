import { Request } from 'express';
import multer, { FileFilterCallback } from 'multer';
import { AppError } from '../utils/AppError';

// Map of accepted MIME types to a canonical, safe file extension. We never
// trust the original extension - the stored extension is derived here.
const AUDIO_MIME_EXTENSIONS: Record<string, string> = {
  'audio/wav': '.wav',
  'audio/x-wav': '.wav',
  'audio/wave': '.wav',
  'audio/mpeg': '.mp3',
  'audio/mp3': '.mp3',
  'audio/mp4': '.m4a',
  'audio/x-m4a': '.m4a',
  'audio/aac': '.aac',
  'audio/ogg': '.ogg',
  'audio/webm': '.webm',
  'audio/3gpp': '.3gp',
};

const IMAGE_MIME_EXTENSIONS: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/heic': '.heic',
  'image/heif': '.heif',
};

const MAX_AUDIO_BYTES = 25 * 1024 * 1024; // 25 MB
const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB

function mimeFilter(extMap: Record<string, string>) {
  return (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
    if (extMap[file.mimetype]) {
      cb(null, true);
    } else {
      cb(
        new AppError(
          `Unsupported file type: ${file.mimetype}`,
          422,
          'INVALID_FILE_TYPE'
        )
      );
    }
  };
}

// Files are held in memory so they can be streamed to Cloudinary (or written
// to local disk as a fallback) by the storage service.
export const audioUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_AUDIO_BYTES },
  fileFilter: mimeFilter(AUDIO_MIME_EXTENSIONS),
});

export const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_BYTES },
  fileFilter: mimeFilter(IMAGE_MIME_EXTENSIONS),
});

export function audioExtension(mimetype: string): string {
  return AUDIO_MIME_EXTENSIONS[mimetype] ?? '.bin';
}

export function imageExtension(mimetype: string): string {
  return IMAGE_MIME_EXTENSIONS[mimetype] ?? '.bin';
}
