'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  App as AntdApp,
  Button,
  Empty,
  Segmented,
  Spin,
  Table,
  Tabs,
  Tag,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  AppstoreOutlined,
  ArrowLeftOutlined,
  EditOutlined,
  TrophyOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons';
import { HanziDictation } from '@/components/HanziDictation';
import { FlashcardDeck } from '@/components/student/FlashcardDeck';
import { QuizCard } from '@/components/student/QuizCard';
import api from '@/lib/api';
import type {
  Lesson,
  SectionType,
  SubmitAttemptResponse,
  Vocabulary,
} from '@/types';

const SECTION_LABELS: Record<SectionType, string> = {
  VOCABULARY: 'Lug‘at',
  GRAMMAR: 'Grammatika',
  READING: 'O‘qish',
  LISTENING: 'Tinglash',
  WRITING: 'Yozish',
  SPEAKING: 'Gapirish',
};

export default function StudentLessonPage() {
  const params = useParams<{ lessonId: string }>();
  const lessonId = params?.lessonId ?? '';
  const { message } = AntdApp.useApp();

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [vocabMode, setVocabMode] = useState<'cards' | 'table'>('cards');
  const [resultsByQuestion, setResultsByQuestion] = useState<
    Record<string, SubmitAttemptResponse>
  >({});

  useEffect(() => {
    if (!lessonId) return;
    let active = true;
    async function loadLesson() {
      try {
        const res = await api.get<{ lesson: Lesson }>(`/api/lessons/${lessonId}`);
        if (active) setLesson(res.data.lesson);
      } catch {
        if (active) message.error('Darsni yuklashda xatolik yuz berdi');
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadLesson();
    return () => {
      active = false;
    };
  }, [lessonId, message]);

  const totalQuestions = useMemo(() => {
    if (!lesson?.sections) return 0;
    return lesson.sections.reduce((acc, sec) => acc + (sec.questions?.length ?? 0), 0);
  }, [lesson]);

  const answeredValues = Object.values(resultsByQuestion);
  const answeredCount = answeredValues.length;
  const correctCount = answeredValues.filter((r) => r.isCorrect).length;
  const earnedScore = answeredValues.reduce((sum, r) => sum + r.score, 0);

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
      title: 'Misol',
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
  ];

  if (loading) {
    return (
      <div className="min-h-[60vh] flex justify-center items-center">
        <Spin size="large" />
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-10 text-center space-y-4">
        <Empty description="Dars topilmadi" />
        <Link href="/dashboard">
          <Button icon={<ArrowLeftOutlined />} className="min-h-[42px] rounded-xl">
            Darslarga qaytish
          </Button>
        </Link>
      </div>
    );
  }

  const sections = lesson.sections ?? [];
  const allVocabularies = sections.flatMap((s) => s.vocabularies ?? []);

  return (
    <div className="space-y-6">
      {/* Lesson Header */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 sm:p-6 space-y-3">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[#475569] hover:text-[#DC2626] transition-colors"
        >
          <ArrowLeftOutlined />
          <span>Barcha darslarga qaytish</span>
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

      {/* Sections Tabs */}
      {sections.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-10">
          <Empty description="Bu darsda hali bo‘limlar mavjud emas" />
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 sm:p-6">
          <Tabs
            items={[
              ...sections.map((sec) => ({
                key: sec.id,
                label: (
                  <span className="inline-flex items-center gap-2 font-medium">
                    <Tag color="default" className="m-0 rounded-md text-xs">
                      {SECTION_LABELS[sec.type] ?? sec.type}
                    </Tag>
                    <span>{sec.title}</span>
                  </span>
                ),
                children: (
                  <div className="space-y-6 pt-2">
                    {/* Content Card for Grammar/Reading/etc. */}
                    {sec.content && (
                      <div className="rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] p-5 sm:p-6 space-y-2">
                        <h2 className="text-base font-bold text-[#0F172A]">{sec.title}</h2>
                        <p className="text-sm sm:text-base text-[#0F172A] leading-relaxed whitespace-pre-line font-hanzi">
                          {sec.content}
                        </p>
                      </div>
                    )}

                    {/* Vocabulary Flashcards / Table */}
                    {sec.type === 'VOCABULARY' && (
                      <div className="space-y-5">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <h3 className="text-base font-bold text-[#0F172A]">
                            Yangi so‘zlar ({sec.vocabularies?.length ?? 0})
                          </h3>
                          <Segmented
                            value={vocabMode}
                            onChange={(val) => setVocabMode(val as 'cards' | 'table')}
                            options={[
                              {
                                value: 'cards',
                                label: (
                                  <span className="inline-flex items-center gap-1.5">
                                    <AppstoreOutlined />
                                    Kartochkalar
                                  </span>
                                ),
                              },
                              {
                                value: 'table',
                                label: (
                                  <span className="inline-flex items-center gap-1.5">
                                    <UnorderedListOutlined />
                                    Ro‘yxat
                                  </span>
                                ),
                              },
                            ]}
                          />
                        </div>

                        {vocabMode === 'cards' ? (
                          <FlashcardDeck vocabularies={sec.vocabularies ?? []} />
                        ) : (
                          <Table<Vocabulary>
                            rowKey="id"
                            columns={vocabColumns}
                            dataSource={sec.vocabularies ?? []}
                            scroll={{ x: 'max-content' }}
                            pagination={{ pageSize: 15, hideOnSinglePage: true }}
                            locale={{ emptyText: 'Lug‘at so‘zlari mavjud emas' }}
                          />
                        )}
                      </div>
                    )}

                    {/* Interactive Questions */}
                    {(sec.questions?.length ?? 0) > 0 && (
                      <div className="space-y-4">
                        <h3 className="text-base font-bold text-[#0F172A]">
                          Mashq va testlar ({sec.questions!.length})
                        </h3>
                        <div className="space-y-4">
                          {sec.questions!.map((q, idx) => (
                            <QuizCard
                              key={q.id}
                              question={q}
                              index={idx}
                              onSubmitted={(res) => {
                                setResultsByQuestion((prev) => ({
                                  ...prev,
                                  [q.id]: res,
                                }));
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ),
              })),
              {
                key: 'dictation',
                label: (
                  <span className="inline-flex items-center gap-2 font-medium">
                    <EditOutlined />
                    <span>Yozish (Diktant)</span>
                  </span>
                ),
                children: (
                  <div className="pt-4">
                    <HanziDictation vocabularies={allVocabularies} />
                  </div>
                ),
              },
            ]}
          />
        </div>
      )}

      {/* Lesson Summary */}
      {totalQuestions > 0 && answeredCount > 0 && (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#FEF2F2] text-[#DC2626] flex items-center justify-center text-xl">
              <TrophyOutlined />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#0F172A]">Dars natijasi xulosasi</h3>
              <p className="text-sm text-[#475569]">
                {answeredCount} / {totalQuestions} ta savol yechildi • {correctCount} ta to‘g‘ri
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-4 py-2 rounded-xl bg-[#F0FDF4] border border-[#BBF7D0] text-[#15803D] font-bold text-sm">
              +{earnedScore} ball
            </div>
            <Link href="/dashboard">
              <Button type="primary" className="min-h-[42px] rounded-xl">
                Darslarga qaytish
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
