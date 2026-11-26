'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { App as AntdApp, Button, Empty, Spin } from 'antd';
import { BookOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { QuizCard } from '@/components/student/QuizCard';
import api from '@/lib/api';
import type { ReviewQueueItem } from '@/types';

export default function StudentMistakesPage() {
  const { message } = AntdApp.useApp();
  const [items, setItems] = useState<ReviewQueueItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function loadReviewQueue() {
      try {
        const res = await api.get<{ reviewQueue: ReviewQueueItem[] }>(
          '/api/attempts/review-queue'
        );
        if (active) setItems(res.data.reviewQueue);
      } catch {
        if (active) message.error('Xatolar bankini yuklashda xatolik yuz berdi');
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadReviewQueue();
    return () => {
      active = false;
    };
  }, [message]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex justify-center items-center">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-[#0F172A]">Xatolarim banki</h1>
        <p className="text-sm text-[#475569] mt-1">
          Avval xato qilingan savollarni qayta ishlang — to‘g‘ri javob bersangiz ro‘yxatdan chiqariladi
        </p>
      </div>

      {items.length === 0 ? (
        <div className="bg-white rounded-3xl border border-[#E2E8F0] p-10 sm:p-14 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-[#F0FDF4] text-[#16A34A] flex items-center justify-center text-2xl mx-auto">
            <CheckCircleOutlined />
          </div>
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <span className="text-base font-medium text-[#0F172A]">
                Ajoyib! Sizda tuzatilmagan xatolar yo‘q
              </span>
            }
          />
          <Link href="/dashboard">
            <Button type="primary" icon={<BookOutlined />} className="min-h-[42px] rounded-xl">
              Darslarga qaytish
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item, idx) => (
            <QuizCard
              key={item.id}
              question={item.question}
              index={idx}
              badgeText={`${item.wrongCount} marta xato`}
              onSubmitted={(res) => {
                if (res.isCorrect) {
                  message.success('Xato tuzatildi!');
                  setTimeout(() => {
                    setItems((prev) => prev.filter((x) => x.id !== item.id));
                  }, 1200);
                }
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
