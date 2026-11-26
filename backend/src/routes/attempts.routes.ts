import { Request, Response, Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

const submitAttemptSchema = z.object({
  questionId: z.string().min(1, 'questionId is required'),
  userAnswer: z.string(),
});

router.post('/submit', authenticate, async (req: Request, res: Response, next) => {
  try {
    const parsed = submitAttemptSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
      return;
    }

    const { questionId, userAnswer } = parsed.data;
    const userId = req.user!.id;

    const result = await prisma.$transaction(async (tx) => {
      const question = await tx.question.findUnique({
        where: { id: questionId },
        select: {
          id: true,
          correctAnswer: true,
          points: true,
          explanation: true,
        },
      });

      if (!question) {
        return null;
      }

      const isCorrect =
        userAnswer.trim().toLowerCase() === question.correctAnswer.trim().toLowerCase();
      const score = isCorrect ? question.points : 0;

      await tx.attempt.create({
        data: {
          userId,
          questionId,
          userAnswer,
          isCorrect,
          score,
        },
      });

      if (!isCorrect) {
        await tx.reviewQueue.upsert({
          where: {
            userId_questionId: {
              userId,
              questionId,
            },
          },
          create: {
            userId,
            questionId,
            wrongCount: 1,
          },
          update: {
            wrongCount: {
              increment: 1,
            },
          },
        });
      } else {
        await tx.reviewQueue.deleteMany({
          where: {
            userId,
            questionId,
          },
        });
      }

      return {
        isCorrect,
        correctAnswer: question.correctAnswer,
        explanation: question.explanation,
        score,
      };
    });

    if (!result) {
      res.status(404).json({ error: 'Question not found' });
      return;
    }

    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get('/review-queue', authenticate, async (req: Request, res: Response, next) => {
  try {
    const items = await prisma.reviewQueue.findMany({
      where: { userId: req.user!.id },
      orderBy: { wrongCount: 'desc' },
      include: {
        question: {
          select: {
            id: true,
            sectionId: true,
            type: true,
            prompt: true,
            options: true,
            explanation: true,
            points: true,
            order: true,
          },
        },
      },
    });

    res.json({ reviewQueue: items });
  } catch (err) {
    next(err);
  }
});

router.get('/my-stats', authenticate, async (req: Request, res: Response, next) => {
  try {
    const userId = req.user!.id;

    const [aggregate, correctAttempts, reviewQueueCount] = await Promise.all([
      prisma.attempt.aggregate({
        where: { userId },
        _sum: { score: true },
        _count: { _all: true },
      }),
      prisma.attempt.count({
        where: { userId, isCorrect: true },
      }),
      prisma.reviewQueue.count({
        where: { userId },
      }),
    ]);

    const totalAttempts = aggregate._count._all;
    const totalScore = aggregate._sum.score ?? 0;
    const accuracyPercent =
      totalAttempts > 0 ? Math.round((correctAttempts / totalAttempts) * 100) : 0;

    res.json({
      totalScore,
      totalAttempts,
      correctAttempts,
      accuracyPercent,
      reviewQueueCount,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
