import { Request, Response, Router } from 'express';
import multer from 'multer';
import * as XLSX from 'xlsx';
import { z } from 'zod';
import { Prisma } from '../generated/prisma/client.js';
import { QuestionType, Role } from '../generated/prisma/enums.js';
import { prisma } from '../lib/prisma.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = Router();
const teacherOrAdmin = [Role.TEACHER, Role.ADMIN];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const lowerName = file.originalname.toLowerCase();
    if (lowerName.endsWith('.xlsx') || lowerName.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only .xlsx and .csv files are allowed'));
    }
  },
});

function getParam(req: Request, key: string): string {
  const val = req.params[key];
  return Array.isArray(val) ? val[0] ?? '' : val ?? '';
}

function asTrimmedString(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function asOptionalString(value: unknown): string | undefined {
  const s = asTrimmedString(value);
  return s.length > 0 ? s : undefined;
}

function parseSpreadsheetRows(buffer: Buffer): Record<string, unknown>[] {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    return [];
  }
  const sheet = workbook.Sheets[firstSheetName];
  if (!sheet) {
    return [];
  }
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
}

const vocabularyRowSchema = z.object({
  hanzi: z.string().min(1, 'hanzi is required'),
  pinyin: z.string().min(1, 'pinyin is required'),
  translation: z.string().min(1, 'translation is required'),
  exampleCn: z.string().optional(),
  exampleUz: z.string().optional(),
});

const questionRowSchema = z.object({
  type: z.nativeEnum(QuestionType).default(QuestionType.MULTIPLE_CHOICE),
  prompt: z.string().min(1, 'prompt is required'),
  correctAnswer: z.string().min(1, 'correctAnswer is required'),
  explanation: z.string().optional(),
  points: z.number().int().min(0).default(10),
});

interface RowError {
  row: number;
  errors: string[];
}

router.post(
  '/vocabulary/:sectionId',
  authenticate,
  authorize(teacherOrAdmin),
  upload.single('file'),
  async (req: Request, res: Response, next) => {
    try {
      const sectionId = getParam(req, 'sectionId');
      const section = await prisma.section.findUnique({ where: { id: sectionId } });
      if (!section) {
        res.status(404).json({ error: 'Section not found' });
        return;
      }

      if (!req.file) {
        res.status(400).json({ error: 'File is required (field name: file)' });
        return;
      }

      const rows = parseSpreadsheetRows(req.file.buffer);
      if (rows.length === 0) {
        res.status(400).json({ error: 'Uploaded file contains no rows' });
        return;
      }

      const validData: Prisma.VocabularyCreateManyInput[] = [];
      const errors: RowError[] = [];

      rows.forEach((raw, idx) => {
        const rowNumber = idx + 2;
        const normalized = {
          hanzi: asTrimmedString(raw['hanzi']),
          pinyin: asTrimmedString(raw['pinyin']),
          translation: asTrimmedString(raw['tarjima'] ?? raw['translation']),
          exampleCn: asOptionalString(raw['misol_gap'] ?? raw['exampleCn']),
          exampleUz: asOptionalString(raw['exampleUz']),
        };

        const parsed = vocabularyRowSchema.safeParse(normalized);
        if (!parsed.success) {
          errors.push({
            row: rowNumber,
            errors: parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`),
          });
          return;
        }

        validData.push({
          sectionId,
          ...parsed.data,
        });
      });

      if (validData.length > 0) {
        await prisma.vocabulary.createMany({ data: validData });
      }

      res.status(201).json({
        insertedCount: validData.length,
        errorCount: errors.length,
        errors,
      });
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  '/questions/:sectionId',
  authenticate,
  authorize(teacherOrAdmin),
  upload.single('file'),
  async (req: Request, res: Response, next) => {
    try {
      const sectionId = getParam(req, 'sectionId');
      const section = await prisma.section.findUnique({ where: { id: sectionId } });
      if (!section) {
        res.status(404).json({ error: 'Section not found' });
        return;
      }

      if (!req.file) {
        res.status(400).json({ error: 'File is required (field name: file)' });
        return;
      }

      const rows = parseSpreadsheetRows(req.file.buffer);
      if (rows.length === 0) {
        res.status(400).json({ error: 'Uploaded file contains no rows' });
        return;
      }

      const validData: Prisma.QuestionCreateManyInput[] = [];
      const errors: RowError[] = [];

      rows.forEach((raw, idx) => {
        const rowNumber = idx + 2;
        const rawType = asOptionalString(raw['type'])?.toUpperCase();
        const rawPoints = asOptionalString(raw['points']);
        const parsedPoints = rawPoints !== undefined ? Number(rawPoints) : undefined;

        const normalized = {
          type: rawType ?? QuestionType.MULTIPLE_CHOICE,
          prompt: asTrimmedString(raw['savol'] ?? raw['prompt']),
          correctAnswer: asTrimmedString(raw['togri_javob'] ?? raw['correctAnswer']),
          explanation: asOptionalString(raw['tushuntirish'] ?? raw['explanation']),
          points: parsedPoints !== undefined && !Number.isNaN(parsedPoints) ? parsedPoints : 10,
        };

        const parsed = questionRowSchema.safeParse(normalized);
        if (!parsed.success) {
          errors.push({
            row: rowNumber,
            errors: parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`),
          });
          return;
        }

        const options = [
          asOptionalString(raw['variant_a'] ?? raw['optionA']),
          asOptionalString(raw['variant_b'] ?? raw['optionB']),
          asOptionalString(raw['variant_c'] ?? raw['optionC']),
          asOptionalString(raw['variant_d'] ?? raw['optionD']),
        ].filter((opt): opt is string => opt !== undefined);

        validData.push({
          sectionId,
          type: parsed.data.type,
          prompt: parsed.data.prompt,
          options: options.length > 0 ? options : Prisma.JsonNull,
          correctAnswer: parsed.data.correctAnswer,
          explanation: parsed.data.explanation,
          points: parsed.data.points,
          order: idx,
        });
      });

      if (validData.length > 0) {
        await prisma.question.createMany({ data: validData });
      }

      res.status(201).json({
        insertedCount: validData.length,
        errorCount: errors.length,
        errors,
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
