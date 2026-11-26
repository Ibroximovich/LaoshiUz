'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  Alert,
  App as AntdApp,
  Button,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Radio,
  Select,
  Spin,
  Table,
  Tabs,
  Tag,
  Upload,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { UploadFile } from 'antd/es/upload/interface';
import {
  ArrowLeftOutlined,
  BookOutlined,
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  FileExcelOutlined,
  FileTextOutlined,
  InboxOutlined,
  PlusOutlined,
  QuestionCircleOutlined,
  SaveOutlined,
  SoundOutlined,
} from '@ant-design/icons';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { ChineseAudioButton } from '@/components/ChineseAudioButton';
import api from '@/lib/api';
import type {
  ImportResult,
  Lesson,
  Question,
  QuestionType,
  Section,
  Vocabulary,
} from '@/types';

const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  MULTIPLE_CHOICE: 'Ko‘p tanlovli (A/B/C/D)',
  TRUE_FALSE: 'To‘g‘ri / Noto‘g‘ri',
  FILL_BLANK: 'Bo‘sh joyni to‘ldirish',
  WORD_ORDER: 'So‘z tartibi',
  MATCHING: 'Moslashtirish',
};

interface VocabularyFormValues {
  hanzi: string;
  pinyin: string;
  translation: string;
  exampleCn?: string;
  exampleUz?: string;
}

interface QuickQuestionFormValues {
  type: QuestionType;
  prompt: string;
  optionA?: string;
  optionB?: string;
  optionC?: string;
  optionD?: string;
  correctOptionKey?: 'A' | 'B' | 'C' | 'D';
  correctAnswerText?: string;
  explanation?: string;
  points: number;
}

export default function AdminLessonEditorPage() {
  const params = useParams<{ lessonId: string }>();
  const lessonId = params?.lessonId ?? '';
  const { message } = AntdApp.useApp();

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);

  // Quick-add Vocabulary Form & Edit Modal
  const [addingVocab, setAddingVocab] = useState(false);
  const [quickVocabForm] = Form.useForm<VocabularyFormValues>();
  const [editVocabModalOpen, setEditVocabModalOpen] = useState(false);
  const [editingVocab, setEditingVocab] = useState<Vocabulary | null>(null);
  const [savingEditVocab, setSavingEditVocab] = useState(false);
  const [editVocabForm] = Form.useForm<VocabularyFormValues>();

  // Grammar / Reading Content State
  const [grammarContent, setGrammarContent] = useState<string>('');
  const [savingGrammar, setSavingGrammar] = useState(false);

  // Quick-add Question Form & Edit Modal
  const [addingQuestion, setAddingQuestion] = useState(false);
  const [quickAudioUrl, setQuickAudioUrl] = useState<string | null>(null);
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [quickQuestionForm] = Form.useForm<QuickQuestionFormValues>();
  const quickQuestionType = Form.useWatch('type', quickQuestionForm) ?? 'MULTIPLE_CHOICE';

  const [editQuestionModalOpen, setEditQuestionModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [savingEditQuestion, setSavingEditQuestion] = useState(false);
  const [editQuestionForm] = Form.useForm<QuickQuestionFormValues>();
  const editQuestionType = Form.useWatch('type', editQuestionForm) ?? 'MULTIPLE_CHOICE';

  // Excel / CSV Import Modal
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importType, setImportType] = useState<'vocabulary' | 'questions'>('vocabulary');
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const reloadLesson = useCallback(async () => {
    if (!lessonId) return;
    try {
      const res = await api.get<{ lesson: Lesson }>(`/api/lessons/${lessonId}`);
      const loaded = res.data.lesson;
      setLesson(loaded);
      const gSec =
        loaded.sections?.find((s) => s.type === 'GRAMMAR') ?? loaded.sections?.[1];
      setGrammarContent(gSec?.content ?? '');
    } catch {
      message.error('Dars ma‘lumotlarini yangilashda xatolik yuz berdi');
    }
  }, [lessonId, message]);

  useEffect(() => {
    if (!lessonId) return;
    let active = true;

    async function initLesson() {
      try {
        const res = await api.get<{ lesson: Lesson }>(`/api/lessons/${lessonId}`);
        if (!active) return;
        let loaded = res.data.lesson;

        // Auto-create 3 standard sections if lesson has none
        if (!loaded.sections || loaded.sections.length === 0) {
          await api.post('/api/sections', {
            lessonId,
            type: 'VOCABULARY',
            title: "Lug'at",
            order: 1,
          });
          await api.post('/api/sections', {
            lessonId,
            type: 'GRAMMAR',
            title: 'Grammatika va Matn',
            order: 2,
          });
          await api.post('/api/sections', {
            lessonId,
            type: 'READING',
            title: 'Test va Mashqlar',
            order: 3,
          });

          const refreshed = await api.get<{ lesson: Lesson }>(`/api/lessons/${lessonId}`);
          if (!active) return;
          loaded = refreshed.data.lesson;
        }

        setLesson(loaded);
        const gSec =
          loaded.sections?.find((s) => s.type === 'GRAMMAR') ?? loaded.sections?.[1];
        setGrammarContent(gSec?.content ?? '');
      } catch {
        if (active) message.error('Dars ma‘lumotlarini yuklashda xatolik yuz berdi');
      } finally {
        if (active) setLoading(false);
      }
    }

    void initLesson();
    return () => {
      active = false;
    };
  }, [lessonId, message]);

  // Derive the 3 standard sections cleanly
  const { vocabSection, grammarSection, quizSection, allVocabularies, allQuestions } =
    useMemo(() => {
      const secs = lesson?.sections ?? [];
      const vSec: Section | undefined =
        secs.find((s) => s.type === 'VOCABULARY') ?? secs[0];
      const gSec: Section | undefined =
        secs.find((s) => s.type === 'GRAMMAR') ?? secs[1] ?? secs[0];
      const qSec: Section | undefined =
        secs.find((s) => s.type === 'READING') ??
        secs.find((s) => s.id !== vSec?.id && s.id !== gSec?.id) ??
        secs[secs.length - 1];

      const vocabs = secs.flatMap((s) => s.vocabularies ?? []);
      const questions = secs.flatMap((s) => s.questions ?? []);

      return {
        vocabSection: vSec,
        grammarSection: gSec,
        quizSection: qSec,
        allVocabularies: vocabs,
        allQuestions: questions,
      };
    }, [lesson]);

  // ==================== VOCABULARY HANDLERS ====================
  async function handleQuickAddVocab(values: VocabularyFormValues) {
    if (!vocabSection) return;
    setAddingVocab(true);
    try {
      await api.post('/api/vocabularies', {
        ...values,
        sectionId: vocabSection.id,
      });
      message.success('So‘z qo‘shildi');
      quickVocabForm.resetFields();
      await reloadLesson();
    } catch {
      message.error('So‘zni qo‘shishda xatolik yuz berdi');
    } finally {
      setAddingVocab(false);
    }
  }

  function openEditVocab(vocab: Vocabulary) {
    setEditingVocab(vocab);
    editVocabForm.setFieldsValue({
      hanzi: vocab.hanzi,
      pinyin: vocab.pinyin,
      translation: vocab.translation,
      exampleCn: vocab.exampleCn ?? '',
      exampleUz: vocab.exampleUz ?? '',
    });
    setEditVocabModalOpen(true);
  }

  async function handleSaveEditVocab(values: VocabularyFormValues) {
    if (!editingVocab) return;
    setSavingEditVocab(true);
    try {
      await api.patch(`/api/vocabularies/${editingVocab.id}`, values);
      message.success('So‘z yangilandi');
      setEditVocabModalOpen(false);
      await reloadLesson();
    } catch {
      message.error('So‘zni yangilashda xatolik yuz berdi');
    } finally {
      setSavingEditVocab(false);
    }
  }

  async function handleDeleteVocab(vocabId: string) {
    try {
      await api.delete(`/api/vocabularies/${vocabId}`);
      message.success('So‘z o‘chirildi');
      await reloadLesson();
    } catch {
      message.error('So‘zni o‘chirishda xatolik yuz berdi');
    }
  }

  // ==================== GRAMMAR CONTENT HANDLER ====================
  async function handleSaveGrammar() {
    if (!grammarSection) return;
    setSavingGrammar(true);
    try {
      await api.patch(`/api/sections/${grammarSection.id}`, {
        content: grammarContent,
      });
      message.success('Grammatika va o‘qish matni saqlandi');
      await reloadLesson();
    } catch {
      message.error('Matnni saqlashda xatolik yuz berdi');
    } finally {
      setSavingGrammar(false);
    }
  }

  // ==================== QUESTION HELPERS & HANDLERS ====================
  function buildQuestionPayload(values: QuickQuestionFormValues) {
    if (values.type === 'MULTIPLE_CHOICE') {
      const optionMap: Record<'A' | 'B' | 'C' | 'D', string | undefined> = {
        A: values.optionA?.trim(),
        B: values.optionB?.trim(),
        C: values.optionC?.trim(),
        D: values.optionD?.trim(),
      };
      const options = [optionMap.A, optionMap.B, optionMap.C, optionMap.D].filter(
        (o): o is string => Boolean(o)
      );
      const selectedKey = values.correctOptionKey ?? 'A';
      const correctAnswer = optionMap[selectedKey] ?? '';
      return {
        type: values.type,
        prompt: values.prompt.trim(),
        options: options.length > 0 ? options : null,
        correctAnswer,
        explanation: values.explanation?.trim() || null,
        points: values.points ?? 10,
      };
    }

    if (values.type === 'TRUE_FALSE') {
      return {
        type: values.type,
        prompt: values.prompt.trim(),
        options: ["To'g'ri", "Noto'g'ri"],
        correctAnswer: values.correctAnswerText?.trim() || "To'g'ri",
        explanation: values.explanation?.trim() || null,
        points: values.points ?? 10,
      };
    }

    return {
      type: values.type,
      prompt: values.prompt.trim(),
      options: null,
      correctAnswer: values.correctAnswerText?.trim() || '',
      explanation: values.explanation?.trim() || null,
      points: values.points ?? 10,
    };
  }

  async function handleAudioUpload(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    setUploadingAudio(true);
    try {
      const res = await api.post<{ audioUrl: string }>('/api/upload/audio', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setQuickAudioUrl(res.data.audioUrl);
      message.success('Audio fayl yuklandi');
    } catch {
      message.error('Audio faylni yuklashda xatolik yuz berdi');
    } finally {
      setUploadingAudio(false);
    }
  }

  async function handleQuickAddQuestion(values: QuickQuestionFormValues) {
    if (!quizSection) return;
    const payload = buildQuestionPayload(values);
    if (!payload.correctAnswer) {
      message.warning('To‘g‘ri javob variantini belgilang yoki kiriting');
      return;
    }

    setAddingQuestion(true);
    try {
      await api.post('/api/questions', {
        ...payload,
        audioUrl: quickAudioUrl,
        sectionId: quizSection.id,
      });
      message.success('Savol qo‘shildi');
      setQuickAudioUrl(null);
      quickQuestionForm.resetFields();
      quickQuestionForm.setFieldsValue({
        type: values.type,
        correctOptionKey: 'A',
        correctAnswerText: values.type === 'TRUE_FALSE' ? "To'g'ri" : '',
        points: 10,
      });
      await reloadLesson();
    } catch {
      message.error('Savolni qo‘shishda xatolik yuz berdi');
    } finally {
      setAddingQuestion(false);
    }
  }

  function openEditQuestion(q: Question) {
    setEditingQuestion(q);
    const opts = Array.isArray(q.options) ? q.options : [];
    const ans = q.correctAnswer ?? '';
    const matchedIdx = opts.findIndex(
      (o) => o.trim().toLowerCase() === ans.trim().toLowerCase()
    );
    const keys: Array<'A' | 'B' | 'C' | 'D'> = ['A', 'B', 'C', 'D'];

    editQuestionForm.setFieldsValue({
      type: q.type,
      prompt: q.prompt,
      optionA: opts[0] ?? '',
      optionB: opts[1] ?? '',
      optionC: opts[2] ?? '',
      optionD: opts[3] ?? '',
      correctOptionKey: matchedIdx >= 0 && matchedIdx < 4 ? keys[matchedIdx] : 'A',
      correctAnswerText: ans,
      explanation: q.explanation ?? '',
      points: q.points,
    });
    setEditQuestionModalOpen(true);
  }

  async function handleSaveEditQuestion(values: QuickQuestionFormValues) {
    if (!editingQuestion) return;
    const payload = buildQuestionPayload(values);
    if (!payload.correctAnswer) {
      message.warning('To‘g‘ri javobni belgilang yoki kiriting');
      return;
    }

    setSavingEditQuestion(true);
    try {
      await api.patch(`/api/questions/${editingQuestion.id}`, payload);
      message.success('Savol yangilandi');
      setEditQuestionModalOpen(false);
      await reloadLesson();
    } catch {
      message.error('Savolni yangilashda xatolik yuz berdi');
    } finally {
      setSavingEditQuestion(false);
    }
  }

  async function handleDeleteQuestion(qId: string) {
    try {
      await api.delete(`/api/questions/${qId}`);
      message.success('Savol o‘chirildi');
      await reloadLesson();
    } catch {
      message.error('Savolni o‘chirishda xatolik yuz berdi');
    }
  }

  // ==================== EXCEL IMPORT & TEMPLATE DOWNLOAD ====================
  function openImportModal(type: 'vocabulary' | 'questions') {
    setImportType(type);
    setFileList([]);
    setImportResult(null);
    setImportModalOpen(true);
  }

  function handleDownloadTemplate() {
    const wb = XLSX.utils.book_new();

    if (importType === 'vocabulary') {
      const sampleRows = [
        {
          hanzi: '你好',
          pinyin: 'nǐ hǎo',
          tarjima: 'Salom',
          misol_gap: '你好，很高兴认识你。',
        },
        {
          hanzi: '谢谢',
          pinyin: 'xièxie',
          tarjima: 'Rahmat',
          misol_gap: '谢谢你的帮助！',
        },
      ];
      const ws = XLSX.utils.json_to_sheet(sampleRows);
      XLSX.utils.book_append_sheet(wb, ws, 'Lugat');
      XLSX.writeFile(wb, 'laoshiuz_lugat_shablon.xlsx');
    } else {
      const sampleRows = [
        {
          savol: '“你好” so‘zining o‘zbekcha tarjimasi nima?',
          variant_a: 'Salom',
          variant_b: 'Xayr',
          variant_c: 'Rahmat',
          variant_d: 'Kechirasiz',
          togri_javob: 'Salom',
          tushuntirish: '“你好 (nǐ hǎo)” xitoy tilida salomlashishda ishlatiladi.',
        },
        {
          savol: '“老师” iyeroglifining to‘g‘ri pinyini qaysi?',
          variant_a: 'xuéshēng',
          variant_b: 'lǎoshī',
          variant_c: 'péngyou',
          variant_d: 'tóngxué',
          togri_javob: 'lǎoshī',
          tushuntirish: '“老师 (lǎoshī)” — ustoz / o‘qituvchi degan ma‘noni bildiradi.',
        },
      ];
      const ws = XLSX.utils.json_to_sheet(sampleRows);
      XLSX.utils.book_append_sheet(wb, ws, 'Test');
      XLSX.writeFile(wb, 'laoshiuz_test_shablon.xlsx');
    }
  }

  async function handleUploadImport() {
    const selectedFile = fileList[0]?.originFileObj;
    const targetSectionId =
      importType === 'vocabulary' ? vocabSection?.id : quizSection?.id;

    if (!selectedFile || !targetSectionId) {
      message.warning('Iltimos, avval .xlsx yoki .csv fayl tanlang');
      return;
    }

    const formData = new FormData();
    formData.append('file', selectedFile);

    setUploading(true);
    try {
      const endpoint =
        importType === 'vocabulary'
          ? `/api/import/vocabulary/${targetSectionId}`
          : `/api/import/questions/${targetSectionId}`;

      const res = await api.post<ImportResult>(endpoint, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setImportResult(res.data);
      message.success(`${res.data.insertedCount} ta yozuv muvaffaqiyatli yuklandi`);
      await reloadLesson();
    } catch (err) {
      let errMsg = 'Faylni yuklashda xatolik yuz berdi';
      if (axios.isAxiosError(err)) {
        const data = err.response?.data as { error?: string } | undefined;
        if (data?.error) errMsg = data.error;
      }
      message.error(errMsg);
    } finally {
      setUploading(false);
    }
  }

  // ==================== TABLES ====================
  const vocabColumns: ColumnsType<Vocabulary> = [
    {
      title: 'Iyeroglif',
      dataIndex: 'hanzi',
      key: 'hanzi',
      render: (text: string) => (
        <span className="font-hanzi text-2xl font-medium text-[#0F172A]">{text}</span>
      ),
    },
    {
      title: 'Pinyin',
      dataIndex: 'pinyin',
      key: 'pinyin',
      render: (text: string) => (
        <span className="text-sm font-semibold text-[#DC2626] bg-[#FEF2F2] px-2.5 py-1 rounded-lg">
          {text}
        </span>
      ),
    },
    {
      title: 'Tarjima',
      dataIndex: 'translation',
      key: 'translation',
      render: (text: string) => <span className="font-medium text-[#0F172A]">{text}</span>,
    },
    {
      title: 'Misol gap',
      key: 'example',
      render: (_, row) =>
        row.exampleCn || row.exampleUz ? (
          <div className="space-y-0.5 max-w-xs">
            {row.exampleCn && (
              <div className="font-hanzi text-sm text-[#0F172A]">{row.exampleCn}</div>
            )}
            {row.exampleUz && <div className="text-xs text-[#475569]">{row.exampleUz}</div>}
          </div>
        ) : (
          <span className="text-xs text-[#94A3B8]">—</span>
        ),
    },
    {
      title: 'Amallar',
      key: 'actions',
      width: 100,
      render: (_, row) => (
        <div className="flex items-center gap-1">
          <Button
            size="small"
            type="text"
            icon={<EditOutlined />}
            onClick={() => openEditVocab(row)}
            aria-label="So‘zni tahrirlash"
          />
          <Popconfirm
            title="So‘zni o‘chirishni tasdiqlaysizmi?"
            onConfirm={() => handleDeleteVocab(row.id)}
            okText="Ha"
            cancelText="Yo‘q"
          >
            <Button
              size="small"
              type="text"
              danger
              icon={<DeleteOutlined />}
              aria-label="So‘zni o‘chirish"
            />
          </Popconfirm>
        </div>
      ),
    },
  ];

  const questionColumns: ColumnsType<Question> = [
    {
      title: 'Savol',
      dataIndex: 'prompt',
      key: 'prompt',
      render: (text: string, row) => (
        <div className="space-y-1.5 max-w-md">
          <div className="font-medium text-[#0F172A] font-hanzi">{text}</div>
          {Array.isArray(row.options) && row.options.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {row.options.map((opt, idx) => (
                <Tag key={idx} className="m-0 rounded-md text-xs">
                  {String.fromCharCode(65 + idx)}. {opt}
                </Tag>
              ))}
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Turi',
      dataIndex: 'type',
      key: 'type',
      render: (t: QuestionType) => (
        <Tag color="blue" className="m-0 rounded-md">
          {QUESTION_TYPE_LABELS[t] ?? t}
        </Tag>
      ),
    },
    {
      title: 'To‘g‘ri javob',
      dataIndex: 'correctAnswer',
      key: 'correctAnswer',
      render: (ans: string) => (
        <Tag color="success" className="m-0 rounded-md font-semibold">
          {ans}
        </Tag>
      ),
    },
    {
      title: 'Ball',
      dataIndex: 'points',
      key: 'points',
      align: 'center',
      render: (pts: number) => <span className="font-bold text-[#0F172A]">{pts}</span>,
    },
    {
      title: 'Amallar',
      key: 'actions',
      width: 100,
      render: (_, row) => (
        <div className="flex items-center gap-1">
          <Button
            size="small"
            type="text"
            icon={<EditOutlined />}
            onClick={() => openEditQuestion(row)}
            aria-label="Savolni tahrirlash"
          />
          <Popconfirm
            title="Savolni o‘chirishni tasdiqlaysizmi?"
            onConfirm={() => handleDeleteQuestion(row.id)}
            okText="Ha"
            cancelText="Yo‘q"
          >
            <Button
              size="small"
              type="text"
              danger
              icon={<DeleteOutlined />}
              aria-label="Savolni o‘chirish"
            />
          </Popconfirm>
        </div>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col justify-center items-center gap-3">
        <Spin size="large" />
        <p className="text-sm text-[#475569]">Dars muharriri tayyorlanmoqda...</p>
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="max-w-4xl mx-auto bg-white rounded-2xl border border-[#E2E8F0] p-10 text-center space-y-4">
        <Empty description="Dars topilmadi" />
        <Link href="/admin">
          <Button icon={<ArrowLeftOutlined />} className="min-h-[42px] rounded-xl">
            Kurslarga qaytish
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 sm:p-6 space-y-2">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[#475569] hover:text-[#DC2626] transition-colors"
        >
          <ArrowLeftOutlined />
          <span>Kurslar va darslarga qaytish</span>
        </Link>

        <div className="flex flex-wrap items-center gap-2.5">
          {lesson.course && (
            <Tag color="red" className="m-0 rounded-md font-bold">
              HSK {lesson.course.level}
            </Tag>
          )}
          <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A]">
            {lesson.number}-dars: {lesson.title}
          </h1>
        </div>
      </div>

      {/* 3 Fixed User-Friendly Tabs */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 sm:p-6">
        <Tabs
          defaultActiveKey="vocabulary"
          items={[
            {
              key: 'vocabulary',
              label: (
                <span className="inline-flex items-center gap-2 font-medium">
                  <BookOutlined />
                  <span>Lug‘at (So‘zlar)</span>
                  <Tag className="m-0 rounded-full text-xs">{allVocabularies.length}</Tag>
                </span>
              ),
              children: (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-3">
                  {/* Left: Quick Add Form */}
                  <div className="lg:col-span-5 bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0] p-5 space-y-4 self-start">
                    <div className="flex items-center justify-between gap-2">
                      <h2 className="text-base font-bold text-[#0F172A]">Tezkor so‘z qo‘shish</h2>
                      <Button
                        size="small"
                        icon={<FileExcelOutlined />}
                        onClick={() => openImportModal('vocabulary')}
                        className="rounded-lg"
                      >
                        Excel yuklash
                      </Button>
                    </div>

                    <Form<VocabularyFormValues>
                      form={quickVocabForm}
                      layout="vertical"
                      onFinish={handleQuickAddVocab}
                      requiredMark={false}
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Form.Item
                          label="Iyeroglif (Hanzi)"
                          name="hanzi"
                          rules={[{ required: true, message: 'Hanzi kiriting' }]}
                        >
                          <Input placeholder="你好" className="font-hanzi text-lg" />
                        </Form.Item>

                        <Form.Item
                          label="Pinyin"
                          name="pinyin"
                          rules={[{ required: true, message: 'Pinyin kiriting' }]}
                        >
                          <Input placeholder="nǐ hǎo" />
                        </Form.Item>
                      </div>

                      <Form.Item
                        label="Tarjima (O‘zbekcha)"
                        name="translation"
                        rules={[{ required: true, message: 'Tarjimani kiriting' }]}
                      >
                        <Input placeholder="Salom" />
                      </Form.Item>

                      <Form.Item label="Xitoycha misol (ixtiyoriy)" name="exampleCn">
                        <Input placeholder="你好，很高兴认识你。" className="font-hanzi" />
                      </Form.Item>

                      <Form.Item label="Misol tarjimasi (ixtiyoriy)" name="exampleUz">
                        <Input placeholder="Salom, tanishganimdan xursandman." />
                      </Form.Item>

                      <Button
                        type="primary"
                        htmlType="submit"
                        loading={addingVocab}
                        icon={<PlusOutlined />}
                        block
                        className="min-h-[42px] rounded-xl"
                      >
                        Qo‘shish
                      </Button>
                    </Form>
                  </div>

                  {/* Right: Vocabulary Table */}
                  <div className="lg:col-span-7 min-w-0 space-y-3">
                    <h2 className="text-base font-bold text-[#0F172A]">
                      Qo‘shilgan so‘zlar ({allVocabularies.length})
                    </h2>
                    <Table<Vocabulary>
                      rowKey="id"
                      columns={vocabColumns}
                      dataSource={allVocabularies}
                      scroll={{ x: 'max-content' }}
                      pagination={{ pageSize: 12, hideOnSinglePage: true }}
                      locale={{ emptyText: 'Hozircha lug‘at so‘zlari qo‘shilmagan' }}
                    />
                  </div>
                </div>
              ),
            },
            {
              key: 'grammar',
              label: (
                <span className="inline-flex items-center gap-2 font-medium">
                  <FileTextOutlined />
                  <span>Grammatika va O‘qish matni</span>
                </span>
              ),
              children: (
                <div className="max-w-4xl space-y-4 pt-3">
                  <div>
                    <h2 className="text-base font-bold text-[#0F172A]">
                      Dars qoidasi yoki o‘qish matni
                    </h2>
                    <p className="text-xs text-[#475569] mt-0.5">
                      O‘quvchilar dars ichida ko‘radigan grammatika tushuntirishlari va matnni shu
                      yerga yozing
                    </p>
                  </div>

                  <Input.TextArea
                    rows={10}
                    value={grammarContent}
                    onChange={(e) => setGrammarContent(e.target.value)}
                    placeholder="Masalan: “是 (shì)” — bog‘lovchi fe'l bo‘lib, “bo'lmoq / hisoblanmoq” ma'nosini bildiradi..."
                    className="rounded-xl text-base leading-relaxed font-hanzi"
                  />

                  <div className="flex justify-end">
                    <Button
                      type="primary"
                      icon={<SaveOutlined />}
                      loading={savingGrammar}
                      onClick={handleSaveGrammar}
                      className="min-h-[42px] px-6 rounded-xl"
                    >
                      Matnni saqlash
                    </Button>
                  </div>
                </div>
              ),
            },
            {
              key: 'quiz',
              label: (
                <span className="inline-flex items-center gap-2 font-medium">
                  <QuestionCircleOutlined />
                  <span>Test savollari</span>
                  <Tag className="m-0 rounded-full text-xs">{allQuestions.length}</Tag>
                </span>
              ),
              children: (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-3">
                  {/* Left: Quick Quiz Builder */}
                  <div className="lg:col-span-5 bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0] p-5 space-y-4 self-start">
                    <div className="flex items-center justify-between gap-2">
                      <h2 className="text-base font-bold text-[#0F172A]">Tezkor test tuzish</h2>
                      <Button
                        size="small"
                        icon={<FileExcelOutlined />}
                        onClick={() => openImportModal('questions')}
                        className="rounded-lg"
                      >
                        Excel yuklash
                      </Button>
                    </div>

                    <Form<QuickQuestionFormValues>
                      form={quickQuestionForm}
                      layout="vertical"
                      onFinish={handleQuickAddQuestion}
                      initialValues={{
                        type: 'MULTIPLE_CHOICE',
                        correctOptionKey: 'A',
                        correctAnswerText: "To'g'ri",
                        points: 10,
                      }}
                      requiredMark={false}
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Form.Item label="Savol turi" name="type">
                          <Select
                            options={Object.entries(QUESTION_TYPE_LABELS).map(
                              ([value, label]) => ({
                                value,
                                label,
                              })
                            )}
                          />
                        </Form.Item>

                        <Form.Item label="Ball" name="points">
                          <InputNumber min={0} className="w-full" />
                        </Form.Item>
                      </div>

                      <Form.Item
                        label="Savol matni"
                        name="prompt"
                        rules={[{ required: true, message: 'Savol matnini kiriting' }]}
                      >
                        <Input.TextArea
                          rows={2}
                          placeholder="Masalan: “你好” so‘zining tarjimasi nima?"
                          className="font-hanzi"
                        />
                      </Form.Item>

                      {quickQuestionType === 'MULTIPLE_CHOICE' && (
                        <div className="space-y-2 mb-4">
                          <div className="text-xs font-semibold text-[#475569]">
                            Variantlar (to‘g‘ri javobni Radio tugma bilan belgilang):
                          </div>
                          <Form.Item name="correctOptionKey" className="m-0">
                            <Radio.Group className="w-full space-y-2">
                              {(['A', 'B', 'C', 'D'] as const).map((key) => (
                                <div key={key} className="flex items-center gap-2">
                                  <Radio value={key} className="shrink-0 font-bold">
                                    {key}
                                  </Radio>
                                  <Form.Item
                                    name={`option${key}` as keyof QuickQuestionFormValues}
                                    className="flex-1 m-0"
                                    rules={
                                      key === 'A' || key === 'B'
                                        ? [{ required: true, message: `${key} variantini kiriting` }]
                                        : undefined
                                    }
                                  >
                                    <Input placeholder={`${key} varianti`} className="font-hanzi" />
                                  </Form.Item>
                                </div>
                              ))}
                            </Radio.Group>
                          </Form.Item>
                        </div>
                      )}

                      {quickQuestionType === 'TRUE_FALSE' && (
                        <Form.Item
                          label="To‘g‘ri javob"
                          name="correctAnswerText"
                          rules={[{ required: true, message: 'Tanlang' }]}
                        >
                          <Radio.Group className="flex gap-4">
                            <Radio value="To'g'ri">To‘g‘ri</Radio>
                            <Radio value="Noto'g'ri">Noto‘g‘ri</Radio>
                          </Radio.Group>
                        </Form.Item>
                      )}

                      {quickQuestionType !== 'MULTIPLE_CHOICE' &&
                        quickQuestionType !== 'TRUE_FALSE' && (
                          <Form.Item
                            label="To‘g‘ri javob"
                            name="correctAnswerText"
                            rules={[{ required: true, message: 'To‘g‘ri javobni kiriting' }]}
                          >
                            <Input placeholder="To‘g‘ri javob matni" className="font-hanzi" />
                          </Form.Item>
                        )}

                      <Form.Item label="Izoh (ixtiyoriy)" name="explanation">
                        <Input.TextArea rows={2} placeholder="Nima uchun bu javob to‘g‘ri?" />
                      </Form.Item>

                      {/* Optional Audio Upload for Listening Questions */}
                      <div className="mb-4 p-3 rounded-xl bg-white border border-[#E2E8F0] space-y-2">
                        <div className="text-xs font-semibold text-[#475569]">
                          Audio fayl (ixtiyoriy, Tinglash savollari uchun):
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Upload
                            accept=".mp3,.wav,.ogg,.m4a"
                            showUploadList={false}
                            beforeUpload={(file) => {
                              void handleAudioUpload(file);
                              return false;
                            }}
                          >
                            <Button
                              size="small"
                              icon={<SoundOutlined />}
                              loading={uploadingAudio}
                              className="rounded-lg"
                            >
                              Audio yuklash (.mp3/.wav)
                            </Button>
                          </Upload>

                          {quickAudioUrl && (
                            <>
                              <ChineseAudioButton size="small" audioUrl={quickAudioUrl} />
                              <Button
                                size="small"
                                type="text"
                                danger
                                onClick={() => setQuickAudioUrl(null)}
                              >
                                O‘chirish
                              </Button>
                            </>
                          )}
                        </div>
                      </div>

                      <Button
                        type="primary"
                        htmlType="submit"
                        loading={addingQuestion}
                        icon={<PlusOutlined />}
                        block
                        className="min-h-[42px] rounded-xl"
                      >
                        Savol qo‘shish
                      </Button>
                    </Form>
                  </div>

                  {/* Right: Questions Table */}
                  <div className="lg:col-span-7 min-w-0 space-y-3">
                    <h2 className="text-base font-bold text-[#0F172A]">
                      Qo‘shilgan savollar ({allQuestions.length})
                    </h2>
                    <Table<Question>
                      rowKey="id"
                      columns={questionColumns}
                      dataSource={allQuestions}
                      scroll={{ x: 'max-content' }}
                      pagination={{ pageSize: 12, hideOnSinglePage: true }}
                      locale={{ emptyText: 'Hozircha test savollari qo‘shilmagan' }}
                    />
                  </div>
                </div>
              ),
            },
          ]}
        />
      </div>

      {/* Edit Vocabulary Modal */}
      <Modal
        title="So‘zni tahrirlash"
        open={editVocabModalOpen}
        onCancel={() => setEditVocabModalOpen(false)}
        footer={null}
        width="95%"
        style={{ maxWidth: 600 }}
        destroyOnHidden
      >
        <Form<VocabularyFormValues>
          form={editVocabForm}
          layout="vertical"
          onFinish={handleSaveEditVocab}
          className="mt-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Form.Item
              label="Iyeroglif (Hanzi)"
              name="hanzi"
              rules={[{ required: true, message: 'Hanzi kiriting' }]}
            >
              <Input className="font-hanzi text-lg" />
            </Form.Item>
            <Form.Item
              label="Pinyin"
              name="pinyin"
              rules={[{ required: true, message: 'Pinyin kiriting' }]}
            >
              <Input />
            </Form.Item>
          </div>
          <Form.Item
            label="Tarjima (O‘zbekcha)"
            name="translation"
            rules={[{ required: true, message: 'Tarjimani kiriting' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item label="Xitoycha misol gap" name="exampleCn">
            <Input className="font-hanzi" />
          </Form.Item>
          <Form.Item label="Misol tarjimasi" name="exampleUz">
            <Input />
          </Form.Item>
          <div className="flex justify-end gap-3 pt-2">
            <Button
              onClick={() => setEditVocabModalOpen(false)}
              className="min-h-[42px] rounded-xl"
            >
              Bekor qilish
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={savingEditVocab}
              className="min-h-[42px] rounded-xl"
            >
              Saqlash
            </Button>
          </div>
        </Form>
      </Modal>

      {/* Edit Question Modal */}
      <Modal
        title="Savolni tahrirlash"
        open={editQuestionModalOpen}
        onCancel={() => setEditQuestionModalOpen(false)}
        footer={null}
        width="95%"
        style={{ maxWidth: 640 }}
        destroyOnHidden
      >
        <Form<QuickQuestionFormValues>
          form={editQuestionForm}
          layout="vertical"
          onFinish={handleSaveEditQuestion}
          className="mt-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Form.Item label="Savol turi" name="type">
              <Select
                options={Object.entries(QUESTION_TYPE_LABELS).map(([value, label]) => ({
                  value,
                  label,
                }))}
              />
            </Form.Item>
            <Form.Item label="Ball" name="points">
              <InputNumber min={0} className="w-full" />
            </Form.Item>
          </div>

          <Form.Item
            label="Savol matni"
            name="prompt"
            rules={[{ required: true, message: 'Savol matnini kiriting' }]}
          >
            <Input.TextArea rows={2} className="font-hanzi" />
          </Form.Item>

          {editQuestionType === 'MULTIPLE_CHOICE' && (
            <div className="space-y-2 mb-4">
              <div className="text-xs font-semibold text-[#475569]">
                Variantlar (to‘g‘ri javobni Radio tugma bilan belgilang):
              </div>
              <Form.Item name="correctOptionKey" className="m-0">
                <Radio.Group className="w-full space-y-2">
                  {(['A', 'B', 'C', 'D'] as const).map((key) => (
                    <div key={key} className="flex items-center gap-2">
                      <Radio value={key} className="shrink-0 font-bold">
                        {key}
                      </Radio>
                      <Form.Item
                        name={`option${key}` as keyof QuickQuestionFormValues}
                        className="flex-1 m-0"
                      >
                        <Input placeholder={`${key} varianti`} className="font-hanzi" />
                      </Form.Item>
                    </div>
                  ))}
                </Radio.Group>
              </Form.Item>
            </div>
          )}

          {editQuestionType === 'TRUE_FALSE' && (
            <Form.Item label="To‘g‘ri javob" name="correctAnswerText">
              <Radio.Group className="flex gap-4">
                <Radio value="To'g'ri">To‘g‘ri</Radio>
                <Radio value="Noto'g'ri">Noto‘g‘ri</Radio>
              </Radio.Group>
            </Form.Item>
          )}

          {editQuestionType !== 'MULTIPLE_CHOICE' && editQuestionType !== 'TRUE_FALSE' && (
            <Form.Item label="To‘g‘ri javob" name="correctAnswerText">
              <Input className="font-hanzi" />
            </Form.Item>
          )}

          <Form.Item label="Izoh (ixtiyoriy)" name="explanation">
            <Input.TextArea rows={2} />
          </Form.Item>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              onClick={() => setEditQuestionModalOpen(false)}
              className="min-h-[42px] rounded-xl"
            >
              Bekor qilish
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={savingEditQuestion}
              className="min-h-[42px] rounded-xl"
            >
              Saqlash
            </Button>
          </div>
        </Form>
      </Modal>

      {/* Excel / CSV Import Modal with Template Download */}
      <Modal
        title={
          importType === 'vocabulary'
            ? 'Lug‘atni Excel / CSV orqali yuklash'
            : 'Savollarni Excel / CSV orqali yuklash'
        }
        open={importModalOpen}
        onCancel={() => setImportModalOpen(false)}
        footer={null}
        width="95%"
        style={{ maxWidth: 640 }}
        destroyOnHidden
      >
        <div className="space-y-4 mt-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
            <span className="text-xs sm:text-sm text-[#475569]">
              To‘g‘ri formatdagi jadval tayyorlash uchun namunani yuklab oling:
            </span>
            <Button
              icon={<DownloadOutlined />}
              onClick={handleDownloadTemplate}
              className="min-h-[38px] rounded-xl shrink-0"
            >
              {importType === 'vocabulary'
                ? '📥 Lug‘at shablonini yuklab olish (.xlsx)'
                : '📥 Test shablonini yuklab olish (.xlsx)'}
            </Button>
          </div>

          <Alert
            type="info"
            showIcon
            message="Fayl ustunlari bo‘yicha yo‘riqnoma"
            description={
              importType === 'vocabulary' ? (
                <div className="text-xs space-y-1">
                  <p>
                    <strong>Majburiy ustunlar:</strong> <code>hanzi</code>, <code>pinyin</code>,{' '}
                    <code>tarjima</code>
                  </p>
                  <p>
                    <strong>Ixtiyoriy ustun:</strong> <code>misol_gap</code>
                  </p>
                </div>
              ) : (
                <div className="text-xs space-y-1">
                  <p>
                    <strong>Majburiy ustunlar:</strong> <code>savol</code>,{' '}
                    <code>togri_javob</code>
                  </p>
                  <p>
                    <strong>Ixtiyoriy ustunlar:</strong> <code>variant_a</code>,{' '}
                    <code>variant_b</code>, <code>variant_c</code>, <code>variant_d</code>,{' '}
                    <code>tushuntirish</code>
                  </p>
                </div>
              )
            }
          />

          <Upload.Dragger
            accept=".xlsx,.csv"
            maxCount={1}
            fileList={fileList}
            beforeUpload={() => false}
            onChange={({ fileList: nextList }) => setFileList(nextList)}
          >
            <p className="ant-upload-drag-icon">
              <InboxOutlined className="text-[#DC2626]" />
            </p>
            <p className="ant-upload-text text-sm font-medium text-[#0F172A]">
              .xlsx yoki .csv faylni bu yerga tashlang yoki tanlang
            </p>
            <p className="ant-upload-hint text-xs text-[#475569]">
              Maksimal fayl hajmi 10 MB
            </p>
          </Upload.Dragger>

          {importResult && (
            <Alert
              type={importResult.errorCount > 0 ? 'warning' : 'success'}
              showIcon
              message={`Yuklash yakunlandi: ${importResult.insertedCount} ta qo‘shildi, ${importResult.errorCount} ta xato`}
              description={
                importResult.errors.length > 0 && (
                  <ul className="list-disc pl-4 text-xs mt-1 max-h-36 overflow-y-auto">
                    {importResult.errors.map((err, i) => (
                      <li key={i}>
                        <strong>{err.row}-qator:</strong> {err.errors.join('; ')}
                      </li>
                    ))}
                  </ul>
                )
              }
            />
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button onClick={() => setImportModalOpen(false)} className="min-h-[42px] rounded-xl">
              Yopish
            </Button>
            <Button
              type="primary"
              loading={uploading}
              onClick={handleUploadImport}
              icon={<FileExcelOutlined />}
              className="min-h-[42px] rounded-xl"
            >
              Yuklashni boshlash
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
