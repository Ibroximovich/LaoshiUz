'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button, Empty, Progress, Tag } from 'antd';
import {
  CheckCircleFilled,
  LeftOutlined,
  PlayCircleOutlined,
  ReloadOutlined,
  RightOutlined,
} from '@ant-design/icons';
import HanziWriter from 'hanzi-writer';
import { ChineseAudioButton } from '@/components/ChineseAudioButton';
import type { Vocabulary } from '@/types';

interface HanziDictationProps {
  vocabularies: Vocabulary[];
}

export function HanziDictation({ vocabularies }: HanziDictationProps) {
  const [wordIndex, setWordIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [statusText, setStatusText] = useState<string>('Chiziqlarni tartib bilan chizing');
  const [completed, setCompleted] = useState(false);
  const [mistakesCount, setMistakesCount] = useState(0);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const writerRef = useRef<HanziWriter | null>(null);

  const safeWordIndex = Math.min(wordIndex, Math.max(0, vocabularies.length - 1));
  const currentWord = vocabularies[safeWordIndex];

  const characters = useMemo(() => {
    if (!currentWord) return [];
    const chars = Array.from(currentWord.hanzi).filter((ch) => /[\u4e00-\u9fff]/.test(ch));
    return chars.length > 0 ? chars : Array.from(currentWord.hanzi).slice(0, 1);
  }, [currentWord]);

  const safeCharIndex = Math.min(charIndex, Math.max(0, characters.length - 1));
  const activeChar = characters[safeCharIndex] ?? '';

  const startQuiz = useCallback((writer: HanziWriter) => {
    setCompleted(false);
    setMistakesCount(0);
    setStatusText('Chiziqlarni tartib bilan chizing');
    void writer.quiz({
      onMistake: () => {
        setMistakesCount((m) => m + 1);
        setStatusText('Chiziq yo‘nalishi xato, qayta urinib ko‘ring');
      },
      onCorrectStroke: () => {
        setStatusText('To‘g‘ri! Davom eting...');
      },
      onComplete: () => {
        setCompleted(true);
        setStatusText('Ajoyib! Iyeroglif to‘liq va to‘g‘ri yozildi!');
      },
    });
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !activeChar) return;

    el.innerHTML = '';
    const writer = HanziWriter.create(el, activeChar, {
      width: 240,
      height: 240,
      padding: 14,
      showOutline: true,
      showCharacter: false,
      strokeColor: '#0F172A',
      highlightColor: '#DC2626',
      drawingColor: '#DC2626',
      outlineColor: '#CBD5E1',
      drawingWidth: 20,
      strokeAnimationSpeed: 1,
      delayBetweenStrokes: 200,
    });

    writerRef.current = writer;
    startQuiz(writer);

    return () => {
      el.innerHTML = '';
      writerRef.current = null;
    };
  }, [activeChar, startQuiz]);

  if (vocabularies.length === 0) {
    return (
      <Empty description="Diktant mashqi uchun darsda lug‘at so‘zlari bo‘lishi kerak" className="py-10" />
    );
  }

  function handleAnimate() {
    if (!writerRef.current) return;
    setStatusText('Chiziqlar tartibi ko‘rsatilmoqda...');
    void writerRef.current.animateCharacter({
      onComplete: () => {
        if (writerRef.current) {
          startQuiz(writerRef.current);
        }
      },
    });
  }

  function handleRetry() {
    if (!writerRef.current) return;
    startQuiz(writerRef.current);
  }

  function handleSelectWord(nextIdx: number) {
    setWordIndex(nextIdx);
    setCharIndex(0);
  }

  const progressPercent = Math.round(((safeWordIndex + 1) / vocabularies.length) * 100);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Progress */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs font-medium text-[#475569]">
          <span>
            So‘z {safeWordIndex + 1} / {vocabularies.length}
          </span>
          <span>{progressPercent}%</span>
        </div>
        <Progress percent={progressPercent} showInfo={false} strokeColor="#DC2626" size="small" />
      </div>

      {/* Word Info */}
      {currentWord && (
        <div className="bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0] p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <span className="text-lg font-bold text-[#DC2626]">{currentWord.pinyin}</span>
              <span className="text-base font-semibold text-[#0F172A]">
                — {currentWord.translation}
              </span>
            </div>
            {characters.length > 1 && (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-xs text-[#475569]">Iyeroglifni tanlang:</span>
                {characters.map((ch, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setCharIndex(idx)}
                    className={`cursor-pointer w-9 h-9 rounded-xl border font-hanzi text-lg font-medium transition-all ${
                      idx === safeCharIndex
                        ? 'bg-[#DC2626] text-white border-[#DC2626]'
                        : 'bg-white text-[#0F172A] border-[#E2E8F0] hover:border-[#DC2626]/50'
                    }`}
                  >
                    {ch}
                  </button>
                ))}
              </div>
            )}
          </div>

          <ChineseAudioButton text={currentWord.hanzi} audioUrl={currentWord.audioUrl} />
        </div>
      )}

      {/* Drawing Canvas */}
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-[244px] h-[244px] rounded-2xl border-2 border-[#E2E8F0] bg-white shadow-sm overflow-hidden flex items-center justify-center">
          {/* Tianzige grid lines */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            viewBox="0 0 240 240"
          >
            <line
              x1="120"
              y1="0"
              x2="120"
              y2="240"
              stroke="#E2E8F0"
              strokeDasharray="6 6"
              strokeWidth="1.5"
            />
            <line
              x1="0"
              y1="120"
              x2="240"
              y2="120"
              stroke="#E2E8F0"
              strokeDasharray="6 6"
              strokeWidth="1.5"
            />
            <line
              x1="0"
              y1="0"
              x2="240"
              y2="240"
              stroke="#F1F5F9"
              strokeDasharray="4 4"
              strokeWidth="1"
            />
            <line
              x1="240"
              y1="0"
              x2="0"
              y2="240"
              stroke="#F1F5F9"
              strokeDasharray="4 4"
              strokeWidth="1"
            />
          </svg>
          <div ref={containerRef} className="relative z-10 touch-none" />
        </div>

        {/* Status Feedback */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Tag
            color={completed ? 'success' : mistakesCount > 0 ? 'warning' : 'default'}
            className="m-0 px-3 py-1 rounded-lg text-xs sm:text-sm font-medium inline-flex items-center gap-1.5"
          >
            {completed && <CheckCircleFilled />}
            <span>{statusText}</span>
          </Tag>
          {mistakesCount > 0 && (
            <Tag color="error" className="m-0 px-2.5 py-1 rounded-lg text-xs">
              Xatolar: {mistakesCount}
            </Tag>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 w-full">
          <Button
            icon={<PlayCircleOutlined />}
            onClick={handleAnimate}
            className="min-h-[42px] rounded-xl"
          >
            Chiziqlarni ko‘rsatish (Animatsiya)
          </Button>
          <Button
            icon={<ReloadOutlined />}
            onClick={handleRetry}
            className="min-h-[42px] rounded-xl"
          >
            Qayta urinish
          </Button>
        </div>
      </div>

      {/* Word Navigation */}
      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[#E2E8F0]">
        <Button
          icon={<LeftOutlined />}
          disabled={safeWordIndex === 0}
          onClick={() => handleSelectWord(safeWordIndex - 1)}
          className="min-h-[44px] rounded-xl font-semibold"
        >
          Oldingi so‘z
        </Button>
        <Button
          type="primary"
          disabled={safeWordIndex === vocabularies.length - 1}
          onClick={() => handleSelectWord(safeWordIndex + 1)}
          className="min-h-[44px] rounded-xl font-semibold"
        >
          <span>Keyingi so‘z</span>
          <RightOutlined />
        </Button>
      </div>
    </div>
  );
}
