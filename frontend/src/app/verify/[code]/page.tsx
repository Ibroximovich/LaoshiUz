'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Button, Spin, Tag } from 'antd';
import {
  CheckCircleFilled,
  CloseCircleFilled,
  HomeOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import api from '@/lib/api';
import type { VerifyCertificateResponse } from '@/types';

export default function PublicVerifyCertificatePage() {
  const params = useParams<{ code: string }>();
  const code = params?.code ?? '';

  const [data, setData] = useState<VerifyCertificateResponse['certificate'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!code) return;
    let active = true;

    async function verify() {
      try {
        const res = await api.get<VerifyCertificateResponse>(
          `/api/certificates/verify/${encodeURIComponent(code)}`
        );
        if (active) setData(res.data.certificate);
      } catch {
        if (active) setNotFound(true);
      } finally {
        if (active) setLoading(false);
      }
    }

    void verify();
    return () => {
      active = false;
    };
  }, [code]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8FAFC] gap-4 p-6">
        <Spin size="large" />
        <p className="text-sm text-[#475569]">Sertifikat haqiqiyligi tekshirilmoqda...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-xl bg-white rounded-3xl border border-[#E2E8F0] shadow-lg p-6 sm:p-10 space-y-6">
        {/* Brand Header */}
        <div className="flex items-center justify-between gap-3 pb-4 border-b border-[#E2E8F0]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#DC2626] text-white flex items-center justify-center text-xl font-bold font-hanzi">
              老
            </div>
            <div>
              <div className="text-base font-bold text-[#0F172A]">LaoshiUz</div>
              <div className="text-xs text-[#475569]">Sertifikat tekshiruv tizimi</div>
            </div>
          </div>

          <SafetyCertificateOutlined className="text-2xl text-[#DC2626]" />
        </div>

        {notFound || !data ? (
          <div className="text-center py-6 space-y-4">
            <CloseCircleFilled className="text-5xl text-[#DC2626]" />
            <h1 className="text-xl font-bold text-[#0F172A]">Sertifikat topilmadi</h1>
            <p className="text-sm text-[#475569]">
              Kiritilgan <strong>{code}</strong> kodi bo‘yicha tizimda sertifikat mavjud emas.
            </p>
            <Link href="/">
              <Button icon={<HomeOutlined />} className="min-h-[42px] rounded-xl">
                Bosh sahifaga o‘tish
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Verified Seal */}
            <div className="p-4 rounded-2xl bg-[#F0FDF4] border border-[#BBF7D0] flex items-center gap-3">
              <CheckCircleFilled className="text-2xl text-[#16A34A] shrink-0" />
              <div>
                <div className="text-sm sm:text-base font-bold text-[#15803D]">
                  Haqiqiy Sertifikat (LaoshiUz tasdiqlagan)
                </div>
                <div className="text-xs text-[#166534]">
                  Kod: <span className="font-mono font-bold">{data.code}</span>
                </div>
              </div>
            </div>

            {/* Details */}
            <div className="space-y-4 bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0] p-5">
              <div>
                <div className="text-xs text-[#475569]">O‘quvchi F.I.Sh.</div>
                <div className="text-xl font-bold text-[#0F172A] mt-0.5">{data.studentName}</div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[#E2E8F0]">
                <div>
                  <div className="text-xs text-[#475569]">Imtihon</div>
                  <div className="text-sm font-semibold text-[#0F172A] mt-0.5">
                    {data.examTitle}
                  </div>
                </div>

                <div>
                  <div className="text-xs text-[#475569]">HSK Darajasi</div>
                  <div className="mt-1">
                    <Tag color="red" className="m-0 rounded-md font-bold">
                      HSK {data.hskLevel}
                    </Tag>
                  </div>
                </div>

                <div>
                  <div className="text-xs text-[#475569]">To‘plangan natija</div>
                  <div className="text-lg font-bold text-[#16A34A] mt-0.5">
                    {data.scorePercent}%
                  </div>
                </div>

                <div>
                  <div className="text-xs text-[#475569]">Berilgan sana</div>
                  <div className="text-sm font-semibold text-[#0F172A] mt-0.5">
                    {new Date(data.issuedAt).toLocaleDateString('uz-UZ')}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-center">
              <Link href="/">
                <Button icon={<HomeOutlined />} className="min-h-[42px] rounded-xl">
                  LaoshiUz platformasiga o‘tish
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
