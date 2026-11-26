'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Button, Drawer, Spin, Tag } from 'antd';
import {
  BookOutlined,
  FileDoneOutlined,
  LogoutOutlined,
  MenuOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { useAuth } from '@/context/AuthContext';

const navItems = [
  {
    key: '/admin',
    label: 'Kurslar va Darslar',
    href: '/admin',
    icon: <BookOutlined />,
  },
  {
    key: '/admin/groups',
    label: 'Guruhlar va Hisobotlar',
    href: '/admin/groups',
    icon: <TeamOutlined />,
  },
  {
    key: '/admin/exams',
    label: 'HSK Imtihonlar',
    href: '/admin/exams',
    icon: <FileDoneOutlined />,
  },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (user.role !== 'TEACHER' && user.role !== 'ADMIN') {
      router.replace('/dashboard');
    }
  }, [user, loading, router]);

  if (loading || !user || (user.role !== 'TEACHER' && user.role !== 'ADMIN')) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8FAFC] gap-4 p-6">
        <Spin size="large" />
        <p className="text-sm text-[#475569]">Ruxsat tekshirilmoqda...</p>
      </div>
    );
  }

  function isActive(href: string): boolean {
    if (href === '/admin') {
      return pathname === '/admin' || pathname.startsWith('/admin/lessons');
    }
    return pathname.startsWith(href);
  }

  const sidebarContent = (
    <div className="flex flex-col h-full w-full justify-between px-5 py-6 bg-white">
      <div className="space-y-6">
        {/* Brand */}
        <Link
          href="/admin"
          className="flex items-center gap-3 px-1"
          onClick={() => setDrawerOpen(false)}
        >
          <div className="w-10 h-10 rounded-xl bg-[#DC2626] text-white flex items-center justify-center text-xl font-bold shadow-sm shrink-0 font-hanzi">
            老
          </div>
          <div className="min-w-0">
            <div className="text-base font-bold text-[#0F172A] leading-tight">LaoshiUz</div>
            <div className="text-xs text-[#475569]">Ustoz / Admin Paneli</div>
          </div>
        </Link>

        {/* User Info */}
        <div className="p-3.5 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1.5">
          <div className="text-sm font-semibold text-[#0F172A] break-words">{user.fullName}</div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-[#475569] truncate">@{user.username || 'user'}</span>
            <Tag color={user.role === 'ADMIN' ? 'red' : 'blue'} className="m-0 rounded-md text-xs shrink-0">
              {user.role}
            </Tag>
          </div>
        </div>

        {/* Navigation */}
        <nav className="space-y-1.5">
          {navItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.key}
                href={item.href}
                onClick={() => setDrawerOpen(false)}
                className={`flex items-center gap-3 px-3.5 py-2.5 min-h-[42px] rounded-xl text-sm font-medium transition-colors ${
                  active
                    ? 'bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA]'
                    : 'text-[#475569] hover:bg-[#F8FAFC] hover:text-[#0F172A]'
                }`}
              >
                <span className="text-base shrink-0">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Logout */}
      <div className="pt-4 border-t border-[#E2E8F0]">
        <Button
          danger
          type="text"
          icon={<LogoutOutlined />}
          onClick={() => {
            setDrawerOpen(false);
            logout();
          }}
          block
          className="min-h-[42px] rounded-xl flex items-center justify-start font-medium"
        >
          Chiqish
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen w-full flex bg-[#F8FAFC] overflow-x-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:shrink-0 bg-white border-r border-[#E2E8F0] min-h-screen">
        {sidebarContent}
      </aside>

      {/* Right Column: Mobile Header + Main Content */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="lg:hidden sticky top-0 z-30 h-16 bg-white border-b border-[#E2E8F0] px-4 flex items-center justify-between">
          <Link href="/admin" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#DC2626] text-white flex items-center justify-center text-lg font-bold font-hanzi">
              老
            </div>
            <span className="font-bold text-[#0F172A]">LaoshiUz Admin</span>
          </Link>
          <Button
            type="text"
            icon={<MenuOutlined className="text-lg" />}
            onClick={() => setDrawerOpen(true)}
            aria-label="Menyuni ochish"
            className="min-h-[42px] min-w-[42px] rounded-xl"
          />
        </header>

        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>

      {/* Mobile Drawer */}
      <Drawer
        placement="left"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        size={280}
        styles={{ body: { padding: 0 } }}
      >
        {sidebarContent}
      </Drawer>
    </div>
  );
}
