'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { App as AntdApp, Button, Empty, Input, Spin, Tag } from 'antd';
import {
  ArrowLeftOutlined,
  CheckCircleFilled,
  ClockCircleOutlined,
  CloseCircleFilled,
  SafetyCertificateOutlined,
  SendOutlined,
} from '@ant-design/icons';
import { ChineseAudioButton } from '@/components/ChineseAudioButton';
import api from '@/lib/api';
import type { StartExamResponse, SubmitExamResponse } from '@/types';

function formatSeconds(totalSeconds: number): string {
  const safe = Math.max(0, totalSeconds);
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export default function StudentTakeExamPage() {
  const params = useParams<{ examId: string }>();
  const examId = params?.examId ?? '';
  const { message } = AntdApp.useApp();

  const [session, setSession] = useState<StartExamResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [secondsLeft, setSecondsLeft] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SubmitExamResponse | null>(null);

  const submittedRef = useRef(false);
  const answersRef = useRef<Record<string, string>>({});

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  const submitExam = useCallback(
    async (attemptId: string) => {
      if (submittedRef.current) return;
      submittedRef.current = true;
      setSubmitting(true);
      try {
        const res = await api.post<SubmitExamResponse>(`/api/exams/${examId}/submit`, {
          attemptId,
          answers: answersRef.current,
        });
        setResult(res.data);
        message.success('Imtihon yakunlandi!');
      } catch {
        submittedRef.current = false;
        message.error('Imtihonni topshirishda xatolik yuz berdi');
      } finally {
        setSubmitting(false);
      }
    },
    [examId, message]
  );

  useEffect(() => {
    if (!examId) return;
    let active = true;

    async function startExam() {
      try {
        const res = await api.post<StartExamResponse>(`/api/exams/${examId}/start`);
        if (!active) return;
        setSession(res.data);
        setSecondsLeft(res.data.durationMinutes * 60);
      } catch {
        if (active) message.error('Imtihonni boshlashda xatolik yuz berdi');
      } finally {
        if (active) setLoading(false);
      }
    }

    void startExam();
    return () => {
      active = false;
    };
  }, [examId, message]);

  useEffect(() => {
    if (!session || result) return;

    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          if (!submittedRef.current) {
            void submitExam(session.attemptId);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [session, result, submitExam]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col justify-center items-center gap-3">
        <Spin size="large" />
        <p className="text-sm text-[#475569]">Imtihon tayyorlanmoqda...</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-10 text-center space-y-4">
        <Empty description="Imtihon topilmadi" />
        <Link href="/exams">
          <Button icon={<ArrowLeftOutlined />} className="min-h-[42px] rounded-xl">
            Imtihonlarga qaytish
          </Button>
        </Link>
      </div>
    );
  }

  // Result Screen
  if (result) {
    return (
      <div className="max-w-xl mx-auto bg-white rounded-3xl border border-[#E2E8F0] p-6 sm:p-10 text-center space-y-6 shadow-sm">
        <div
          className={`w-16 h-16 rounded-2xl mx-auto flex items-center justify-center text-3xl ${
            result.passed
              ? 'bg-[#F0FDF4] text-[#16A34A]'
              : 'bg-[#FEF2F2] text-[#DC2626]'
          }`}
        >
          {result.passed ? <CheckCircleFilled /> : <CloseCircleFilled />}
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-[#0F172A]">
            {result.passed ? 'Tabriklaymiz! Imtihondan o‘tdingiz' : 'Afsuski, o‘ta olmadingiz'}
          </h1>
          <p className="text-sm text-[#475569]">{session.exam.title}</p>
        </div>

        <div className="grid grid-cols-3 gap-3 bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0] p-4">
          <div>
            <div className="text-xs text-[#475569]">Ball</div>
            <div className="text-xl font-bold text-[#0F172A]">
              {result.score} / {result.maxScore}
            </div>
          </div>
          <div>
            <div className="text-xs text-[#475569]">Natija</div>
            <div
              className={`text-xl font-bold ${
                result.passed ? 'text-[#16A34A]' : 'text-[#DC2626]'
              }`}
            >
              {result.scorePercent}%
            </div>
          </div>
          <div>
            <div className="text-xs text-[#475569]">O‘tish bali</div>
            <div className="text-xl font-bold text-[#0F172A]">{result.passingScore}%</div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          {result.passed && (
            <Link href="/certificates">
              <Button
                type="primary"
                icon={<SafetyCertificateOutlined />}
                className="min-h-[44px] px-6 rounded-xl w-full sm:w-auto"
              >
                Sertifikatni ko‘rish
              </Button>
            </Link>
          )}
          <Link href="/exams">
            <Button className="min-h-[44px] px-6 rounded-xl w-full sm:w-auto">
              Imtihonlarga qaytish
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const isUrgent = secondsLeft <= 60;
  const answeredCount = session.questions.filter((q) => Boolean(answers[q.id]?.trim())).length;

  return (
    <div className="space-y-6">
      {/* Sticky Timer Bar */}
      <div className="sticky top-16 z-20 bg-white/95 backdrop-blur-sm rounded-2xl border border-[#E2E8F0] p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-medium text-[#475569]">
            {answeredCount} / {session.questions.length} ta savol belgilandi
          </div>
          <h1 className="text-base sm:text-lg font-bold text-[#0F172A] truncate">
            {session.exam.title}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <div
            className={`px-3.5 py-2 rounded-xl font-mono text-base sm:text-lg font-bold inline-flex items-center gap-2 border ${
              isUrgent
                ? 'bg-[#FEF2F2] text-[#DC2626] border-[#FECACA] animate-pulse'
                : 'bg-[#F8FAFC] text-[#0F172A] border-[#E2E8F0]'
            }`}
          >
            <ClockCircleOutlined />
            <span>{formatSeconds(secondsLeft)}</span>
          </div>

          <Button
            type="primary"
            icon={<SendOutlined />}
            loading={submitting}
            onClick={() => void submitExam(session.attemptId)}
            className="min-h-[42px] rounded-xl"
          >
            Imtihonni yakunlash
          </Button>
        </div>
      </div>

      {/* Question Number Quick Navigation */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 flex flex-wrap gap-2">
        {session.questions.map((q, idx) => {
          const isAnswered = Boolean(answers[q.id]?.trim());
          return (
            <a
              key={q.id}
              href={`#exam-q-${idx + 1}`}
              className={`w-9 h-9 rounded-xl border text-xs font-bold flex items-center justify-center transition-colors ${
                isAnswered
                  ? 'bg-[#DC2626] text-white border-[#DC2626]'
                  : 'bg-[#F8FAFC] text-[#475569] border-[#E2E8F0] hover:border-[#DC2626]/50'
              }`}
            >
              {idx + 1}
            </a>
          );
        })}
      </div>

      {/* Questions List */}
      <div className="space-y-4">
        {session.questions.map((q, idx) => {
          const opts = Array.isArray(q.options) ? q.options : [];
          const hasOptions =
            opts.length > 0 && (q.type === 'MULTIPLE_CHOICE' || q.type === 'TRUE_FALSE');

          return (
            <div
              key={q.id}
              id={`exam-q-${idx + 1}`}
              className="bg-white rounded-2xl border border-[#E2E8F0] p-5 sm:p-6 space-y-4 scroll-mt-36"
            >
              <div className="flex items-center justify-between gap-2">
                <Tag color="red" className="m-0 rounded-md font-bold">
                  {idx + 1}-savol
                </Tag>
                <span className="text-xs font-medium text-[#475569]">{q.points} ball</span>
              </div>

              <ChineseAudioButton
                size="small"
                audioUrl={q.audioUrl}
                text={q.prompt}
                label={q.audioUrl ? 'Audioni tinglash' : 'O‘qib eshittirish'}
              />

              <div className="text-base sm:text-lg font-semibold text-[#0F172A] font-hanzi">
                {q.prompt}
              </div>

              {hasOptions ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {opts.map((opt, optIdx) => {
                    const selected = answers[q.id] === opt;
                    return (
                      <button
                        key={optIdx}
                        type="button"
                        onClick={() =>
                          setAnswers((prev) => ({
                            ...prev,
                            [q.id]: opt,
                          }))
                        }
                        className={`cursor-pointer w-full min-h-[48px] px-4 py-3 rounded-xl border text-left text-sm sm:text-base transition-all flex items-center gap-3 ${
                          selected
                            ? 'border-[#DC2626] bg-[#FEF2F2] text-[#DC2626] font-semibold ring-2 ring-[#DC2626]/20'
                            : 'border-[#E2E8F0] bg-[#F8FAFC] text-[#0F172A] hover:border-[#DC2626]/50'
                        }`}
                      >
                        <span className="w-7 h-7 rounded-lg bg-white border border-[#E2E8F0] flex items-center justify-center text-xs font-bold shrink-0">
                          {String.fromCharCode(65 + optIdx)}
                        </span>
                        <span className="font-hanzi">{opt}</span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <Input
                  size="large"
                  value={answers[q.id] ?? ''}
                  onChange={(e) =>
                    setAnswers((prev) => ({
                      ...prev,
                      [q.id]: e.target.value,
                    }))
                  }
                  placeholder="Javobingizni yozing..."
                  className="rounded-xl min-h-[46px] font-hanzi"
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
