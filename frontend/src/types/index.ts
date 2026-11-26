export type Role = 'STUDENT' | 'TEACHER' | 'ADMIN';

export type SectionType =
  | 'VOCABULARY'
  | 'GRAMMAR'
  | 'READING'
  | 'LISTENING'
  | 'WRITING'
  | 'SPEAKING';

export type QuestionType =
  | 'MULTIPLE_CHOICE'
  | 'FILL_BLANK'
  | 'TRUE_FALSE'
  | 'WORD_ORDER'
  | 'MATCHING';

export interface User {
  id: string;
  telegramId?: string | null;
  username?: string | null;
  fullName: string;
  role: Role;
  createdAt: string;
}

export interface Course {
  id: string;
  level: number;
  title: string;
  description?: string | null;
  order: number;
  isPublished: boolean;
  _count?: {
    lessons: number;
  };
}

export interface Vocabulary {
  id: string;
  sectionId: string;
  hanzi: string;
  pinyin: string;
  translation: string;
  exampleCn?: string | null;
  exampleUz?: string | null;
  audioUrl?: string | null;
}

export interface Question {
  id: string;
  sectionId: string;
  type: QuestionType;
  prompt: string;
  options?: string[] | null;
  correctAnswer?: string;
  explanation?: string | null;
  audioUrl?: string | null;
  points: number;
  order: number;
}

export interface Section {
  id: string;
  lessonId: string;
  type: SectionType;
  title: string;
  content?: string | null;
  order: number;
  vocabularies?: Vocabulary[];
  questions?: Question[];
}

export interface Lesson {
  id: string;
  courseId: string;
  number: number;
  title: string;
  isPublished: boolean;
  course?: {
    id: string;
    level: number;
    title: string;
    isPublished: boolean;
  };
  sections?: Section[];
}

export interface Group {
  id: string;
  name: string;
  inviteCode: string;
  teacherId: string;
  createdAt: string;
  _count?: {
    members: number;
  };
}

export interface GroupMemberItem {
  id: string;
  userId: string;
  fullName: string;
  username?: string | null;
  joinedAt: string;
}

export interface GroupAssignmentItem {
  id: string;
  groupId: string;
  lessonId: string;
  dueDate?: string | null;
  createdAt: string;
  lesson: {
    id: string;
    courseId: string;
    number: number;
    title: string;
    isPublished: boolean;
  };
}

export interface GroupDetail extends Group {
  members: GroupMemberItem[];
  assignments: GroupAssignmentItem[];
}

export interface GroupReportRow {
  userId: string;
  fullName: string;
  username?: string | null;
  joinedAt: string;
  totalAttempts: number;
  correctAttempts: number;
  totalScore: number;
  accuracyPercent: number;
}

export interface ImportRowError {
  row: number;
  errors: string[];
}

export interface ImportResult {
  insertedCount: number;
  errorCount: number;
  errors: ImportRowError[];
}

export interface MyStats {
  totalScore: number;
  totalAttempts: number;
  correctAttempts: number;
  accuracyPercent: number;
  reviewQueueCount: number;
}

export interface SubmitAttemptResponse {
  isCorrect: boolean;
  correctAnswer: string;
  explanation?: string | null;
  score: number;
}

export interface ReviewQueueItem {
  id: string;
  userId: string;
  questionId: string;
  wrongCount: number;
  updatedAt: string;
  question: Question;
}

export interface StudentGroupAssignment {
  id: string;
  lessonId: string;
  dueDate?: string | null;
  createdAt: string;
  lesson: {
    id: string;
    courseId: string;
    number: number;
    title: string;
    isPublished: boolean;
  };
}

export interface StudentGroupItem {
  id: string;
  name: string;
  inviteCode: string;
  joinedAt: string;
  assignments: StudentGroupAssignment[];
}

export interface Exam {
  id: string;
  courseId: string;
  title: string;
  durationMinutes: number;
  passingScore: number;
  isPublished: boolean;
  createdAt: string;
  course?: {
    id: string;
    level: number;
    title: string;
  };
  _count?: {
    examQuestions: number;
    examAttempts?: number;
  };
}

export interface StartExamResponse {
  attemptId: string;
  startedAt: string;
  durationMinutes: number;
  exam: {
    id: string;
    title: string;
    durationMinutes: number;
    passingScore: number;
    course?: {
      id: string;
      level: number;
      title: string;
    };
  };
  questions: Question[];
}

export interface Certificate {
  id: string;
  code: string;
  userId: string;
  examId: string;
  scorePercent: number;
  issuedAt: string;
  exam?: {
    id: string;
    title: string;
    course?: {
      level: number;
      title: string;
    };
  };
}

export interface SubmitExamResponse {
  score: number;
  maxScore: number;
  scorePercent: number;
  passed: boolean;
  passingScore: number;
  certificate: Certificate | null;
}

export interface VerifyCertificateResponse {
  certificate: {
    code: string;
    scorePercent: number;
    issuedAt: string;
    studentName: string;
    examTitle: string;
    hskLevel: number;
    courseTitle: string;
  };
}
