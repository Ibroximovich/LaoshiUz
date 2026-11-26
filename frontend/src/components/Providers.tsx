'use client';

import React from 'react';
import { App as AntdApp, ConfigProvider } from 'antd';
import { AuthProvider } from '@/context/AuthContext';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#DC2626',
          colorInfo: '#DC2626',
          colorSuccess: '#16A34A',
          colorWarning: '#D97706',
          colorError: '#DC2626',
          colorBgLayout: '#F8FAFC',
          colorBgContainer: '#FFFFFF',
          colorText: '#0F172A',
          colorTextSecondary: '#475569',
          colorBorder: '#E2E8F0',
          borderRadius: 10,
          controlHeight: 42,
          fontFamily: 'var(--font-geist-sans), system-ui, -apple-system, sans-serif',
        },
        components: {
          Button: {
            controlHeight: 42,
            borderRadius: 12,
            fontWeight: 600,
          },
          Card: {
            borderRadiusLG: 16,
          },
          Modal: {
            borderRadiusLG: 16,
          },
        },
      }}
    >
      <AntdApp>
        <AuthProvider>{children}</AuthProvider>
      </AntdApp>
    </ConfigProvider>
  );
}
