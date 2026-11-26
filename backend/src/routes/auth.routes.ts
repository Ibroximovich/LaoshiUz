import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { Request, Response, Router } from 'express';
import { z } from 'zod';
import { Role } from '../generated/prisma/enums.js';
import { prisma } from '../lib/prisma.js';
import { authenticate, signToken } from '../middleware/auth.middleware.js';

const router = Router();

const userSelect = {
  id: true,
  telegramId: true,
  username: true,
  fullName: true,
  role: true,
  createdAt: true,
} as const;

const registerSchema = z.object({
  fullName: z.string().trim().min(1, 'fullName is required'),
  username: z.string().trim().min(3, 'username must be at least 3 characters'),
  password: z.string().min(6, 'password must be at least 6 characters'),
  role: z.nativeEnum(Role).optional(),
});

const loginSchema = z.object({
  username: z.string().trim().min(1, 'username is required'),
  password: z.string().min(1, 'password is required'),
});

const telegramSchema = z.object({
  initData: z.string().min(1, 'initData is required'),
});

interface TelegramUserPayload {
  id: number | string;
  username?: string;
  first_name?: string;
  last_name?: string;
}

function verifyTelegramInitData(initData: string, botToken: string): TelegramUserPayload | null {
  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash) {
    return null;
  }

  const pairs: string[] = [];
  params.forEach((value, key) => {
    if (key !== 'hash') {
      pairs.push(`${key}=${value}`);
    }
  });
  pairs.sort((a, b) => a.localeCompare(b));
  const dataCheckString = pairs.join('\n');

  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  const computedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

  const computedBuf = Buffer.from(computedHash, 'hex');
  const hashBuf = Buffer.from(hash, 'hex');
  if (computedBuf.length !== hashBuf.length || !crypto.timingSafeEqual(computedBuf, hashBuf)) {
    return null;
  }

  const userRaw = params.get('user');
  if (!userRaw) {
    return null;
  }

  try {
    const parsed = JSON.parse(userRaw) as TelegramUserPayload;
    if (parsed.id === undefined || parsed.id === null) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

router.post('/register', async (req: Request, res: Response, next) => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
      return;
    }

    const { fullName, username, password } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing) {
      res.status(409).json({ error: 'Username is already taken' });
      return;
    }

    const adminCount = await prisma.user.count({ where: { role: Role.ADMIN } });
    const assignedRole: Role = adminCount === 0 ? Role.ADMIN : Role.STUDENT;

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        fullName,
        username,
        passwordHash,
        role: assignedRole,
      },
      select: userSelect,
    });

    const token = signToken({ id: user.id, role: user.role });
    res.status(201).json({ token, user });
  } catch (err) {
    next(err);
  }
});

router.post('/login', async (req: Request, res: Response, next) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
      return;
    }

    const { username, password } = parsed.data;

    const user = await prisma.user.findUnique({ where: { username } });
    if (!user || !user.passwordHash) {
      res.status(401).json({ error: 'Invalid username or password' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({ error: 'Invalid username or password' });
      return;
    }

    const token = signToken({ id: user.id, role: user.role });
    res.json({
      token,
      user: {
        id: user.id,
        telegramId: user.telegramId,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.post('/telegram', async (req: Request, res: Response, next) => {
  try {
    const parsed = telegramSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
      return;
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      res.status(500).json({ error: 'TELEGRAM_BOT_TOKEN is not configured' });
      return;
    }

    const tgUser = verifyTelegramInitData(parsed.data.initData, botToken);
    if (!tgUser) {
      res.status(401).json({ error: 'Invalid Telegram initData' });
      return;
    }

    const telegramId = String(tgUser.id);
    let user = await prisma.user.findUnique({
      where: { telegramId },
      select: userSelect,
    });

    if (!user) {
      const fullName =
        [tgUser.first_name, tgUser.last_name].filter(Boolean).join(' ').trim() ||
        tgUser.username ||
        `User ${telegramId}`;

      let safeUsername: string | undefined;
      if (tgUser.username) {
        const usernameTaken = await prisma.user.findUnique({
          where: { username: tgUser.username },
          select: { id: true },
        });
        if (!usernameTaken) {
          safeUsername = tgUser.username;
        }
      }

      user = await prisma.user.create({
        data: {
          telegramId,
          username: safeUsername,
          fullName,
          role: Role.STUDENT,
        },
        select: userSelect,
      });
    }

    const token = signToken({ id: user.id, role: user.role });
    res.json({ token, user });
  } catch (err) {
    next(err);
  }
});

router.get('/me', authenticate, async (req: Request, res: Response, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: userSelect,
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({ user });
  } catch (err) {
    next(err);
  }
});

export default router;
