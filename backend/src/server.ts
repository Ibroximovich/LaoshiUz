import path from 'node:path';
import cors from 'cors';
import dotenv from 'dotenv';
import express, { NextFunction, Request, Response } from 'express';
import { webhookCallback } from 'grammy';
import multer from 'multer';
import { bot } from './bot.js';
import { Prisma } from './generated/prisma/client.js';
import attemptsRoutes from './routes/attempts.routes.js';
import authRoutes from './routes/auth.routes.js';
import coursesRoutes from './routes/courses.routes.js';
import { certificatesRouter, examsRouter } from './routes/exams.routes.js';
import groupsRoutes from './routes/groups.routes.js';
import importRoutes from './routes/import.routes.js';
import uploadRoutes from './routes/upload.routes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;
const renderExternalUrl = process.env.RENDER_EXTERNAL_URL?.trim();

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'hsk-academy-backend' });
});

app.use('/api/auth', authRoutes);
app.use('/api', coursesRoutes);
app.use('/api/import', importRoutes);
app.use('/api/groups', groupsRoutes);
app.use('/api/attempts', attemptsRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/exams', examsRouter);
app.use('/api/certificates', certificatesRouter);

if (bot && renderExternalUrl) {
  app.post('/api/telegram/webhook', webhookCallback(bot, 'express'));
} else {
  app.post('/api/telegram/webhook', (_req: Request, res: Response) => {
    res.status(503).json({ error: 'Telegram webhook is not active' });
  });
}

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof multer.MulterError) {
    res.status(400).json({ error: `File upload error: ${err.message}` });
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2025') {
      res.status(404).json({ error: 'Record not found' });
      return;
    }
    if (err.code === 'P2002') {
      res.status(409).json({ error: 'Unique constraint violation' });
      return;
    }
    if (err.code === 'P2003') {
      res.status(400).json({ error: 'Related record not found (foreign key constraint)' });
      return;
    }
  }

  if (err instanceof Error) {
    if (
      err.message === 'Only .xlsx and .csv files are allowed' ||
      err.message === 'Only .mp3, .wav, .ogg, and .m4a audio files are allowed'
    ) {
      res.status(400).json({ error: err.message });
      return;
    }
    console.error('Unhandled error:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
    return;
  }

  console.error('Unknown error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);

  if (bot) {
    if (renderExternalUrl) {
      const webhookUrl = `${renderExternalUrl.replace(/\/+$/, '')}/api/telegram/webhook`;
      bot.api
        .setWebhook(webhookUrl)
        .then(() => {
          console.log(`Telegram webhook set to ${webhookUrl}`);
        })
        .catch((err) => {
          console.error('Failed to set Telegram webhook:', err);
        });
    } else {
      bot.start().catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err);
        if (
          message.includes('409') ||
          (typeof err === 'object' &&
            err !== null &&
            'error_code' in err &&
            (err as { error_code?: number }).error_code === 409)
        ) {
          console.warn('Telegram bot polling conflict (409): another instance is already running.');
          return;
        }
        console.error('Telegram bot polling error:', err);
      });
    }
  }
});
