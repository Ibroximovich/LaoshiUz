'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { App as AntdApp, Button, Empty, Spin, Tag } from 'antd';
import {
  FileDoneOutlined,
  PrinterOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import type { Certificate } from '@/types';

export default function StudentCertificatesPage() {
  const { user } = useAuth();
  const { message } = AntdApp.useApp();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [origin, setOrigin] = useState('');

  useEffect(() => {
    let active = true;
    async function loadCertificates() {
      try {
        const res = await api.get<{ certificates: Certificate[] }>('/api/certificates/my');
        if (active) {
          setOrigin(window.location.origin);
          setCertificates(res.data.certificates);
        }
      } catch {
        if (active) message.error('Sertifikatlarni yuklashda xatolik yuz berdi');
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadCertificates();
    return () => {
      active = false;
    };
  }, [message]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#0F172A]">Sertifikatlarim</h1>
          <p className="text-sm text-[#475569] mt-1">
            Muvaffaqiyatli topshirilgan HSK imtihonlari bo‘yicha rasmiy QR-kodli sertifikatlar
          </p>
        </div>

        {certificates.length > 0 && (
          <Button
            type="primary"
            icon={<PrinterOutlined />}
            onClick={() => window.print()}
            className="min-h-[42px] rounded-xl self-start sm:self-auto"
          >
            Chop etish / PDF saqlash
          </Button>
        )}
      </div>

      {loading ? (
        <div className="py-12 flex justify-center">
          <Spin size="large" />
        </div>
      ) : certificates.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-10 text-center space-y-4">
          <Empty description="Sizda hali sertifikatlar mavjud emas" />
          <Link href="/exams">
            <Button
              type="primary"
              icon={<FileDoneOutlined />}
              className="min-h-[42px] rounded-xl"
            >
              Imtihon topshirish
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {certificates.map((cert) => {
            const verifyUrl = `${origin}/verify/${cert.code}`;
            return (
              <div
                key={cert.id}
                className="bg-white rounded-3xl border-2 border-[#E2E8F0] p-6 sm:p-10 shadow-sm relative overflow-hidden"
              >
                {/* Decorative top accent */}
                <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-[#DC2626] via-[#B91C1C] to-[#DC2626]" />

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pt-2">
                  <div className="space-y-4 flex-1">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-[#DC2626] text-white flex items-center justify-center text-xl font-bold font-hanzi">
                        老
                      </div>
                      <div>
                        <div className="text-xs font-bold uppercase tracking-widest text-[#DC2626]">
                          LaoshiUz • HSK Academy 3.0
                        </div>
                        <div className="text-sm font-semibold text-[#475569]">
                          Rasmiy Muvaffaqiyat Sertifikati
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="text-xs text-[#475569]">Sertifikat egasi:</div>
                      <h2 className="text-2xl sm:text-3xl font-bold text-[#0F172A]">
                        {user?.fullName}
                      </h2>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                      {cert.exam?.course && (
                        <Tag color="red" className="m-0 rounded-md font-bold">
                          HSK {cert.exam.course.level}
                        </Tag>
                      )}
                      <span className="text-base font-semibold text-[#0F172A]">
                        {cert.exam?.title}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-6 text-sm text-[#475569] pt-2">
                      <div>
                        Natija:{' '}
                        <strong className="text-[#16A34A]">{cert.scorePercent}%</strong>
                      </div>
                      <div>
                        Sana:{' '}
                        <strong className="text-[#0F172A]">
                          {new Date(cert.issuedAt).toLocaleDateString('uz-UZ')}
                        </strong>
                      </div>
                      <div>
                        Kod:{' '}
                        <strong className="font-mono text-[#0F172A]">{cert.code}</strong>
                      </div>
                    </div>
                  </div>

                  {/* QR Code */}
                  <div className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] shrink-0 self-start md:self-center">
                    <QRCodeSVG value={verifyUrl || cert.code} size={120} />
                    <Link
                      href={`/verify/${cert.code}`}
                      className="text-xs font-medium text-[#DC2626] hover:underline inline-flex items-center gap-1 print:hidden"
                    >
                      <SafetyCertificateOutlined />
                      <span>Tekshirish sahifasi</span>
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
