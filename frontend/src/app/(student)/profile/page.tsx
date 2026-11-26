'use client';

import React, { useEffect, useState } from 'react';
import { App as AntdApp, Button, Spin, Tag } from 'antd';
import {
  BookOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  LogoutOutlined,
  TrophyOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import type { MyStats } from '@/types';

export default function StudentProfilePage() {
  const { user, logout } = useAuth();
  const { message } = AntdApp.useApp();
  const [stats, setStats] = useState<MyStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function loadStats() {
      try {
        const res = await api.get<MyStats>('/api/attempts/my-stats');
        if (active) setStats(res.data);
      } catch {
        if (active) message.error('Statistikani yuklashda xatolik yuz berdi');
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadStats();
    return () => {
      active = false;
    };
  }, [message]);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl sm:text-3xl font-bold text-[#0F172A]">Profilim</h1>

      {/* Profile Card */}
      <div className="bg-white rounded-3xl border border-[#E2E8F0] p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#E2E8F0]">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA] flex items-center justify-center text-2xl font-bold shrink-0">
              <UserOutlined />
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-bold text-[#0F172A]">{user?.fullName}</h2>
              <div className="text-sm text-[#475569]">@{user?.username || 'telegram_user'}</div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Tag color="red" className="m-0 rounded-md font-semibold">
              {user?.role}
            </Tag>
            <Tag color={user?.telegramId ? 'success' : 'default'} className="m-0 rounded-md">
              {user?.telegramId ? 'Telegram ulangan' : 'Telegram ulanmagan'}
            </Tag>
          </div>
        </div>

        {/* Stats */}
        {loading ? (
          <div className="py-8 flex justify-center">
            <Spin />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1">
              <div className="text-xs text-[#475569] flex items-center gap-1.5">
                <TrophyOutlined className="text-[#D97706]" />
                <span>Umumiy ball</span>
              </div>
              <div className="text-2xl font-bold text-[#0F172A]">{stats?.totalScore ?? 0}</div>
            </div>

            <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1">
              <div className="text-xs text-[#475569] flex items-center gap-1.5">
                <BookOutlined className="text-[#DC2626]" />
                <span>Ishlangan savollar</span>
              </div>
              <div className="text-2xl font-bold text-[#0F172A]">{stats?.totalAttempts ?? 0}</div>
            </div>

            <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1">
              <div className="text-xs text-[#475569] flex items-center gap-1.5">
                <CheckCircleOutlined className="text-[#16A34A]" />
                <span>Aniqlik foizi</span>
              </div>
              <div className="text-2xl font-bold text-[#16A34A]">
                {stats?.accuracyPercent ?? 0}%
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1">
              <div className="text-xs text-[#475569] flex items-center gap-1.5">
                <ExclamationCircleOutlined className="text-[#DC2626]" />
                <span>Xatolar banki</span>
              </div>
              <div className="text-2xl font-bold text-[#DC2626]">
                {stats?.reviewQueueCount ?? 0}
              </div>
            </div>
          </div>
        )}

        {/* Logout */}
        <div className="pt-2">
          <Button
            danger
            type="primary"
            icon={<LogoutOutlined />}
            onClick={logout}
            block
            className="min-h-[46px] rounded-xl text-base font-semibold"
          >
            Tizimdan chiqish
          </Button>
        </div>
      </div>
    </div>
  );
}
