'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  App as AntdApp,
  Button,
  DatePicker,
  Empty,
  Form,
  Input,
  Modal,
  Progress,
  Select,
  Spin,
  Table,
  Tag,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  BookOutlined,
  CheckOutlined,
  CopyOutlined,
  PlusOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import type { Dayjs } from 'dayjs';
import api from '@/lib/api';
import type {
  Course,
  Group,
  GroupDetail,
  GroupReportRow,
  Lesson,
} from '@/types';

interface CreateGroupValues {
  name: string;
}

interface AssignLessonValues {
  courseId: string;
  lessonId: string;
  dueDate?: Dayjs;
}

export default function AdminGroupsPage() {
  const { message } = AntdApp.useApp();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);

  const [groupDetail, setGroupDetail] = useState<GroupDetail | null>(null);
  const [report, setReport] = useState<GroupReportRow[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [courses, setCourses] = useState<Course[]>([]);
  const [assignLessons, setAssignLessons] = useState<Lesson[]>([]);
  const [loadingAssignLessons, setLoadingAssignLessons] = useState(false);
  const [assigning, setAssigning] = useState(false);

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [groupForm] = Form.useForm<CreateGroupValues>();
  const [assignForm] = Form.useForm<AssignLessonValues>();

  const fetchGroups = useCallback(async () => {
    try {
      const res = await api.get<{ groups: Group[] }>('/api/groups');
      const list = res.data.groups;
      setGroups(list);
      setSelectedGroup((prev) => {
        if (prev) {
          const found = list.find((g) => g.id === prev.id);
          if (found) return found;
        }
        return list[0] ?? null;
      });
    } catch {
      message.error('Guruhlarni yuklashda xatolik yuz berdi');
    } finally {
      setLoadingGroups(false);
    }
  }, [message]);

  const fetchGroupWorkspace = useCallback(
    async (groupId: string) => {
      try {
        const [detailRes, reportRes] = await Promise.all([
          api.get<{ group: GroupDetail }>(`/api/groups/${groupId}`),
          api.get<{ report: GroupReportRow[] }>(`/api/groups/${groupId}/report`),
        ]);
        setGroupDetail(detailRes.data.group);
        setReport(reportRes.data.report);
      } catch {
        message.error('Guruh hisobotini yuklashda xatolik yuz berdi');
      } finally {
        setLoadingDetail(false);
      }
    },
    [message]
  );

  useEffect(() => {
    let active = true;
    async function loadInitial() {
      try {
        const [groupsRes, coursesRes] = await Promise.all([
          api.get<{ groups: Group[] }>('/api/groups'),
          api.get<{ courses: Course[] }>('/api/courses'),
        ]);
        if (!active) return;
        const list = groupsRes.data.groups;
        setGroups(list);
        setCourses(coursesRes.data.courses);
        setSelectedGroup((prev) => {
          if (prev) {
            const found = list.find((g) => g.id === prev.id);
            if (found) return found;
          }
          return list[0] ?? null;
        });
      } catch {
        if (active) message.error('Guruhlarni yuklashda xatolik yuz berdi');
      } finally {
        if (active) setLoadingGroups(false);
      }
    }
    void loadInitial();
    return () => {
      active = false;
    };
  }, [message]);

  useEffect(() => {
    if (!selectedGroup) return;
    const groupId = selectedGroup.id;
    let active = true;
    async function loadWorkspace() {
      try {
        const [detailRes, reportRes] = await Promise.all([
          api.get<{ group: GroupDetail }>(`/api/groups/${groupId}`),
          api.get<{ report: GroupReportRow[] }>(`/api/groups/${groupId}/report`),
        ]);
        if (!active) return;
        setGroupDetail(detailRes.data.group);
        setReport(reportRes.data.report);
      } catch {
        if (active) message.error('Guruh hisobotini yuklashda xatolik yuz berdi');
      } finally {
        if (active) setLoadingDetail(false);
      }
    }
    void loadWorkspace();
    return () => {
      active = false;
    };
  }, [selectedGroup, message]);

  async function handleCreateGroup(values: CreateGroupValues) {
    setCreatingGroup(true);
    try {
      const res = await api.post<{ group: Group }>('/api/groups', values);
      message.success('Yangi guruh yaratildi');
      setCreateModalOpen(false);
      groupForm.resetFields();
      await fetchGroups();
      setSelectedGroup(res.data.group);
    } catch {
      message.error('Guruh yaratishda xatolik yuz berdi');
    } finally {
      setCreatingGroup(false);
    }
  }

  async function handleCopyInvite(group: Group, e: React.MouseEvent) {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(group.inviteCode);
      setCopiedId(group.id);
      message.success(`Taklif kodi nusxalandi: ${group.inviteCode}`);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      message.error('Nusxalab bo‘lmadi');
    }
  }

  async function handleCourseChange(courseId: string) {
    assignForm.setFieldValue('lessonId', undefined);
    setLoadingAssignLessons(true);
    try {
      const res = await api.get<{ lessons: Lesson[] }>(`/api/courses/${courseId}/lessons`);
      setAssignLessons(res.data.lessons);
    } catch {
      message.error('Darslarni yuklashda xatolik yuz berdi');
    } finally {
      setLoadingAssignLessons(false);
    }
  }

  async function handleAssignLesson(values: AssignLessonValues) {
    if (!selectedGroup) return;
    setAssigning(true);
    try {
      await api.post(`/api/groups/${selectedGroup.id}/assign`, {
        lessonId: values.lessonId,
        dueDate: values.dueDate ? values.dueDate.toISOString() : null,
      });
      message.success('Dars guruhga biriktirildi');
      assignForm.resetFields();
      setAssignLessons([]);
      await fetchGroupWorkspace(selectedGroup.id);
    } catch {
      message.error('Darsni biriktirishda xatolik yuz berdi');
    } finally {
      setAssigning(false);
    }
  }

  const reportColumns: ColumnsType<GroupReportRow> = [
    {
      title: 'O‘quvchi',
      key: 'student',
      render: (_, row) => (
        <div>
          <div className="font-semibold text-[#0F172A]">{row.fullName}</div>
          <div className="text-xs text-[#475569]">@{row.username || 'telegram'}</div>
        </div>
      ),
    },
    {
      title: 'Urinishlar',
      dataIndex: 'totalAttempts',
      key: 'totalAttempts',
      align: 'center',
    },
    {
      title: 'To‘g‘ri javoblar',
      dataIndex: 'correctAttempts',
      key: 'correctAttempts',
      align: 'center',
    },
    {
      title: 'Umumiy ball',
      dataIndex: 'totalScore',
      key: 'totalScore',
      align: 'center',
      render: (score: number) => (
        <span className="font-bold text-[#0F172A]">{score}</span>
      ),
    },
    {
      title: 'O‘zlashtirish',
      dataIndex: 'accuracyPercent',
      key: 'accuracyPercent',
      width: 200,
      render: (percent: number) => {
        const strokeColor =
          percent >= 75 ? '#16A34A' : percent >= 40 ? '#D97706' : '#DC2626';
        return <Progress percent={percent} strokeColor={strokeColor} size="small" />;
      },
    },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#0F172A]">
            Guruhlar va Hisobotlar
          </h1>
          <p className="text-sm text-[#475569] mt-1">
            O‘quvchi guruhlarini yarating, taklif kodini ulashing va o‘zlashtirishni kuzating
          </p>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setCreateModalOpen(true)}
          className="min-h-[42px] rounded-xl self-start sm:self-auto"
        >
          Yangi guruh yaratish
        </Button>
      </div>

      {/* Groups Grid */}
      {loadingGroups ? (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-12 flex justify-center">
          <Spin size="large" />
        </div>
      ) : groups.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-10">
          <Empty description="Hozircha guruhlar yaratilmagan" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {groups.map((group) => {
            const isSelected = selectedGroup?.id === group.id;
            const isCopied = copiedId === group.id;
            return (
              <div
                key={group.id}
                onClick={() => setSelectedGroup(group)}
                className={`cursor-pointer bg-white rounded-2xl border p-5 transition-all flex flex-col justify-between gap-4 ${
                  isSelected
                    ? 'border-[#DC2626] ring-2 ring-[#DC2626]/20 shadow-md'
                    : 'border-[#E2E8F0] hover:border-[#DC2626]/50 hover:shadow-sm'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-bold text-[#0F172A]">{group.name}</h3>
                    <p className="text-xs text-[#475569] mt-1 inline-flex items-center gap-1.5">
                      <TeamOutlined />
                      {group._count?.members ?? 0} ta o‘quvchi
                    </p>
                  </div>
                  <Tag color="red" className="m-0 rounded-lg font-mono font-bold">
                    {group.inviteCode}
                  </Tag>
                </div>

                <div className="pt-3 border-t border-[#E2E8F0] flex items-center justify-between gap-2">
                  <span className="text-xs text-[#475569]">Taklif kodi:</span>
                  <Button
                    size="small"
                    icon={isCopied ? <CheckOutlined /> : <CopyOutlined />}
                    onClick={(e) => handleCopyInvite(group, e)}
                    className="rounded-lg"
                  >
                    {isCopied ? 'Nusxalandi' : 'Nusxalash'}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Selected Group Workspace */}
      {selectedGroup && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Student Report Table */}
          <div className="xl:col-span-2 bg-white rounded-2xl border border-[#E2E8F0] p-5 sm:p-6 space-y-4 min-w-0">
            <div>
              <h2 className="text-lg font-bold text-[#0F172A]">
                {selectedGroup.name} — O‘quvchilar natijalari
              </h2>
              <p className="text-xs text-[#475569] mt-0.5">
                Guruhdagi har bir o‘quvchining urinishlari va umumiy o‘zlashtirish ko‘rsatkichi
              </p>
            </div>

            <Table<GroupReportRow>
              rowKey="userId"
              columns={reportColumns}
              dataSource={report}
              loading={loadingDetail}
              scroll={{ x: 'max-content' }}
              pagination={{ pageSize: 10, hideOnSinglePage: true }}
              locale={{ emptyText: 'Guruhda hali o‘quvchilar yo‘q' }}
            />
          </div>

          {/* Assign Lesson Panel */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 sm:p-6 space-y-5">
            <div>
              <h2 className="text-lg font-bold text-[#0F172A]">Dars biriktirish</h2>
              <p className="text-xs text-[#475569] mt-0.5">
                Guruh uchun vazifa sifatida dars va muddat belgilang
              </p>
            </div>

            <Form<AssignLessonValues>
              form={assignForm}
              layout="vertical"
              onFinish={handleAssignLesson}
              requiredMark={false}
            >
              <Form.Item
                label="Kursni tanlang"
                name="courseId"
                rules={[{ required: true, message: 'Kursni tanlang' }]}
              >
                <Select
                  placeholder="HSK kursini tanlang"
                  onChange={handleCourseChange}
                  options={courses.map((c) => ({
                    value: c.id,
                    label: `HSK ${c.level}: ${c.title}`,
                  }))}
                />
              </Form.Item>

              <Form.Item
                label="Darsni tanlang"
                name="lessonId"
                rules={[{ required: true, message: 'Darsni tanlang' }]}
              >
                <Select
                  placeholder="Darsni tanlang"
                  loading={loadingAssignLessons}
                  disabled={assignLessons.length === 0}
                  options={assignLessons.map((l) => ({
                    value: l.id,
                    label: `${l.number}-dars: ${l.title}`,
                  }))}
                />
              </Form.Item>

              <Form.Item label="Muddat (ixtiyoriy)" name="dueDate">
                <DatePicker className="w-full" placeholder="Muddatni tanlang" />
              </Form.Item>

              <Button
                type="primary"
                htmlType="submit"
                loading={assigning}
                icon={<BookOutlined />}
                block
                className="min-h-[42px] rounded-xl"
              >
                Darsni biriktirish
              </Button>
            </Form>

            {/* Assigned Lessons List */}
            <div className="pt-4 border-t border-[#E2E8F0] space-y-3">
              <h3 className="text-sm font-semibold text-[#0F172A]">Biriktirilgan darslar</h3>
              {!groupDetail || groupDetail.assignments.length === 0 ? (
                <p className="text-xs text-[#475569]">Hali dars biriktirilmagan</p>
              ) : (
                <div className="space-y-2">
                  {groupDetail.assignments.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-[#0F172A] truncate">
                          {item.lesson.number}-dars: {item.lesson.title}
                        </div>
                        {item.dueDate && (
                          <div className="text-xs text-[#475569]">
                            Muddat: {new Date(item.dueDate).toLocaleDateString('uz-UZ')}
                          </div>
                        )}
                      </div>
                      <Tag color="blue" className="m-0 shrink-0 rounded-md">
                        Biriktirilgan
                      </Tag>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Group Modal */}
      <Modal
        title="Yangi guruh yaratish"
        open={createModalOpen}
        onCancel={() => setCreateModalOpen(false)}
        footer={null}
        width="95%"
        style={{ maxWidth: 520 }}
        destroyOnHidden
      >
        <Form<CreateGroupValues>
          form={groupForm}
          layout="vertical"
          onFinish={handleCreateGroup}
          className="mt-4"
        >
          <Form.Item
            label="Guruh nomi"
            name="name"
            rules={[{ required: true, message: 'Guruh nomini kiriting' }]}
          >
            <Input placeholder="Masalan: HSK 1 — Ertalabki guruh" />
          </Form.Item>

          <div className="flex justify-end gap-3 pt-2">
            <Button onClick={() => setCreateModalOpen(false)} className="min-h-[42px] rounded-xl">
              Bekor qilish
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={creatingGroup}
              className="min-h-[42px] rounded-xl"
            >
              Yaratish
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
