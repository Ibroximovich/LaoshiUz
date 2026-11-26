'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Button, Spin } from 'antd';
import {
  ArrowLeftOutlined,
  BookOutlined,
  ExclamationCircleOutlined,
  FileDoneOutlined,
  LogoutOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useAuth } from '@/context/AuthContext';

const studentNavItems = [
  {
    key: '/dashboard',
    label: 'Darslar',
    href: '/dashboard',
    icon: <BookOutlined />,
  },
  {
    key: '/exams',
    label: 'Imtihonlar',
    href: '/exams',
    icon: <FileDoneOutlined />,
  },
  {
    key: '/mistakes',
    label: 'Xatolarim',
    href: '/mistakes',
    icon: <ExclamationCircleOutlined />,
  },
  {
    key: '/groups',
    label: 'Guruhlar',
    href: '/groups',
    icon: <TeamOutlined />,
  },
  {
    key: '/profile',
    label: 'Profil',
    href: '/profile',
    icon: <UserOutlined />,
  },
];

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8FAFC] gap-4 p-6">
        <Spin size="large" />
        <p className="text-sm text-[#475569]">Yuklanmoqda...</p>
      </div>
    );
  }

  const isTeacherOrAdmin = user.role === 'TEACHER' || user.role === 'ADMIN';

  function isActive(href: string): boolean {
    if (href === '/dashboard') {
      return pathname === '/dashboard' || pathname.startsWith('/lessons');
    }
    return pathname.startsWith(href);
  }

  return (
    <div className="min-h-screen w-full bg-[#F8FAFC] flex flex-col overflow-x-hidden">
      {/* Top Navbar (Desktop & Mobile brand bar) */}
      <header className="sticky top-0 z-30 h-16 bg-white/95 backdrop-blur-sm border-b border-[#E2E8F0]">
        <div className="max-w-6xl mx-auto h-full px-4 sm:px-6 flex items-center justify-between gap-4">
          <Link href="/dashboard" className="flex items-center gap-2.5 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-[#DC2626] text-white flex items-center justify-center text-lg font-bold shadow-sm font-hanzi">
              老
            </div>
            <div>
              <span className="font-bold text-[#0F172A] text-base">LaoshiUz</span>
              <span className="hidden sm:inline text-xs text-[#475569] ml-2">HSK Academy</span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1.5">
            {studentNavItems.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  className={`inline-flex items-center gap-2 px-4 py-2 min-h-[40px] rounded-xl text-sm font-medium transition-colors ${
                    active
                      ? 'bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA]'
                      : 'text-[#475569] hover:bg-[#F8FAFC] hover:text-[#0F172A]'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {isTeacherOrAdmin && (
              <Link href="/admin">
                <Button
                  size="small"
                  icon={<ArrowLeftOutlined />}
                  className="rounded-xl min-h-[36px] text-xs sm:text-sm"
                >
                  <span className="hidden sm:inline">Admin panelga qaytish</span>
                  <span className="sm:hidden">Admin</span>
                </Button>
              </Link>
            )}
            <Button
              type="text"
              danger
              icon={<LogoutOutlined />}
              onClick={logout}
              className="hidden md:inline-flex min-h-[40px] rounded-xl font-medium"
            >
              Chiqish
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-6xl mx-auto p-4 sm:p-6 pb-24 md:pb-8 min-w-0">
        {children}
      </main>

      {/* Mobile Bottom Tab Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-[#E2E8F0] px-1.5 py-1.5 shadow-lg">
        <div className="grid grid-cols-5 gap-1 max-w-md mx-auto">
          {studentNavItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.key}
                href={item.href}
                className={`flex flex-col items-center justify-center min-h-[48px] rounded-xl text-xs font-medium transition-colors gap-0.5 ${
                  active
                    ? 'text-[#DC2626] bg-[#FEF2F2]'
                    : 'text-[#475569] hover:text-[#0F172A]'
                }`}
              >
                <span className="text-lg leading-none">{item.icon}</span>
                <span className="leading-tight">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
