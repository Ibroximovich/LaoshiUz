import crypto from 'node:crypto';
import { Request, Response, Router } from 'express';
import { z } from 'zod';
import { Role } from '../generated/prisma/enums.js';
import { prisma } from '../lib/prisma.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

export const examsRouter = Router();
export const certificatesRouter = Router();

const teacherOrAdmin = [Role.TEACHER, Role.ADMIN];

function getParam(req: Request, key: string): string {
  const val = req.params[key];
  return Array.isArray(val) ? val[0] ?? '' : val ?? '';
}

function generateCertificateCode(): string {
  const year = new Date().getFullYear();
  const suffix = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `LAOSHI-${year}-${suffix}`;
}

async function createUniqueCertificateCode(): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const code = generateCertificateCode();
    const existing = await prisma.certificate.findUnique({
      where: { code },
      select: { id: true },
    });
    if (!existing) return code;
  }
  throw new Error('Failed to generate unique certificate code');
}

const createExamSchema = z.object({
  courseId: z.string().min(1, 'courseId is required'),
  title: z.string().trim().min(1, 'title is required'),
  durationMinutes: z.number().int().min(1, 'durationMinutes must be at least 1'),
  passingScore: z.number().int().min(1).max(100).optional(),
  isPublished: z.boolean().optional(),
});

const attachQuestionsSchema = z.object({
  questionIds: z.array(z.string().min(1)).min(1, 'At least one questionId is required'),
});

const submitExamSchema = z.object({
  attemptId: z.string().min(1, 'attemptId is required'),
  answers: z.record(z.string(), z.string()),
});

// ==================== TEACHER / ADMIN EXAM ROUTES ====================

examsRouter.post(
  '/',
  authenticate,
  authorize(teacherOrAdmin),
  async (req: Request, res: Response, next) => {
    try {
      const parsed = createExamSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
        return;
      }

      const course = await prisma.course.findUnique({
        where: { id: parsed.data.courseId },
        select: { id: true },
      });
      if (!course) {
        res.status(404).json({ error: 'Course not found' });
        return;
      }

      const exam = await prisma.exam.create({
        data: {
          courseId: parsed.data.courseId,
          title: parsed.data.title,
          durationMinutes: parsed.data.durationMinutes,
          passingScore: parsed.data.passingScore ?? 60,
          isPublished: parsed.data.isPublished ?? false,
        },
      });

      res.status(201).json({ exam });
    } catch (err) {
      next(err);
    }
  }
);

examsRouter.post(
  '/:examId/questions',
  authenticate,
  authorize(teacherOrAdmin),
  async (req: Request, res: Response, next) => {
    try {
      const examId = getParam(req, 'examId');
      const parsed = attachQuestionsSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
        return;
      }

      const exam = await prisma.exam.findUnique({
        where: { id: examId },
        select: { id: true },
      });
      if (!exam) {
        res.status(404).json({ error: 'Exam not found' });
        return;
      }

      const existingCount = await prisma.examQuestion.count({ where: { examId } });
      const data = parsed.data.questionIds.map((questionId, idx) => ({
        examId,
        questionId,
        order: existingCount + idx,
      }));

      const result = await prisma.examQuestion.createMany({
        data,
        skipDuplicates: true,
      });

      res.status(201).json({
        examId,
        addedCount: result.count,
      });
    } catch (err) {
      next(err);
    }
  }
);

examsRouter.get(
  '/admin',
  authenticate,
  authorize(teacherOrAdmin),
  async (_req: Request, res: Response, next) => {
    try {
      const exams = await prisma.exam.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          course: {
            select: {
              id: true,
              level: true,
              title: true,
            },
          },
          _count: {
            select: {
              examQuestions: true,
              examAttempts: true,
            },
          },
        },
      });

      res.json({ exams });
    } catch (err) {
      next(err);
    }
  }
);

// ==================== STUDENT EXAM ROUTES ====================

examsRouter.get('/', authenticate, async (_req: Request, res: Response, next) => {
  try {
    const exams = await prisma.exam.findMany({
      where: { isPublished: true },
      orderBy: { createdAt: 'desc' },
      include: {
        course: {
          select: {
            id: true,
            level: true,
            title: true,
          },
        },
        _count: {
          select: {
            examQuestions: true,
          },
        },
      },
    });

    res.json({ exams });
  } catch (err) {
    next(err);
  }
});

examsRouter.post('/:examId/start', authenticate, async (req: Request, res: Response, next) => {
  try {
    const examId = getParam(req, 'examId');
    const exam = await prisma.exam.findUnique({
      where: { id: examId },
      include: {
        course: {
          select: { id: true, level: true, title: true },
        },
        examQuestions: {
          orderBy: { order: 'asc' },
          include: {
            question: {
              select: {
                id: true,
                sectionId: true,
                type: true,
                prompt: true,
                options: true,
                points: true,
                order: true,
                audioUrl: true,
              },
            },
          },
        },
      },
    });

    if (!exam || !exam.isPublished) {
      res.status(404).json({ error: 'Exam not found' });
      return;
    }

    const questions = exam.examQuestions.map((eq) => eq.question);
    const maxScore = questions.reduce((sum, q) => sum + q.points, 0);

    const attempt = await prisma.examAttempt.create({
      data: {
        userId: req.user!.id,
        examId,
        maxScore,
      },
    });

    res.status(201).json({
      attemptId: attempt.id,
      startedAt: attempt.startedAt,
      durationMinutes: exam.durationMinutes,
      exam: {
        id: exam.id,
        title: exam.title,
        durationMinutes: exam.durationMinutes,
        passingScore: exam.passingScore,
        course: exam.course,
      },
      questions,
    });
  } catch (err) {
    next(err);
  }
});

examsRouter.post('/:examId/submit', authenticate, async (req: Request, res: Response, next) => {
  try {
    const examId = getParam(req, 'examId');
    const parsed = submitExamSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
      return;
    }

    const { attemptId, answers } = parsed.data;
    const userId = req.user!.id;

    const attempt = await prisma.examAttempt.findUnique({
      where: { id: attemptId },
    });

    if (!attempt || attempt.userId !== userId || attempt.examId !== examId) {
      res.status(404).json({ error: 'Exam attempt not found' });
      return;
    }

    if (attempt.finishedAt) {
      res.status(400).json({ error: 'Exam attempt has already been submitted' });
      return;
    }

    const exam = await prisma.exam.findUnique({
      where: { id: examId },
      include: {
        examQuestions: {
          include: {
            question: {
              select: {
                id: true,
                correctAnswer: true,
                points: true,
              },
            },
          },
        },
      },
    });

    if (!exam) {
      res.status(404).json({ error: 'Exam not found' });
      return;
    }

    // Server-side time limit check (durationMinutes + 1 minute buffer)
    const deadlineMs = attempt.startedAt.getTime() + (exam.durationMinutes + 1) * 60 * 1000;
    if (Date.now() > deadlineMs) {
      res.status(400).json({ error: 'Exam time limit exceeded' });
      return;
    }

    let score = 0;
    let maxScore = 0;

    for (const eq of exam.examQuestions) {
      maxScore += eq.question.points;
      const userAns = (answers[eq.question.id] ?? '').trim().toLowerCase();
      const correctAns = eq.question.correctAnswer.trim().toLowerCase();
      if (userAns.length > 0 && userAns === correctAns) {
        score += eq.question.points;
      }
    }

    const scorePercent = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
    const passed = scorePercent >= exam.passingScore;

    await prisma.examAttempt.update({
      where: { id: attempt.id },
      data: {
        finishedAt: new Date(),
        score,
        maxScore,
        passed,
        answers,
      },
    });

    let certificate = null;
    if (passed) {
      const code = await createUniqueCertificateCode();
      certificate = await prisma.certificate.upsert({
        where: {
          userId_examId: {
            userId,
            examId,
          },
        },
        create: {
          code,
          userId,
          examId,
          scorePercent,
        },
        update: {
          scorePercent,
          issuedAt: new Date(),
        },
      });
    }

    res.json({
      score,
      maxScore,
      scorePercent,
      passed,
      passingScore: exam.passingScore,
      certificate,
    });
  } catch (err) {
    next(err);
  }
});

// ==================== CERTIFICATE ROUTES ====================

certificatesRouter.get('/my', authenticate, async (req: Request, res: Response, next) => {
  try {
    const certificates = await prisma.certificate.findMany({
      where: { userId: req.user!.id },
      orderBy: { issuedAt: 'desc' },
      include: {
        exam: {
          select: {
            id: true,
            title: true,
            course: {
              select: {
                level: true,
                title: true,
              },
            },
          },
        },
      },
    });

    res.json({ certificates });
  } catch (err) {
    next(err);
  }
});

certificatesRouter.get('/verify/:code', async (req: Request, res: Response, next) => {
  try {
    const code = getParam(req, 'code').trim().toUpperCase();
    const certificate = await prisma.certificate.findUnique({
      where: { code },
      include: {
        user: {
          select: {
            fullName: true,
          },
        },
        exam: {
          select: {
            title: true,
            course: {
              select: {
                level: true,
                title: true,
              },
            },
          },
        },
      },
    });

    if (!certificate) {
      res.status(404).json({ error: 'Certificate not found' });
      return;
    }

    res.json({
      certificate: {
        code: certificate.code,
        scorePercent: certificate.scorePercent,
        issuedAt: certificate.issuedAt,
        studentName: certificate.user.fullName,
        examTitle: certificate.exam.title,
        hskLevel: certificate.exam.course.level,
        courseTitle: certificate.exam.course.title,
      },
    });
  } catch (err) {
    next(err);
  }
});
