import crypto from 'node:crypto';
import { Request, Response, Router } from 'express';
import { z } from 'zod';
import { Role } from '../generated/prisma/enums.js';
import { prisma } from '../lib/prisma.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = Router();
const teacherOrAdmin = [Role.TEACHER, Role.ADMIN];

function getParam(req: Request, key: string): string {
  const val = req.params[key];
  return Array.isArray(val) ? val[0] ?? '' : val ?? '';
}

function generateInviteCode(length = 6): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.randomBytes(length);
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars[bytes[i]! % chars.length];
  }
  return code;
}

async function createUniqueInviteCode(): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = generateInviteCode(6);
    const existing = await prisma.group.findUnique({
      where: { inviteCode: code },
      select: { id: true },
    });
    if (!existing) {
      return code;
    }
  }
  throw new Error('Failed to generate unique invite code');
}

const createGroupSchema = z.object({
  name: z.string().trim().min(1, 'Group name is required'),
});

const assignLessonSchema = z.object({
  lessonId: z.string().min(1, 'lessonId is required'),
  dueDate: z.coerce.date().optional().nullable(),
});

const joinGroupSchema = z.object({
  inviteCode: z.string().trim().min(1, 'inviteCode is required'),
});

// ==================== STUDENT ENDPOINTS (placed before /:groupId) ====================

router.post('/join', authenticate, async (req: Request, res: Response, next) => {
  try {
    const parsed = joinGroupSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
      return;
    }

    const inviteCode = parsed.data.inviteCode.toUpperCase();
    const group = await prisma.group.findUnique({
      where: { inviteCode },
      select: { id: true, name: true, inviteCode: true },
    });

    if (!group) {
      res.status(404).json({ error: 'Group not found with this invite code' });
      return;
    }

    const membership = await prisma.groupMember.upsert({
      where: {
        userId_groupId: {
          userId: req.user!.id,
          groupId: group.id,
        },
      },
      create: {
        userId: req.user!.id,
        groupId: group.id,
      },
      update: {},
    });

    res.json({ membership, group });
  } catch (err) {
    next(err);
  }
});

router.get('/my', authenticate, async (req: Request, res: Response, next) => {
  try {
    const memberships = await prisma.groupMember.findMany({
      where: { userId: req.user!.id },
      orderBy: { joinedAt: 'desc' },
      include: {
        group: {
          include: {
            assignments: {
              orderBy: { createdAt: 'desc' },
              include: {
                lesson: {
                  select: {
                    id: true,
                    courseId: true,
                    number: true,
                    title: true,
                    isPublished: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    const groups = memberships.map((m) => ({
      id: m.group.id,
      name: m.group.name,
      inviteCode: m.group.inviteCode,
      joinedAt: m.joinedAt,
      assignments: m.group.assignments.map((a) => ({
        id: a.id,
        lessonId: a.lessonId,
        dueDate: a.dueDate,
        createdAt: a.createdAt,
        lesson: a.lesson,
      })),
    }));

    res.json({ groups });
  } catch (err) {
    next(err);
  }
});

// ==================== TEACHER / ADMIN ENDPOINTS ====================

router.post('/', authenticate, authorize(teacherOrAdmin), async (req: Request, res: Response, next) => {
  try {
    const parsed = createGroupSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
      return;
    }

    const inviteCode = await createUniqueInviteCode();
    const group = await prisma.group.create({
      data: {
        name: parsed.data.name,
        inviteCode,
        teacherId: req.user!.id,
      },
    });

    res.status(201).json({ group });
  } catch (err) {
    next(err);
  }
});

router.get('/', authenticate, authorize(teacherOrAdmin), async (req: Request, res: Response, next) => {
  try {
    const isAdmin = req.user!.role === Role.ADMIN;
    const groups = await prisma.group.findMany({
      where: isAdmin ? undefined : { teacherId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { members: true },
        },
      },
    });

    res.json({ groups });
  } catch (err) {
    next(err);
  }
});

router.get('/:groupId', authenticate, authorize(teacherOrAdmin), async (req: Request, res: Response, next) => {
  try {
    const groupId = getParam(req, 'groupId');
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        members: {
          orderBy: { joinedAt: 'asc' },
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                username: true,
              },
            },
          },
        },
        assignments: {
          orderBy: { createdAt: 'desc' },
          include: {
            lesson: {
              select: {
                id: true,
                courseId: true,
                number: true,
                title: true,
                isPublished: true,
              },
            },
          },
        },
      },
    });

    if (!group) {
      res.status(404).json({ error: 'Group not found' });
      return;
    }

    if (req.user!.role === Role.TEACHER && group.teacherId !== req.user!.id) {
      res.status(403).json({ error: 'Forbidden: you do not own this group' });
      return;
    }

    res.json({
      group: {
        id: group.id,
        name: group.name,
        inviteCode: group.inviteCode,
        teacherId: group.teacherId,
        createdAt: group.createdAt,
        members: group.members.map((m) => ({
          id: m.id,
          userId: m.user.id,
          fullName: m.user.fullName,
          username: m.user.username,
          joinedAt: m.joinedAt,
        })),
        assignments: group.assignments,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.post(
  '/:groupId/assign',
  authenticate,
  authorize(teacherOrAdmin),
  async (req: Request, res: Response, next) => {
    try {
      const groupId = getParam(req, 'groupId');
      const parsed = assignLessonSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
        return;
      }

      const group = await prisma.group.findUnique({ where: { id: groupId } });
      if (!group) {
        res.status(404).json({ error: 'Group not found' });
        return;
      }

      if (req.user!.role === Role.TEACHER && group.teacherId !== req.user!.id) {
        res.status(403).json({ error: 'Forbidden: you do not own this group' });
        return;
      }

      const lesson = await prisma.lesson.findUnique({ where: { id: parsed.data.lessonId } });
      if (!lesson) {
        res.status(404).json({ error: 'Lesson not found' });
        return;
      }

      const dueDate = parsed.data.dueDate ?? null;
      const assignment = await prisma.groupAssignment.upsert({
        where: {
          groupId_lessonId: {
            groupId,
            lessonId: parsed.data.lessonId,
          },
        },
        create: {
          groupId,
          lessonId: parsed.data.lessonId,
          dueDate,
        },
        update: {
          dueDate,
        },
      });

      res.json({ assignment });
    } catch (err) {
      next(err);
    }
  }
);

router.get(
  '/:groupId/report',
  authenticate,
  authorize(teacherOrAdmin),
  async (req: Request, res: Response, next) => {
    try {
      const groupId = getParam(req, 'groupId');
      const group = await prisma.group.findUnique({
        where: { id: groupId },
        include: {
          members: {
            orderBy: { joinedAt: 'asc' },
            include: {
              user: {
                select: {
                  id: true,
                  fullName: true,
                  username: true,
                },
              },
            },
          },
        },
      });

      if (!group) {
        res.status(404).json({ error: 'Group not found' });
        return;
      }

      if (req.user!.role === Role.TEACHER && group.teacherId !== req.user!.id) {
        res.status(403).json({ error: 'Forbidden: you do not own this group' });
        return;
      }

      const userIds = group.members.map((m) => m.user.id);
      const attempts =
        userIds.length > 0
          ? await prisma.attempt.findMany({
              where: { userId: { in: userIds } },
              select: {
                userId: true,
                isCorrect: true,
                score: true,
              },
            })
          : [];

      const statsByUser = new Map<
        string,
        { totalAttempts: number; correctAttempts: number; totalScore: number }
      >();

      for (const att of attempts) {
        const entry = statsByUser.get(att.userId) ?? {
          totalAttempts: 0,
          correctAttempts: 0,
          totalScore: 0,
        };
        entry.totalAttempts += 1;
        if (att.isCorrect) {
          entry.correctAttempts += 1;
        }
        entry.totalScore += att.score;
        statsByUser.set(att.userId, entry);
      }

      const report = group.members.map((m) => {
        const stats = statsByUser.get(m.user.id) ?? {
          totalAttempts: 0,
          correctAttempts: 0,
          totalScore: 0,
        };
        const accuracyPercent =
          stats.totalAttempts > 0
            ? Math.round((stats.correctAttempts / stats.totalAttempts) * 100)
            : 0;

        return {
          userId: m.user.id,
          fullName: m.user.fullName,
          username: m.user.username,
          joinedAt: m.joinedAt,
          totalAttempts: stats.totalAttempts,
          correctAttempts: stats.correctAttempts,
          totalScore: stats.totalScore,
          accuracyPercent,
        };
      });

      res.json({
        group: {
          id: group.id,
          name: group.name,
        },
        report,
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
