'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { App as AntdApp, Button, Empty, Form, Input, Spin, Tag } from 'antd';
import {
  CalendarOutlined,
  PlayCircleOutlined,
  TeamOutlined,
  UsergroupAddOutlined,
} from '@ant-design/icons';
import axios from 'axios';
import api from '@/lib/api';
import type { StudentGroupItem } from '@/types';

interface JoinFormValues {
  inviteCode: string;
}

export default function StudentGroupsPage() {
  const { message } = AntdApp.useApp();
  const [groups, setGroups] = useState<StudentGroupItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [form] = Form.useForm<JoinFormValues>();

  const reloadGroups = useCallback(async () => {
    try {
      const res = await api.get<{ groups: StudentGroupItem[] }>('/api/groups/my');
      setGroups(res.data.groups);
    } catch {
      message.error('Guruhlarni yuklashda xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  }, [message]);

  useEffect(() => {
    let active = true;
    async function loadGroups() {
      try {
        const res = await api.get<{ groups: StudentGroupItem[] }>('/api/groups/my');
        if (active) setGroups(res.data.groups);
      } catch {
        if (active) message.error('Guruhlarni yuklashda xatolik yuz berdi');
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadGroups();
    return () => {
      active = false;
    };
  }, [message]);

  async function handleJoin(values: JoinFormValues) {
    setJoining(true);
    try {
      await api.post('/api/groups/join', {
        inviteCode: values.inviteCode.trim().toUpperCase(),
      });
      message.success('Guruhga muvaffaqiyatli qo‘shildingiz!');
      form.resetFields();
      await reloadGroups();
    } catch (err) {
      let errMsg = 'Guruhga qo‘shilishda xatolik yuz berdi';
      if (axios.isAxiosError(err)) {
        const data = err.response?.data as { error?: string } | undefined;
        if (data?.error) errMsg = data.error;
      }
      message.error(errMsg);
    } finally {
      setJoining(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-[#0F172A]">Guruhlarim</h1>
        <p className="text-sm text-[#475569] mt-1">
          Ustozingiz bergan 6 belgili taklif kodi orqali guruhga qo‘shiling va vazifalarni bajaring
        </p>
      </div>

      {/* Join Group Card */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 sm:p-6 max-w-xl">
        <h2 className="text-base font-bold text-[#0F172A] mb-3 inline-flex items-center gap-2">
          <UsergroupAddOutlined className="text-[#DC2626]" />
          <span>Guruhga qo‘shilish</span>
        </h2>

        <Form<JoinFormValues>
          form={form}
          onFinish={handleJoin}
          className="flex flex-col sm:flex-row gap-3"
        >
          <Form.Item
            name="inviteCode"
            rules={[{ required: true, message: 'Taklif kodini kiriting' }]}
            className="flex-1 m-0"
          >
            <Input
              placeholder="6 belgili taklif kodi (masalan: A7K9P2)"
              maxLength={12}
              size="large"
              className="rounded-xl uppercase font-mono"
            />
          </Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            loading={joining}
            className="min-h-[42px] px-6 rounded-xl"
          >
            Qo‘shilish
          </Button>
        </Form>
      </div>

      {/* Groups List */}
      {loading ? (
        <div className="py-12 flex justify-center">
          <Spin size="large" />
        </div>
      ) : groups.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-10">
          <Empty description="Siz hali birorta guruhga a‘zo emassiz" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {groups.map((group) => (
            <div
              key={group.id}
              className="bg-white rounded-2xl border border-[#E2E8F0] p-5 sm:p-6 space-y-4"
            >
              <div className="flex items-center justify-between gap-3 pb-3 border-b border-[#E2E8F0]">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-[#FEF2F2] text-[#DC2626] flex items-center justify-center text-lg">
                    <TeamOutlined />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#0F172A]">{group.name}</h3>
                    <span className="text-xs text-[#475569]">
                      Qo‘shilgan: {new Date(group.joinedAt).toLocaleDateString('uz-UZ')}
                    </span>
                  </div>
                </div>
                <Tag color="red" className="m-0 rounded-md font-mono font-bold">
                  {group.inviteCode}
                </Tag>
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-[#0F172A]">
                  Biriktirilgan darslar ({group.assignments.length})
                </h4>
                {group.assignments.length === 0 ? (
                  <p className="text-xs text-[#475569]">Hali vazifalar biriktirilmagan</p>
                ) : (
                  <div className="space-y-2.5">
                    {group.assignments.map((a) => (
                      <div
                        key={a.id}
                        className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                      >
                        <div className="space-y-0.5">
                          <div className="text-sm font-semibold text-[#0F172A]">
                            {a.lesson.number}-dars: {a.lesson.title}
                          </div>
                          {a.dueDate && (
                            <div className="text-xs text-[#D97706] inline-flex items-center gap-1">
                              <CalendarOutlined />
                              Muddat: {new Date(a.dueDate).toLocaleDateString('uz-UZ')}
                            </div>
                          )}
                        </div>
                        <Link href={`/lessons/${a.lessonId}`}>
                          <Button
                            type="primary"
                            size="small"
                            icon={<PlayCircleOutlined />}
                            className="min-h-[36px] rounded-xl"
                          >
                            Boshlash
                          </Button>
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
