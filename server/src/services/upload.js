import multer from 'multer';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { v2 as cloudinary } from 'cloudinary';
import { config, cloudinaryEnabled } from '../config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const uploadsDir = path.resolve(__dirname, '../../uploads');

if (cloudinaryEnabled) {
  cloudinary.config({
    cloud_name: config.cloudinary.cloudName,
    api_key: config.cloudinary.apiKey,
    api_secret: config.cloudinary.apiSecret,
  });
}

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 5 },
  fileFilter(req, file, cb) {
    if (!file.mimetype.startsWith('image/')) {
      return cb(Object.assign(new Error('Only image files are allowed.'), { status: 400 }));
    }
    cb(null, true);
  },
});

function uploadToCloudinary(buffer) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: 'handover', resource_type: 'image' },
      (err, result) => (err ? reject(err) : resolve(result.secure_url))
    );
    stream.end(buffer);
  });
}

async function saveLocally(file) {
  await fs.mkdir(uploadsDir, { recursive: true });
  const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
  const name = `${crypto.randomUUID()}${ext}`;
  await fs.writeFile(path.join(uploadsDir, name), file.buffer);
  return `/uploads/${name}`;
}

/** Returns an array of photo URLs. Uses Cloudinary when configured, local disk otherwise. */
export async function storePhotos(files = []) {
  return Promise.all(files.map((f) => (cloudinaryEnabled ? uploadToCloudinary(f.buffer) : saveLocally(f))));
}
