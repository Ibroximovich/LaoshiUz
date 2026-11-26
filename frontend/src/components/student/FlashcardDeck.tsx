'use client';

import React, { useState } from 'react';
import { Button, Empty, Progress } from 'antd';
import { LeftOutlined, ReloadOutlined, RightOutlined } from '@ant-design/icons';
import { ChineseAudioButton } from '@/components/ChineseAudioButton';
import type { Vocabulary } from '@/types';

interface FlashcardDeckProps {
  vocabularies: Vocabulary[];
}

export function FlashcardDeck({ vocabularies }: FlashcardDeckProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  if (vocabularies.length === 0) {
    return <Empty description="Bu bo‘limda hali lug‘at so‘zlari yo‘q" className="py-10" />;
  }

  const safeIndex = Math.min(currentIndex, vocabularies.length - 1);
  const current = vocabularies[safeIndex]!;
  const progressPercent = Math.round(((safeIndex + 1) / vocabularies.length) * 100);

  function goPrev() {
    setFlipped(false);
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  }

  function goNext() {
    setFlipped(false);
    setCurrentIndex((prev) => Math.min(vocabularies.length - 1, prev + 1));
  }

  return (
    <div className="max-w-xl mx-auto space-y-5">
      {/* Progress */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs font-medium text-[#475569]">
          <span>
            Karta {safeIndex + 1} / {vocabularies.length}
          </span>
          <span>{progressPercent}%</span>
        </div>
        <Progress percent={progressPercent} showInfo={false} strokeColor="#DC2626" size="small" />
      </div>

      {/* Flip Card */}
      <div
        onClick={() => setFlipped((prev) => !prev)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setFlipped((prev) => !prev);
          }
        }}
        className="cursor-pointer select-none min-h-[280px] sm:min-h-[320px] bg-white rounded-3xl border-2 border-[#E2E8F0] hover:border-[#DC2626]/50 shadow-sm p-6 sm:p-8 flex flex-col items-center justify-center text-center transition-all duration-300"
      >
        {!flipped ? (
          <div className="space-y-4 flex flex-col items-center">
            <div className="font-hanzi text-5xl sm:text-6xl font-medium text-[#0F172A] tracking-wide">
              {current.hanzi}
            </div>
            <ChineseAudioButton text={current.hanzi} audioUrl={current.audioUrl} />
            <div className="inline-flex items-center gap-1.5 text-xs font-medium text-[#475569] bg-[#F8FAFC] px-3 py-1.5 rounded-full border border-[#E2E8F0]">
              <ReloadOutlined />
              <span>Tarjimasini ko‘rish uchun bosing</span>
            </div>
          </div>
        ) : (
          <div className="space-y-4 w-full flex flex-col items-center">
            <div className="flex items-center gap-3">
              <span className="font-hanzi text-3xl font-medium text-[#0F172A]">
                {current.hanzi}
              </span>
              <ChineseAudioButton
                size="small"
                text={current.hanzi}
                audioUrl={current.audioUrl}
              />
            </div>
            <div className="inline-block text-lg font-bold text-[#DC2626] bg-[#FEF2F2] px-4 py-1 rounded-xl border border-[#FECACA]">
              {current.pinyin}
            </div>
            <div className="text-xl font-bold text-[#0F172A]">{current.translation}</div>

            {(current.exampleCn || current.exampleUz) && (
              <div className="pt-4 mt-2 border-t border-[#E2E8F0] space-y-1 text-sm">
                {current.exampleCn && (
                  <div className="font-hanzi text-base text-[#0F172A]">{current.exampleCn}</div>
                )}
                {current.exampleUz && (
                  <div className="text-[#475569]">{current.exampleUz}</div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="grid grid-cols-2 gap-3">
        <Button
          icon={<LeftOutlined />}
          onClick={goPrev}
          disabled={safeIndex === 0}
          className="min-h-[46px] rounded-xl font-semibold"
        >
          Oldingi
        </Button>
        <Button
          type="primary"
          onClick={goNext}
          disabled={safeIndex === vocabularies.length - 1}
          className="min-h-[46px] rounded-xl font-semibold"
        >
          <span>Keyingi</span>
          <RightOutlined />
        </Button>
      </div>
    </div>
  );
}
