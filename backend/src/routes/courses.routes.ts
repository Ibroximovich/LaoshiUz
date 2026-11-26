import { Request, Response, Router } from 'express';
import { z } from 'zod';
import { Prisma } from '../generated/prisma/client.js';
import { QuestionType, Role, SectionType } from '../generated/prisma/enums.js';
import { prisma } from '../lib/prisma.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = Router();
const teacherOrAdmin = [Role.TEACHER, Role.ADMIN];

function getParam(req: Request, key: string): string {
  const val = req.params[key];
  return Array.isArray(val) ? val[0] ?? '' : val ?? '';
}

const createCourseSchema = z.object({
  level: z.number().int().min(1).max(9),
  title: z.string().trim().min(1),
  description: z.string().trim().optional().nullable(),
  order: z.number().int().optional(),
  isPublished: z.boolean().optional(),
});
const updateCourseSchema = createCourseSchema.partial();

const createLessonSchema = z.object({
  courseId: z.string().min(1),
  number: z.number().int().min(1),
  title: z.string().trim().min(1),
  isPublished: z.boolean().optional(),
});
const updateLessonSchema = createLessonSchema.omit({ courseId: true }).partial();

const createSectionSchema = z.object({
  lessonId: z.string().min(1),
  type: z.nativeEnum(SectionType),
  title: z.string().trim().min(1),
  content: z.string().optional().nullable(),
  order: z.number().int().optional(),
});
const updateSectionSchema = createSectionSchema.omit({ lessonId: true }).partial();

const createVocabularySchema = z.object({
  sectionId: z.string().min(1),
  hanzi: z.string().trim().min(1),
  pinyin: z.string().trim().min(1),
  translation: z.string().trim().min(1),
  exampleCn: z.string().trim().optional().nullable(),
  exampleUz: z.string().trim().optional().nullable(),
  audioUrl: z.string().trim().optional().nullable(),
});
const updateVocabularySchema = createVocabularySchema.omit({ sectionId: true }).partial();

const createQuestionSchema = z.object({
  sectionId: z.string().min(1),
  type: z.nativeEnum(QuestionType).optional(),
  prompt: z.string().trim().min(1),
  options: z.unknown().optional().nullable(),
  correctAnswer: z.string().trim().min(1),
  explanation: z.string().trim().optional().nullable(),
  audioUrl: z.string().trim().optional().nullable(),
  points: z.number().int().min(0).optional(),
  order: z.number().int().optional(),
});
const updateQuestionSchema = createQuestionSchema.omit({ sectionId: true }).partial();

function toJsonInput(
  value: unknown
): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput | undefined {
  if (value === undefined) return undefined;
  if (value === null) return Prisma.JsonNull;
  return value as Prisma.InputJsonValue;
}

// ==================== READ ROUTES (authenticated) ====================

router.get('/courses', authenticate, async (req: Request, res: Response, next) => {
  try {
    const isStudent = req.user!.role === Role.STUDENT;
    const courses = await prisma.course.findMany({
      where: isStudent ? { isPublished: true } : undefined,
      orderBy: [{ order: 'asc' }, { level: 'asc' }],
      include: {
        _count: {
          select: {
            lessons: isStudent ? { where: { isPublished: true } } : true,
          },
        },
      },
    });
    res.json({ courses });
  } catch (err) {
    next(err);
  }
});

router.get('/courses/:courseId/lessons', authenticate, async (req: Request, res: Response, next) => {
  try {
    const courseId = getParam(req, 'courseId');
    const isStudent = req.user!.role === Role.STUDENT;

    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course || (isStudent && !course.isPublished)) {
      res.status(404).json({ error: 'Course not found' });
      return;
    }

    const lessons = await prisma.lesson.findMany({
      where: {
        courseId,
        ...(isStudent ? { isPublished: true } : {}),
      },
      orderBy: { number: 'asc' },
    });

    res.json({ lessons });
  } catch (err) {
    next(err);
  }
});

router.get('/lessons/:lessonId', authenticate, async (req: Request, res: Response, next) => {
  try {
    const lessonId = getParam(req, 'lessonId');
    const isStudent = req.user!.role === Role.STUDENT;

    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        course: { select: { id: true, level: true, title: true, isPublished: true } },
        sections: {
          orderBy: { order: 'asc' },
          include: {
            vocabularies: true,
            questions: {
              orderBy: { order: 'asc' },
            },
          },
        },
      },
    });

    if (!lesson || (isStudent && (!lesson.isPublished || !lesson.course.isPublished))) {
      res.status(404).json({ error: 'Lesson not found' });
      return;
    }

    if (isStudent) {
      const sanitizedSections = lesson.sections.map((section) => ({
        ...section,
        questions: section.questions.map(({ correctAnswer: _omitted, ...rest }) => rest),
      }));
      res.json({ lesson: { ...lesson, sections: sanitizedSections } });
      return;
    }

    res.json({ lesson });
  } catch (err) {
    next(err);
  }
});

// ==================== COURSES CRUD (TEACHER, ADMIN) ====================

router.post('/courses', authenticate, authorize(teacherOrAdmin), async (req: Request, res: Response, next) => {
  try {
    const parsed = createCourseSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
      return;
    }
    const course = await prisma.course.create({ data: parsed.data });
    res.status(201).json({ course });
  } catch (err) {
    next(err);
  }
});

router.patch('/courses/:id', authenticate, authorize(teacherOrAdmin), async (req: Request, res: Response, next) => {
  try {
    const parsed = updateCourseSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
      return;
    }
    const course = await prisma.course.update({
      where: { id: getParam(req, 'id') },
      data: parsed.data,
    });
    res.json({ course });
  } catch (err) {
    next(err);
  }
});

router.delete('/courses/:id', authenticate, authorize(teacherOrAdmin), async (req: Request, res: Response, next) => {
  try {
    await prisma.course.delete({ where: { id: getParam(req, 'id') } });
    res.json({ message: 'Course deleted' });
  } catch (err) {
    next(err);
  }
});

// ==================== LESSONS CRUD (TEACHER, ADMIN) ====================

router.post('/lessons', authenticate, authorize(teacherOrAdmin), async (req: Request, res: Response, next) => {
  try {
    const parsed = createLessonSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
      return;
    }
    const lesson = await prisma.lesson.create({ data: parsed.data });
    res.status(201).json({ lesson });
  } catch (err) {
    next(err);
  }
});

router.patch('/lessons/:id', authenticate, authorize(teacherOrAdmin), async (req: Request, res: Response, next) => {
  try {
    const parsed = updateLessonSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
      return;
    }
    const lesson = await prisma.lesson.update({
      where: { id: getParam(req, 'id') },
      data: parsed.data,
    });
    res.json({ lesson });
  } catch (err) {
    next(err);
  }
});

router.delete('/lessons/:id', authenticate, authorize(teacherOrAdmin), async (req: Request, res: Response, next) => {
  try {
    await prisma.lesson.delete({ where: { id: getParam(req, 'id') } });
    res.json({ message: 'Lesson deleted' });
  } catch (err) {
    next(err);
  }
});

// ==================== SECTIONS CRUD (TEACHER, ADMIN) ====================

router.post('/sections', authenticate, authorize(teacherOrAdmin), async (req: Request, res: Response, next) => {
  try {
    const parsed = createSectionSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
      return;
    }
    const section = await prisma.section.create({ data: parsed.data });
    res.status(201).json({ section });
  } catch (err) {
    next(err);
  }
});

router.patch('/sections/:id', authenticate, authorize(teacherOrAdmin), async (req: Request, res: Response, next) => {
  try {
    const parsed = updateSectionSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
      return;
    }
    const section = await prisma.section.update({
      where: { id: getParam(req, 'id') },
      data: parsed.data,
    });
    res.json({ section });
  } catch (err) {
    next(err);
  }
});

router.delete('/sections/:id', authenticate, authorize(teacherOrAdmin), async (req: Request, res: Response, next) => {
  try {
    await prisma.section.delete({ where: { id: getParam(req, 'id') } });
    res.json({ message: 'Section deleted' });
  } catch (err) {
    next(err);
  }
});

// ==================== VOCABULARIES CRUD (TEACHER, ADMIN) ====================

router.post('/vocabularies', authenticate, authorize(teacherOrAdmin), async (req: Request, res: Response, next) => {
  try {
    const parsed = createVocabularySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
      return;
    }
    const vocabulary = await prisma.vocabulary.create({ data: parsed.data });
    res.status(201).json({ vocabulary });
  } catch (err) {
    next(err);
  }
});

router.patch('/vocabularies/:id', authenticate, authorize(teacherOrAdmin), async (req: Request, res: Response, next) => {
  try {
    const parsed = updateVocabularySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
      return;
    }
    const vocabulary = await prisma.vocabulary.update({
      where: { id: getParam(req, 'id') },
      data: parsed.data,
    });
    res.json({ vocabulary });
  } catch (err) {
    next(err);
  }
});

router.delete('/vocabularies/:id', authenticate, authorize(teacherOrAdmin), async (req: Request, res: Response, next) => {
  try {
    await prisma.vocabulary.delete({ where: { id: getParam(req, 'id') } });
    res.json({ message: 'Vocabulary deleted' });
  } catch (err) {
    next(err);
  }
});

// ==================== QUESTIONS CRUD (TEACHER, ADMIN) ====================

router.post('/questions', authenticate, authorize(teacherOrAdmin), async (req: Request, res: Response, next) => {
  try {
    const parsed = createQuestionSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
      return;
    }
    const { options, ...rest } = parsed.data;
    const question = await prisma.question.create({
      data: {
        ...rest,
        options: toJsonInput(options),
      },
    });
    res.status(201).json({ question });
  } catch (err) {
    next(err);
  }
});

router.patch('/questions/:id', authenticate, authorize(teacherOrAdmin), async (req: Request, res: Response, next) => {
  try {
    const parsed = updateQuestionSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
      return;
    }
    const { options, ...rest } = parsed.data;
    const question = await prisma.question.update({
      where: { id: getParam(req, 'id') },
      data: {
        ...rest,
        ...(options !== undefined ? { options: toJsonInput(options) } : {}),
      },
    });
    res.json({ question });
  } catch (err) {
    next(err);
  }
});

router.delete('/questions/:id', authenticate, authorize(teacherOrAdmin), async (req: Request, res: Response, next) => {
  try {
    await prisma.question.delete({ where: { id: getParam(req, 'id') } });
    res.json({ message: 'Question deleted' });
  } catch (err) {
    next(err);
  }
});

export default router;
