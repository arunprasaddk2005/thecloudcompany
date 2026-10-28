import 'dotenv/config';

export const config = {
  port: Number(process.env.PORT) || 5000,
  mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/handover',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me',
  emailDomain: (process.env.ALLOWED_EMAIL_DOMAIN || 'kongu.edu').toLowerCase(),
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
  },
  geminiKey: process.env.GEMINI_API_KEY,
};

export const cloudinaryEnabled = Boolean(
  config.cloudinary.cloudName && config.cloudinary.apiKey && config.cloudinary.apiSecret
);
