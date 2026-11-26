'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, Button, Form, Input, Spin, Tabs } from 'antd';
import {
  BookOutlined,
  LockOutlined,
  LoginOutlined,
  UserAddOutlined,
  UserOutlined,
} from '@ant-design/icons';
import axios from 'axios';
import { getHomeRouteByRole, useAuth } from '@/context/AuthContext';

interface LoginFormValues {
  username: string;
  password: string;
}

interface RegisterFormValues {
  fullName: string;
  username: string;
  password: string;
}

export default function LoginPage() {
  const { user, loading: authLoading, login, register, loginWithTelegram } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [submitting, setSubmitting] = useState(false);
  const [tgAuthenticating, setTgAuthenticating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (user) {
      router.replace(getHomeRouteByRole(user.role));
      return;
    }

    const tgInitData = window.Telegram?.WebApp?.initData;
    if (tgInitData && tgInitData.trim().length > 0) {
      let active = true;
      async function authTg(initData: string) {
        setTgAuthenticating(true);
        try {
          await loginWithTelegram(initData);
        } catch (err) {
          if (active) {
            setErrorMsg(extractErrorMessage(err, 'Telegram orqali kirishda xatolik yuz berdi'));
            setTgAuthenticating(false);
          }
        }
      }
      void authTg(tgInitData);
      return () => {
        active = false;
      };
    }
  }, [authLoading, user, router, loginWithTelegram]);

  if (authLoading || tgAuthenticating) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8FAFC] gap-4 p-6">
        <div className="w-12 h-12 rounded-2xl bg-[#DC2626] text-white flex items-center justify-center text-xl font-bold shadow-md font-hanzi">
          老
        </div>
        <Spin size="large" />
        <p className="text-sm text-[#475569] font-medium">
          {tgAuthenticating ? 'Telegram orqali kirilmoqda...' : 'Yuklanmoqda...'}
        </p>
      </div>
    );
  }

  function extractErrorMessage(err: unknown, fallback: string): string {
    if (axios.isAxiosError(err)) {
      const data = err.response?.data as { error?: string } | undefined;
      if (data?.error) return data.error;
    }
    return fallback;
  }

  async function handleLogin(values: LoginFormValues) {
    setErrorMsg(null);
    setSubmitting(true);
    try {
      await login(values.username.trim(), values.password);
    } catch (err) {
      setErrorMsg(extractErrorMessage(err, 'Login yoki parol noto‘g‘ri'));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRegister(values: RegisterFormValues) {
    setErrorMsg(null);
    setSubmitting(true);
    try {
      await register(values.fullName.trim(), values.username.trim(), values.password);
    } catch (err) {
      setErrorMsg(extractErrorMessage(err, 'Ro‘yxatdan o‘tishda xatolik yuz berdi'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen w-full bg-[#F8FAFC] flex items-center justify-center p-4 sm:p-6 lg:p-8 overflow-x-hidden">
      <div className="w-full max-w-5xl bg-white rounded-3xl border border-[#E2E8F0] shadow-xl overflow-hidden grid grid-cols-1 lg:grid-cols-2">
        {/* Left Brand Panel */}
        <div className="relative bg-gradient-to-br from-[#DC2626] via-[#B91C1C] to-[#991B1B] text-white p-8 sm:p-10 lg:p-12 flex flex-col justify-between gap-8">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/15 backdrop-blur-sm border border-white/25 flex items-center justify-center text-2xl font-bold font-hanzi">
              老
            </div>
            <div>
              <div className="text-xl font-bold tracking-tight">LaoshiUz</div>
              <div className="text-xs text-red-100">HSK Academy 3.0</div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-xs font-medium border border-white/20">
              <BookOutlined />
              <span>HSK 1–6 tizimli o‘quv platformasi</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold leading-snug">
              Xitoy tilini zamonaviy va tizimli uslubda o‘rganing
            </h1>
            <p className="text-sm sm:text-base text-red-100 leading-relaxed">
              Lug‘at kartochkalari, interaktiv testlar, xatolar ustida ishlash banki va ustozlar
              uchun qulay guruh boshqaruvi bitta platformada.
            </p>
          </div>

          <div className="flex items-center gap-4 pt-4 border-t border-white/15">
            <div className="font-hanzi text-3xl sm:text-4xl font-medium tracking-widest text-white/90">
              学而时习之
            </div>
            <div className="text-xs text-red-100 leading-snug">
              O‘rganish va muntazam takrorlash — natija kaliti
            </div>
          </div>
        </div>

        {/* Right Form Panel */}
        <div className="p-6 sm:p-10 lg:p-12 flex flex-col justify-center">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-[#0F172A]">Xush kelibsiz!</h2>
            <p className="text-sm text-[#475569] mt-1">
              Davom etish uchun hisobingizga kiring yoki yangi hisob oching
            </p>
          </div>

          {errorMsg && (
            <Alert
              type="error"
              showIcon
              message={errorMsg}
              closable
              onClose={() => setErrorMsg(null)}
              className="mb-5 rounded-xl"
            />
          )}

          <Tabs
            activeKey={activeTab}
            onChange={(key) => {
              setActiveTab(key as 'login' | 'register');
              setErrorMsg(null);
            }}
            items={[
              {
                key: 'login',
                label: (
                  <span className="inline-flex items-center gap-2 font-medium">
                    <LoginOutlined />
                    Kirish
                  </span>
                ),
                children: (
                  <Form<LoginFormValues>
                    layout="vertical"
                    onFinish={handleLogin}
                    requiredMark={false}
                    className="mt-2"
                  >
                    <Form.Item
                      label={<span className="font-medium text-[#0F172A]">Foydalanuvchi nomi</span>}
                      name="username"
                      rules={[
                        { required: true, message: 'Foydalanuvchi nomini kiriting' },
                      ]}
                    >
                      <Input
                        prefix={<UserOutlined className="text-[#475569]" />}
                        placeholder="username"
                        size="large"
                        className="rounded-xl"
                      />
                    </Form.Item>

                    <Form.Item
                      label={<span className="font-medium text-[#0F172A]">Parol</span>}
                      name="password"
                      rules={[{ required: true, message: 'Parolni kiriting' }]}
                    >
                      <Input.Password
                        prefix={<LockOutlined className="text-[#475569]" />}
                        placeholder="••••••"
                        size="large"
                        className="rounded-xl"
                      />
                    </Form.Item>

                    <Button
                      type="primary"
                      htmlType="submit"
                      loading={submitting}
                      block
                      icon={<LoginOutlined />}
                      className="min-h-[44px] rounded-xl text-base font-semibold mt-2"
                    >
                      Tizimga kirish
                    </Button>
                  </Form>
                ),
              },
              {
                key: 'register',
                label: (
                  <span className="inline-flex items-center gap-2 font-medium">
                    <UserAddOutlined />
                    Ro‘yxatdan o‘tish
                  </span>
                ),
                children: (
                  <Form<RegisterFormValues>
                    layout="vertical"
                    onFinish={handleRegister}
                    requiredMark={false}
                    className="mt-2"
                  >
                    <Form.Item
                      label={<span className="font-medium text-[#0F172A]">To‘liq ism</span>}
                      name="fullName"
                      rules={[{ required: true, message: 'To‘liq ismingizni kiriting' }]}
                    >
                      <Input
                        prefix={<UserOutlined className="text-[#475569]" />}
                        placeholder="Masalan: Alisher Karimov"
                        size="large"
                        className="rounded-xl"
                      />
                    </Form.Item>

                    <Form.Item
                      label={<span className="font-medium text-[#0F172A]">Foydalanuvchi nomi</span>}
                      name="username"
                      rules={[
                        { required: true, message: 'Foydalanuvchi nomini kiriting' },
                        { min: 3, message: 'Kamida 3 ta belgi bo‘lishi kerak' },
                      ]}
                    >
                      <Input
                        prefix={<UserOutlined className="text-[#475569]" />}
                        placeholder="kamida 3 ta belgi"
                        size="large"
                        className="rounded-xl"
                      />
                    </Form.Item>

                    <Form.Item
                      label={<span className="font-medium text-[#0F172A]">Parol</span>}
                      name="password"
                      rules={[
                        { required: true, message: 'Parolni kiriting' },
                        { min: 6, message: 'Parol kamida 6 ta belgi bo‘lishi kerak' },
                      ]}
                    >
                      <Input.Password
                        prefix={<LockOutlined className="text-[#475569]" />}
                        placeholder="kamida 6 ta belgi"
                        size="large"
                        className="rounded-xl"
                      />
                    </Form.Item>

                    <Button
                      type="primary"
                      htmlType="submit"
                      loading={submitting}
                      block
                      icon={<UserAddOutlined />}
                      className="min-h-[44px] rounded-xl text-base font-semibold mt-2"
                    >
                      Hisob yaratish
                    </Button>
                  </Form>
                ),
              },
            ]}
          />
        </div>
      </div>
    </div>
  );
}
