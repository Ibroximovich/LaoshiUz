'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Spin } from 'antd';
import { getHomeRouteByRole, useAuth } from '@/context/AuthContext';

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (user) {
      router.replace(getHomeRouteByRole(user.role));
    } else {
      router.replace('/login');
    }
  }, [user, loading, router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8FAFC] gap-4 p-6">
      <div className="w-12 h-12 rounded-2xl bg-[#DC2626] text-white flex items-center justify-center text-xl font-bold shadow-md font-hanzi">
        老
      </div>
      <Spin size="large" />
      <p className="text-sm text-[#475569] font-medium">LaoshiUz yuklanmoqda...</p>
    </div>
  );
}
