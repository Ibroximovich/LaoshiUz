import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { Request, Response, Router } from 'express';
import multer from 'multer';
import { Role } from '../generated/prisma/enums.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = Router();
const teacherOrAdmin = [Role.TEACHER, Role.ADMIN];

const audioUploadDir = path.resolve(process.cwd(), 'uploads', 'audio');
fs.mkdirSync(audioUploadDir, { recursive: true });

const allowedExtensions = new Set(['.mp3', '.wav', '.ogg', '.m4a']);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    fs.mkdirSync(audioUploadDir, { recursive: true });
    cb(null, audioUploadDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;
    cb(null, uniqueName);
  },
});

const uploadAudio = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedExtensions.has(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only .mp3, .wav, .ogg, and .m4a audio files are allowed'));
    }
  },
});

router.post(
  '/audio',
  authenticate,
  authorize(teacherOrAdmin),
  uploadAudio.single('file'),
  (req: Request, res: Response) => {
    if (!req.file) {
      res.status(400).json({ error: 'Audio file is required (field name: file)' });
      return;
    }

    res.status(201).json({
      audioUrl: `/uploads/audio/${req.file.filename}`,
    });
  }
);

export default router;
