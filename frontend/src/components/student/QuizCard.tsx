'use client';

import React, { useState } from 'react';
import { App as AntdApp, Button, Input, Tag } from 'antd';
import {
  CheckCircleFilled,
  CloseCircleFilled,
  SendOutlined,
} from '@ant-design/icons';
import { ChineseAudioButton } from '@/components/ChineseAudioButton';
import api from '@/lib/api';
import type { Question, SubmitAttemptResponse } from '@/types';

interface QuizCardProps {
  question: Question;
  index?: number;
  badgeText?: string;
  onSubmitted?: (result: SubmitAttemptResponse) => void;
}

export function QuizCard({ question, index, badgeText, onSubmitted }: QuizCardProps) {
  const { message } = AntdApp.useApp();
  const [answer, setAnswer] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SubmitAttemptResponse | null>(null);

  const options = Array.isArray(question.options) ? question.options : [];
  const hasSelectableOptions =
    options.length > 0 &&
    (question.type === 'MULTIPLE_CHOICE' || question.type === 'TRUE_FALSE');

  async function handleSubmit() {
    if (!answer.trim()) {
      message.warning('Iltimos, avval javobni tanlang yoki kiriting');
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.post<SubmitAttemptResponse>('/api/attempts/submit', {
        questionId: question.id,
        userAnswer: answer.trim(),
      });
      setResult(res.data);
      onSubmitted?.(res.data);
    } catch {
      message.error('Javobni tekshirishda xatolik yuz berdi');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 sm:p-6 space-y-4 shadow-xs">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {index !== undefined && (
            <span className="text-xs font-bold text-[#DC2626] bg-[#FEF2F2] px-2.5 py-1 rounded-lg border border-[#FECACA]">
              {index + 1}-savol
            </span>
          )}
          <span className="text-xs font-medium text-[#475569]">{question.points} ball</span>
        </div>
        {badgeText && (
          <Tag color="warning" className="m-0 rounded-md font-medium">
            {badgeText}
          </Tag>
        )}
      </div>

      {/* Audio / TTS Button */}
      <div>
        <ChineseAudioButton
          size="small"
          audioUrl={question.audioUrl}
          text={question.prompt}
          label={question.audioUrl ? 'Audioni tinglash' : 'O‘qib eshittirish'}
        />
      </div>

      {/* Prompt */}
      <div className="text-base sm:text-lg font-semibold text-[#0F172A] leading-relaxed font-hanzi">
        {question.prompt}
      </div>

      {/* Answer Input / Options */}
      {hasSelectableOptions ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {options.map((opt, idx) => {
            const isSelected = answer === opt;
            const isCorrectOpt = result && opt.trim().toLowerCase() === result.correctAnswer.trim().toLowerCase();
            const isWrongSelected = result && !result.isCorrect && isSelected;

            let btnStyle = 'border-[#E2E8F0] bg-[#F8FAFC] text-[#0F172A] hover:border-[#DC2626]/60';
            if (result) {
              if (isCorrectOpt) {
                btnStyle = 'border-[#16A34A] bg-[#F0FDF4] text-[#15803D] font-semibold';
              } else if (isWrongSelected) {
                btnStyle = 'border-[#DC2626] bg-[#FEF2F2] text-[#B91C1C]';
              }
            } else if (isSelected) {
              btnStyle = 'border-[#DC2626] bg-[#FEF2F2] text-[#DC2626] font-semibold ring-2 ring-[#DC2626]/20';
            }

            return (
              <button
                key={idx}
                type="button"
                disabled={Boolean(result)}
                onClick={() => setAnswer(opt)}
                className={`w-full min-h-[48px] px-4 py-3 rounded-xl border text-left text-sm sm:text-base transition-all flex items-center gap-3 cursor-pointer disabled:cursor-default ${btnStyle}`}
              >
                <span className="w-7 h-7 rounded-lg bg-white border border-[#E2E8F0] flex items-center justify-center text-xs font-bold shrink-0">
                  {String.fromCharCode(65 + idx)}
                </span>
                <span className="font-hanzi">{opt}</span>
              </button>
            );
          })}
        </div>
      ) : (
        <Input
          size="large"
          value={answer}
          disabled={Boolean(result)}
          onChange={(e) => setAnswer(e.target.value)}
          onPressEnter={() => {
            if (!result) void handleSubmit();
          }}
          placeholder="Javobingizni yozing..."
          className="rounded-xl min-h-[46px] font-hanzi text-base"
        />
      )}

      {/* Submit Button */}
      {!result && (
        <div className="flex justify-end pt-1">
          <Button
            type="primary"
            icon={<SendOutlined />}
            loading={submitting}
            onClick={handleSubmit}
            className="min-h-[42px] px-6 rounded-xl w-full sm:w-auto"
          >
            Tekshirish
          </Button>
        </div>
      )}

      {/* Result Feedback */}
      {result && (
        <div
          className={`rounded-2xl p-4 border space-y-2 ${
            result.isCorrect
              ? 'bg-[#F0FDF4] border-[#BBF7D0] text-[#15803D]'
              : 'bg-[#FEF2F2] border-[#FECACA] text-[#B91C1C]'
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 font-bold text-sm sm:text-base">
              {result.isCorrect ? (
                <>
                  <CheckCircleFilled className="text-[#16A34A] text-lg" />
                  <span>To‘g‘ri javob! +{result.score} ball</span>
                </>
              ) : (
                <>
                  <CloseCircleFilled className="text-[#DC2626] text-lg" />
                  <span>Noto‘g‘ri javob</span>
                </>
              )}
            </div>

            {!result.isCorrect && (
              <Tag color="error" className="m-0 rounded-md">
                Xatolarim bankiga qo‘shildi
              </Tag>
            )}
          </div>

          {!result.isCorrect && (
            <div className="text-sm text-[#0F172A]">
              <strong>To‘g‘ri javob:</strong>{' '}
              <span className="font-hanzi font-semibold">{result.correctAnswer}</span>
            </div>
          )}

          {result.explanation && (
            <div className="text-sm text-[#475569]">
              <strong>Izoh:</strong> {result.explanation}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
