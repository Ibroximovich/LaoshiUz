'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { App as AntdApp, Button, Empty, Spin, Tag } from 'antd';
import {
  ClockCircleOutlined,
  PlayCircleOutlined,
  QuestionCircleOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import api from '@/lib/api';
import type { Exam } from '@/types';

export default function StudentExamsPage() {
  const { message } = AntdApp.useApp();
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function loadExams() {
      try {
        const res = await api.get<{ exams: Exam[] }>('/api/exams');
        if (active) setExams(res.data.exams);
      } catch {
        if (active) message.error('Imtihonlarni yuklashda xatolik yuz berdi');
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadExams();
    return () => {
      active = false;
    };
  }, [message]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#0F172A]">HSK Sinov Imtihonlari</h1>
          <p className="text-sm text-[#475569] mt-1">
            Vaqt chegarali sinov imtihonini topshiring va QR-kodli sertifikatni qo‘lga kiriting
          </p>
        </div>

        <Link href="/certificates">
          <Button
            icon={<SafetyCertificateOutlined />}
            className="min-h-[42px] rounded-xl self-start sm:self-auto"
          >
            Sertifikatlarim
          </Button>
        </Link>
      </div>

      {/* Exams Grid */}
      {loading ? (
        <div className="py-12 flex justify-center">
          <Spin size="large" />
        </div>
      ) : exams.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-10">
          <Empty description="Hozircha ochiq HSK imtihonlari mavjud emas" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {exams.map((exam) => (
            <div
              key={exam.id}
              className="bg-white rounded-2xl border border-[#E2E8F0] p-5 sm:p-6 flex flex-col justify-between gap-5 hover:border-[#DC2626]/40 transition-colors"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  {exam.course && (
                    <Tag color="red" className="m-0 rounded-md font-bold">
                      HSK {exam.course.level}
                    </Tag>
                  )}
                  <Tag color="blue" className="m-0 rounded-md">
                    O‘tish: {exam.passingScore}%
                  </Tag>
                </div>

                <h2 className="text-lg font-bold text-[#0F172A]">{exam.title}</h2>

                <div className="flex flex-wrap gap-4 text-xs font-medium text-[#475569]">
                  <span className="inline-flex items-center gap-1.5">
                    <ClockCircleOutlined className="text-[#DC2626]" />
                    {exam.durationMinutes} daqiqa
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <QuestionCircleOutlined className="text-[#DC2626]" />
                    {exam._count?.examQuestions ?? 0} ta savol
                  </span>
                </div>
              </div>

              <Link href={`/exams/${exam.id}`}>
                <Button
                  type="primary"
                  icon={<PlayCircleOutlined />}
                  block
                  className="min-h-[44px] rounded-xl font-semibold"
                >
                  Imtihonni boshlash
                </Button>
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
