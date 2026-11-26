'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  App as AntdApp,
  Button,
  Checkbox,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Spin,
  Switch,
  Tag,
} from 'antd';
import {
  ClockCircleOutlined,
  FileDoneOutlined,
  PlusOutlined,
  QuestionCircleOutlined,
} from '@ant-design/icons';
import api from '@/lib/api';
import type { Course, Exam, Lesson, Question } from '@/types';

interface CreateExamFormValues {
  courseId: string;
  title: string;
  durationMinutes: number;
  passingScore: number;
  isPublished: boolean;
}

export default function AdminExamsPage() {
  const { message } = AntdApp.useApp();
  const [exams, setExams] = useState<Exam[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [examForm] = Form.useForm<CreateExamFormValues>();

  // Attach Questions Modal
  const [attachExam, setAttachExam] = useState<Exam | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [lessonQuestions, setLessonQuestions] = useState<Question[]>([]);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [attaching, setAttaching] = useState(false);

  const reloadExams = useCallback(async () => {
    try {
      const res = await api.get<{ exams: Exam[] }>('/api/exams/admin');
      setExams(res.data.exams);
    } catch {
      message.error('Imtihonlarni yuklashda xatolik yuz berdi');
    }
  }, [message]);

  useEffect(() => {
    let active = true;
    async function loadInitial() {
      try {
        const [examsRes, coursesRes] = await Promise.all([
          api.get<{ exams: Exam[] }>('/api/exams/admin'),
          api.get<{ courses: Course[] }>('/api/courses'),
        ]);
        if (!active) return;
        setExams(examsRes.data.exams);
        setCourses(coursesRes.data.courses);
      } catch {
        if (active) message.error('Ma‘lumotlarni yuklashda xatolik yuz berdi');
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadInitial();
    return () => {
      active = false;
    };
  }, [message]);

  async function handleCreateExam(values: CreateExamFormValues) {
    setCreating(true);
    try {
      await api.post('/api/exams', values);
      message.success('Yangi HSK imtihoni yaratildi');
      setCreateOpen(false);
      examForm.resetFields();
      await reloadExams();
    } catch {
      message.error('Imtihon yaratishda xatolik yuz berdi');
    } finally {
      setCreating(false);
    }
  }

  async function openAttachModal(exam: Exam) {
    setAttachExam(exam);
    setLessons([]);
    setLessonQuestions([]);
    setSelectedQuestionIds([]);
    try {
      const res = await api.get<{ lessons: Lesson[] }>(`/api/courses/${exam.courseId}/lessons`);
      setLessons(res.data.lessons);
    } catch {
      message.error('Darslarni yuklashda xatolik yuz berdi');
    }
  }

  async function handleSelectCourseForQuestions(courseId: string) {
    setLessonQuestions([]);
    setSelectedQuestionIds([]);
    try {
      const res = await api.get<{ lessons: Lesson[] }>(`/api/courses/${courseId}/lessons`);
      setLessons(res.data.lessons);
    } catch {
      message.error('Darslarni yuklashda xatolik yuz berdi');
    }
  }

  async function handleSelectLessonForQuestions(lessonId: string) {
    setLoadingQuestions(true);
    setSelectedQuestionIds([]);
    try {
      const res = await api.get<{ lesson: Lesson }>(`/api/lessons/${lessonId}`);
      const questions = (res.data.lesson.sections ?? []).flatMap((s) => s.questions ?? []);
      setLessonQuestions(questions);
    } catch {
      message.error('Savollarni yuklashda xatolik yuz berdi');
    } finally {
      setLoadingQuestions(false);
    }
  }

  async function handleAttachSubmit() {
    if (!attachExam || selectedQuestionIds.length === 0) {
      message.warning('Kamida bitta savol tanlang');
      return;
    }
    setAttaching(true);
    try {
      const res = await api.post<{ addedCount: number }>(
        `/api/exams/${attachExam.id}/questions`,
        { questionIds: selectedQuestionIds }
      );
      message.success(`${res.data.addedCount} ta savol imtihonga biriktirildi`);
      setAttachExam(null);
      await reloadExams();
    } catch {
      message.error('Savollarni biriktirishda xatolik yuz berdi');
    } finally {
      setAttaching(false);
    }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#0F172A]">HSK Imtihonlar</h1>
          <p className="text-sm text-[#475569] mt-1">
            Vaqt chegarali sinov imtihonlarini yarating va savollarni biriktiring
          </p>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => {
            examForm.setFieldsValue({
              durationMinutes: 40,
              passingScore: 60,
              isPublished: true,
            });
            setCreateOpen(true);
          }}
          className="min-h-[42px] rounded-xl self-start sm:self-auto"
        >
          Yangi imtihon yaratish
        </Button>
      </div>

      {/* Exams Grid */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-12 flex justify-center">
          <Spin size="large" />
        </div>
      ) : exams.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-10">
          <Empty description="Hozircha HSK imtihonlari yaratilmagan" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {exams.map((exam) => (
            <div
              key={exam.id}
              className="bg-white rounded-2xl border border-[#E2E8F0] p-5 flex flex-col justify-between gap-4"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  {exam.course && (
                    <Tag color="red" className="m-0 rounded-md font-bold">
                      HSK {exam.course.level}
                    </Tag>
                  )}
                  <Tag color={exam.isPublished ? 'success' : 'warning'} className="m-0 rounded-md">
                    {exam.isPublished ? 'Ochiq' : 'Qoralama'}
                  </Tag>
                </div>

                <h3 className="text-base font-bold text-[#0F172A]">{exam.title}</h3>

                <div className="flex flex-wrap gap-3 text-xs text-[#475569]">
                  <span className="inline-flex items-center gap-1">
                    <ClockCircleOutlined />
                    {exam.durationMinutes} daqiqa
                  </span>
                  <span>•</span>
                  <span>O‘tish: {exam.passingScore}%</span>
                  <span>•</span>
                  <span>{exam._count?.examQuestions ?? 0} ta savol</span>
                  <span>•</span>
                  <span>{exam._count?.examAttempts ?? 0} ta topshirish</span>
                </div>
              </div>

              <Button
                type="default"
                icon={<QuestionCircleOutlined />}
                onClick={() => void openAttachModal(exam)}
                block
                className="min-h-[42px] rounded-xl font-medium"
              >
                Savollar biriktirish
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Create Exam Modal */}
      <Modal
        title="Yangi HSK imtihoni yaratish"
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        footer={null}
        width="95%"
        style={{ maxWidth: 560 }}
        destroyOnHidden
      >
        <Form<CreateExamFormValues>
          form={examForm}
          layout="vertical"
          onFinish={handleCreateExam}
          className="mt-4"
        >
          <Form.Item
            label="HSK Kursi"
            name="courseId"
            rules={[{ required: true, message: 'Kursni tanlang' }]}
          >
            <Select
              placeholder="Kursni tanlang"
              options={courses.map((c) => ({
                value: c.id,
                label: `HSK ${c.level}: ${c.title}`,
              }))}
            />
          </Form.Item>

          <Form.Item
            label="Imtihon nomi"
            name="title"
            rules={[{ required: true, message: 'Imtihon nomini kiriting' }]}
          >
            <Input placeholder="Masalan: HSK 1 Rasmiy Sinov Imtihoni" />
          </Form.Item>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Form.Item
              label="Davomiyligi (daqiqa)"
              name="durationMinutes"
              rules={[{ required: true, message: 'Vaqtni kiriting' }]}
            >
              <InputNumber min={1} max={300} className="w-full" />
            </Form.Item>

            <Form.Item
              label="O‘tish foizi (%)"
              name="passingScore"
              rules={[{ required: true, message: 'O‘tish foizini kiriting' }]}
            >
              <InputNumber min={1} max={100} className="w-full" />
            </Form.Item>
          </div>

          <Form.Item label="Nashr holati" name="isPublished" valuePropName="checked">
            <Switch checkedChildren="Ochiq" unCheckedChildren="Qoralama" />
          </Form.Item>

          <div className="flex justify-end gap-3 pt-2">
            <Button onClick={() => setCreateOpen(false)} className="min-h-[42px] rounded-xl">
              Bekor qilish
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={creating}
              icon={<FileDoneOutlined />}
              className="min-h-[42px] rounded-xl"
            >
              Yaratish
            </Button>
          </div>
        </Form>
      </Modal>

      {/* Attach Questions Modal */}
      <Modal
        title={`Savollar biriktirish — ${attachExam?.title ?? ''}`}
        open={Boolean(attachExam)}
        onCancel={() => setAttachExam(null)}
        footer={null}
        width="95%"
        style={{ maxWidth: 680 }}
        destroyOnHidden
      >
        <div className="space-y-4 mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              placeholder="Kursni tanlang"
              defaultValue={attachExam?.courseId}
              onChange={(val) => void handleSelectCourseForQuestions(val)}
              options={courses.map((c) => ({
                value: c.id,
                label: `HSK ${c.level}: ${c.title}`,
              }))}
            />
            <Select
              placeholder="Darsni tanlang"
              onChange={(val) => void handleSelectLessonForQuestions(val)}
              options={lessons.map((l) => ({
                value: l.id,
                label: `${l.number}-dars: ${l.title}`,
              }))}
            />
          </div>

          {loadingQuestions ? (
            <div className="py-8 flex justify-center">
              <Spin />
            </div>
          ) : lessonQuestions.length === 0 ? (
            <Empty description="Darsni tanlang yoki bu darsda savollar yo‘q" className="py-6" />
          ) : (
            <div className="max-h-72 overflow-y-auto space-y-2 border border-[#E2E8F0] rounded-xl p-3 bg-[#F8FAFC]">
              <Checkbox.Group
                value={selectedQuestionIds}
                onChange={(vals) => setSelectedQuestionIds(vals as string[])}
                className="w-full space-y-2"
              >
                {lessonQuestions.map((q) => (
                  <div
                    key={q.id}
                    className="p-2.5 rounded-lg bg-white border border-[#E2E8F0] flex items-start gap-2"
                  >
                    <Checkbox value={q.id} className="mt-0.5" />
                    <div className="text-sm text-[#0F172A] font-hanzi">
                      {q.prompt}{' '}
                      <span className="text-xs text-[#475569]">({q.points} ball)</span>
                    </div>
                  </div>
                ))}
              </Checkbox.Group>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button onClick={() => setAttachExam(null)} className="min-h-[42px] rounded-xl">
              Bekor qilish
            </Button>
            <Button
              type="primary"
              loading={attaching}
              disabled={selectedQuestionIds.length === 0}
              onClick={handleAttachSubmit}
              className="min-h-[42px] rounded-xl"
            >
              Tanlanganlarni biriktirish ({selectedQuestionIds.length})
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
