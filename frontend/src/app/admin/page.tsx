'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  App as AntdApp,
  Button,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Spin,
  Switch,
  Tag,
} from 'antd';
import {
  BookOutlined,
  DeleteOutlined,
  EditOutlined,
  FileTextOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import api from '@/lib/api';
import type { Course, Lesson } from '@/types';

interface CourseFormValues {
  level: number;
  title: string;
  description?: string;
  order: number;
  isPublished: boolean;
}

interface LessonFormValues {
  number: number;
  title: string;
  isPublished: boolean;
}

export default function AdminCoursesPage() {
  const { message } = AntdApp.useApp();
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);

  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loadingLessons, setLoadingLessons] = useState(false);

  const [courseModalOpen, setCourseModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [savingCourse, setSavingCourse] = useState(false);
  const [courseForm] = Form.useForm<CourseFormValues>();

  const [lessonModalOpen, setLessonModalOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [savingLesson, setSavingLesson] = useState(false);
  const [lessonForm] = Form.useForm<LessonFormValues>();

  const fetchCourses = useCallback(async () => {
    try {
      const res = await api.get<{ courses: Course[] }>('/api/courses');
      const list = res.data.courses;
      setCourses(list);
      setSelectedCourse((prev) => {
        if (prev) {
          const updated = list.find((c) => c.id === prev.id);
          if (updated) return updated;
        }
        return list[0] ?? null;
      });
    } catch {
      message.error('Kurslarni yuklashda xatolik yuz berdi');
    } finally {
      setLoadingCourses(false);
    }
  }, [message]);

  const fetchLessons = useCallback(
    async (courseId: string) => {
      try {
        const res = await api.get<{ lessons: Lesson[] }>(`/api/courses/${courseId}/lessons`);
        setLessons(res.data.lessons);
      } catch {
        message.error('Darslarni yuklashda xatolik yuz berdi');
      } finally {
        setLoadingLessons(false);
      }
    },
    [message]
  );

  useEffect(() => {
    let active = true;
    async function loadInitialCourses() {
      try {
        const res = await api.get<{ courses: Course[] }>('/api/courses');
        if (!active) return;
        const list = res.data.courses;
        setCourses(list);
        setSelectedCourse((prev) => {
          if (prev) {
            const updated = list.find((c) => c.id === prev.id);
            if (updated) return updated;
          }
          return list[0] ?? null;
        });
      } catch {
        if (active) message.error('Kurslarni yuklashda xatolik yuz berdi');
      } finally {
        if (active) setLoadingCourses(false);
      }
    }
    void loadInitialCourses();
    return () => {
      active = false;
    };
  }, [message]);

  useEffect(() => {
    if (!selectedCourse) return;
    const courseId = selectedCourse.id;
    let active = true;
    async function loadLessons() {
      try {
        const res = await api.get<{ lessons: Lesson[] }>(`/api/courses/${courseId}/lessons`);
        if (active) setLessons(res.data.lessons);
      } catch {
        if (active) message.error('Darslarni yuklashda xatolik yuz berdi');
      } finally {
        if (active) setLoadingLessons(false);
      }
    }
    void loadLessons();
    return () => {
      active = false;
    };
  }, [selectedCourse, message]);

  function openCreateCourse() {
    setEditingCourse(null);
    courseForm.setFieldsValue({
      level: courses.length + 1 <= 6 ? courses.length + 1 : 1,
      title: '',
      description: '',
      order: courses.length + 1,
      isPublished: false,
    });
    setCourseModalOpen(true);
  }

  function openEditCourse(course: Course) {
    setEditingCourse(course);
    courseForm.setFieldsValue({
      level: course.level,
      title: course.title,
      description: course.description ?? '',
      order: course.order,
      isPublished: course.isPublished,
    });
    setCourseModalOpen(true);
  }

  async function handleSaveCourse(values: CourseFormValues) {
    setSavingCourse(true);
    try {
      if (editingCourse) {
        await api.patch(`/api/courses/${editingCourse.id}`, values);
        message.success('Kurs yangilandi');
      } else {
        await api.post('/api/courses', values);
        message.success('Yangi kurs yaratildi');
      }
      setCourseModalOpen(false);
      await fetchCourses();
    } catch {
      message.error('Kursni saqlashda xatolik yuz berdi');
    } finally {
      setSavingCourse(false);
    }
  }

  async function handleDeleteCourse(courseId: string) {
    try {
      await api.delete(`/api/courses/${courseId}`);
      message.success('Kurs o‘chirildi');
      if (selectedCourse?.id === courseId) {
        setSelectedCourse(null);
      }
      await fetchCourses();
    } catch {
      message.error('Kursni o‘chirishda xatolik yuz berdi');
    }
  }

  function openCreateLesson() {
    setEditingLesson(null);
    lessonForm.setFieldsValue({
      number: lessons.length + 1,
      title: '',
      isPublished: false,
    });
    setLessonModalOpen(true);
  }

  function openEditLesson(lesson: Lesson) {
    setEditingLesson(lesson);
    lessonForm.setFieldsValue({
      number: lesson.number,
      title: lesson.title,
      isPublished: lesson.isPublished,
    });
    setLessonModalOpen(true);
  }

  async function handleSaveLesson(values: LessonFormValues) {
    if (!selectedCourse) return;
    setSavingLesson(true);
    try {
      if (editingLesson) {
        await api.patch(`/api/lessons/${editingLesson.id}`, values);
        message.success('Dars yangilandi');
        setLessonModalOpen(false);
        await Promise.all([fetchLessons(selectedCourse.id), fetchCourses()]);
      } else {
        const res = await api.post<{ lesson: Lesson }>('/api/lessons', {
          ...values,
          courseId: selectedCourse.id,
        });
        setLessonModalOpen(false);
        message.success('Yangi dars yaratildi! Muharrirga yo‘naltirilmoqda...');
        router.push(`/admin/lessons/${res.data.lesson.id}`);
      }
    } catch {
      message.error('Darsni saqlashda xatolik yuz berdi');
    } finally {
      setSavingLesson(false);
    }
  }

  async function handleDeleteLesson(lessonId: string) {
    if (!selectedCourse) return;
    try {
      await api.delete(`/api/lessons/${lessonId}`);
      message.success('Dars o‘chirildi');
      await Promise.all([fetchLessons(selectedCourse.id), fetchCourses()]);
    } catch {
      message.error('Darsni o‘chirishda xatolik yuz berdi');
    }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#0F172A]">Kurslar va Darslar</h1>
          <p className="text-sm text-[#475569] mt-1">
            HSK 1–6 kurslarini boshqaring, darslar va mashqlar kontentini tahrirlang
          </p>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={openCreateCourse}
          className="min-h-[42px] rounded-xl self-start sm:self-auto"
        >
          Yangi kurs qo‘shish
        </Button>
      </div>

      {/* Courses Section */}
      {loadingCourses ? (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-12 flex justify-center">
          <Spin size="large" />
        </div>
      ) : courses.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-10">
          <Empty description="Hozircha kurslar mavjud emas" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
          {courses.map((course) => {
            const isSelected = selectedCourse?.id === course.id;
            return (
              <div
                key={course.id}
                onClick={() => setSelectedCourse(course)}
                className={`cursor-pointer bg-white rounded-2xl border p-5 transition-all flex flex-col justify-between gap-4 ${
                  isSelected
                    ? 'border-[#DC2626] ring-2 ring-[#DC2626]/20 shadow-md'
                    : 'border-[#E2E8F0] hover:border-[#DC2626]/50 hover:shadow-sm'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-[#FEF2F2] text-[#DC2626] text-xs font-bold border border-[#FECACA]">
                      HSK {course.level}
                    </span>
                    <Tag
                      color={course.isPublished ? 'success' : 'warning'}
                      className="m-0 rounded-md"
                    >
                      {course.isPublished ? 'Nashr etilgan' : 'Qoralama'}
                    </Tag>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-[#0F172A] line-clamp-1">
                      {course.title}
                    </h3>
                    {course.description && (
                      <p className="text-xs text-[#475569] mt-1 line-clamp-2">
                        {course.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-[#E2E8F0] flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-[#475569] inline-flex items-center gap-1.5">
                    <BookOutlined />
                    {course._count?.lessons ?? 0} ta dars
                  </span>
                  <div
                    className="flex items-center gap-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Button
                      size="small"
                      type="text"
                      icon={<EditOutlined />}
                      onClick={() => openEditCourse(course)}
                      aria-label="Kursni tahrirlash"
                    />
                    <Popconfirm
                      title="Kursni o‘chirishni tasdiqlaysizmi?"
                      description="Ichidagi barcha darslar ham o‘chiriladi."
                      onConfirm={() => handleDeleteCourse(course.id)}
                      okText="Ha, o‘chirish"
                      cancelText="Bekor qilish"
                    >
                      <Button
                        size="small"
                        type="text"
                        danger
                        icon={<DeleteOutlined />}
                        aria-label="Kursni o‘chirish"
                      />
                    </Popconfirm>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Selected Course Lessons */}
      {selectedCourse && (
        <section className="bg-white rounded-2xl border border-[#E2E8F0] p-5 sm:p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#DC2626] uppercase tracking-wider">
                  HSK {selectedCourse.level}
                </span>
                <span className="text-[#E2E8F0]">•</span>
                <span className="text-xs text-[#475569]">Darslar ro‘yxati</span>
              </div>
              <h2 className="text-xl font-bold text-[#0F172A] mt-0.5">{selectedCourse.title}</h2>
            </div>

            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={openCreateLesson}
              className="min-h-[42px] rounded-xl self-start sm:self-auto"
            >
              Yangi dars qo‘shish
            </Button>
          </div>

          {loadingLessons ? (
            <div className="py-10 flex justify-center">
              <Spin />
            </div>
          ) : lessons.length === 0 ? (
            <Empty description="Bu kursda hali darslar yo‘q" className="py-8" />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {lessons.map((lesson) => (
                <div
                  key={lesson.id}
                  onClick={() => router.push(`/admin/lessons/${lesson.id}`)}
                  className="cursor-pointer rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 sm:p-5 flex flex-col justify-between gap-4 hover:border-[#DC2626]/60 hover:shadow-sm transition-all"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-[#DC2626] bg-[#FEF2F2] px-2.5 py-1 rounded-lg border border-[#FECACA]">
                        {lesson.number}-dars
                      </span>
                      <Tag
                        color={lesson.isPublished ? 'success' : 'warning'}
                        className="m-0 rounded-md"
                      >
                        {lesson.isPublished ? 'Nashr etilgan' : 'Qoralama'}
                      </Tag>
                    </div>
                    <h3 className="text-base font-semibold text-[#0F172A]">{lesson.title}</h3>
                  </div>

                  <div
                    className="flex items-center justify-between gap-2 pt-3 border-t border-[#E2E8F0]"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Link href={`/admin/lessons/${lesson.id}`} className="flex-1">
                      <Button
                        type="default"
                        icon={<FileTextOutlined />}
                        block
                        className="min-h-[40px] rounded-xl font-medium"
                      >
                        Kontentni tahrirlash
                      </Button>
                    </Link>

                    <Button
                      type="text"
                      icon={<EditOutlined />}
                      onClick={() => openEditLesson(lesson)}
                      aria-label="Darsni tahrirlash"
                      className="min-h-[40px] rounded-xl"
                    />

                    <Popconfirm
                      title="Darsni o‘chirishni tasdiqlaysizmi?"
                      onConfirm={() => handleDeleteLesson(lesson.id)}
                      okText="Ha"
                      cancelText="Yo‘q"
                    >
                      <Button
                        type="text"
                        danger
                        icon={<DeleteOutlined />}
                        aria-label="Darsni o‘chirish"
                        className="min-h-[40px] rounded-xl"
                      />
                    </Popconfirm>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Course Modal */}
      <Modal
        title={editingCourse ? 'Kursni tahrirlash' : 'Yangi kurs qo‘shish'}
        open={courseModalOpen}
        onCancel={() => setCourseModalOpen(false)}
        footer={null}
        width="95%"
        style={{ maxWidth: 640 }}
        destroyOnHidden
      >
        <Form<CourseFormValues>
          form={courseForm}
          layout="vertical"
          onFinish={handleSaveCourse}
          className="mt-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Form.Item
              label="HSK Darajasi"
              name="level"
              rules={[{ required: true, message: 'Darajani kiriting' }]}
            >
              <InputNumber min={1} max={9} className="w-full" />
            </Form.Item>

            <Form.Item
              label="Tartib raqami"
              name="order"
              rules={[{ required: true, message: 'Tartib raqamini kiriting' }]}
            >
              <InputNumber min={0} className="w-full" />
            </Form.Item>
          </div>

          <Form.Item
            label="Kurs nomi"
            name="title"
            rules={[{ required: true, message: 'Kurs nomini kiriting' }]}
          >
            <Input placeholder="Masalan: HSK 1 — Boshlang'ich daraja" />
          </Form.Item>

          <Form.Item label="Tavsif" name="description">
            <Input.TextArea rows={3} placeholder="Kurs haqida qisqacha ma'lumot" />
          </Form.Item>

          <Form.Item label="Nashr holati" name="isPublished" valuePropName="checked">
            <Switch checkedChildren="Nashr etilgan" unCheckedChildren="Qoralama" />
          </Form.Item>

          <div className="flex justify-end gap-3 pt-2">
            <Button onClick={() => setCourseModalOpen(false)} className="min-h-[42px] rounded-xl">
              Bekor qilish
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={savingCourse}
              className="min-h-[42px] rounded-xl"
            >
              Saqlash
            </Button>
          </div>
        </Form>
      </Modal>

      {/* Lesson Modal */}
      <Modal
        title={editingLesson ? 'Darsni tahrirlash' : 'Yangi dars qo‘shish'}
        open={lessonModalOpen}
        onCancel={() => setLessonModalOpen(false)}
        footer={null}
        width="95%"
        style={{ maxWidth: 560 }}
        destroyOnHidden
      >
        <Form<LessonFormValues>
          form={lessonForm}
          layout="vertical"
          onFinish={handleSaveLesson}
          className="mt-4"
        >
          <Form.Item
            label="Dars raqami"
            name="number"
            rules={[{ required: true, message: 'Dars raqamini kiriting' }]}
          >
            <InputNumber min={1} className="w-full" />
          </Form.Item>

          <Form.Item
            label="Dars sarlavhasi"
            name="title"
            rules={[{ required: true, message: 'Dars sarlavhasini kiriting' }]}
          >
            <Input placeholder="Masalan: Salomlashish va tanishish" />
          </Form.Item>

          <Form.Item label="Nashr holati" name="isPublished" valuePropName="checked">
            <Switch checkedChildren="Nashr etilgan" unCheckedChildren="Qoralama" />
          </Form.Item>

          <div className="flex justify-end gap-3 pt-2">
            <Button onClick={() => setLessonModalOpen(false)} className="min-h-[42px] rounded-xl">
              Bekor qilish
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={savingLesson}
              className="min-h-[42px] rounded-xl"
            >
              {editingLesson ? 'Saqlash' : 'Yaratish va tahrirlash'}
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
