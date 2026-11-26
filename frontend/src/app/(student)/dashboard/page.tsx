'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { App as AntdApp, Button, Empty, Spin, Tag } from 'antd';
import {
  BookOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  PlayCircleOutlined,
  TrophyOutlined,
} from '@ant-design/icons';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import type { Course, Lesson, MyStats, StudentGroupItem } from '@/types';

export default function StudentDashboardPage() {
  const { user } = useAuth();
  const { message } = AntdApp.useApp();

  const [stats, setStats] = useState<MyStats | null>(null);
  const [groups, setGroups] = useState<StudentGroupItem[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);

  const [loadingMain, setLoadingMain] = useState(true);
  const [loadingLessons, setLoadingLessons] = useState(false);

  useEffect(() => {
    let active = true;
    async function loadDashboard() {
      try {
        const [statsRes, groupsRes, coursesRes] = await Promise.all([
          api.get<MyStats>('/api/attempts/my-stats'),
          api.get<{ groups: StudentGroupItem[] }>('/api/groups/my'),
          api.get<{ courses: Course[] }>('/api/courses'),
        ]);
        if (!active) return;
        setStats(statsRes.data);
        setGroups(groupsRes.data.groups);
        setCourses(coursesRes.data.courses);
        if (coursesRes.data.courses[0]) {
          setSelectedCourse(coursesRes.data.courses[0]);
        }
      } catch {
        if (active) message.error('Ma‘lumotlarni yuklashda xatolik yuz berdi');
      } finally {
        if (active) setLoadingMain(false);
      }
    }
    void loadDashboard();
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

  const allAssignments = groups.flatMap((g) =>
    g.assignments.map((a) => ({
      ...a,
      groupName: g.name,
    }))
  );

  if (loadingMain) {
    return (
      <div className="min-h-[60vh] flex justify-center items-center">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Greeting */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#0F172A]">
            Salom, {user?.fullName}!
          </h1>
          <p className="text-sm text-[#475569] mt-1">
            Bugun ham yangi iyerogliflar va mashqlar bilan davom etamiz
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 sm:p-5 space-y-2">
          <div className="flex items-center justify-between text-xs font-medium text-[#475569]">
            <span>Umumiy ball</span>
            <TrophyOutlined className="text-[#D97706] text-base" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-[#0F172A]">
            {stats?.totalScore ?? 0}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 sm:p-5 space-y-2">
          <div className="flex items-center justify-between text-xs font-medium text-[#475569]">
            <span>Ishlangan savollar</span>
            <BookOutlined className="text-[#DC2626] text-base" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-[#0F172A]">
            {stats?.totalAttempts ?? 0}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 sm:p-5 space-y-2">
          <div className="flex items-center justify-between text-xs font-medium text-[#475569]">
            <span>Aniqlik foizi</span>
            <CheckCircleOutlined className="text-[#16A34A] text-base" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-[#16A34A]">
            {stats?.accuracyPercent ?? 0}%
          </div>
        </div>

        <Link
          href="/mistakes"
          className="bg-white rounded-2xl border border-[#E2E8F0] hover:border-[#DC2626]/50 p-4 sm:p-5 space-y-2 transition-colors"
        >
          <div className="flex items-center justify-between text-xs font-medium text-[#475569]">
            <span>Xatolar banki</span>
            <ExclamationCircleOutlined className="text-[#DC2626] text-base" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-[#DC2626]">
            {stats?.reviewQueueCount ?? 0}
          </div>
        </Link>
      </div>

      {/* Group Assignments (if any) */}
      {allAssignments.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg sm:text-xl font-bold text-[#0F172A]">Guruh vazifalari</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {allAssignments.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-[#E2E8F0] p-5 flex flex-col justify-between gap-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Tag color="red" className="m-0 rounded-md font-medium">
                      {item.groupName}
                    </Tag>
                    {item.dueDate && (
                      <span className="text-xs text-[#D97706] font-medium inline-flex items-center gap-1">
                        <CalendarOutlined />
                        {new Date(item.dueDate).toLocaleDateString('uz-UZ')}
                      </span>
                    )}
                  </div>
                  <h3 className="text-base font-bold text-[#0F172A]">
                    {item.lesson.number}-dars: {item.lesson.title}
                  </h3>
                </div>

                <Link href={`/lessons/${item.lessonId}`}>
                  <Button
                    type="primary"
                    icon={<PlayCircleOutlined />}
                    block
                    className="min-h-[42px] rounded-xl"
                  >
                    Darsni boshlash
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* HSK Courses & Lessons */}
      <section className="space-y-5">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-[#0F172A]">HSK 1–6 Kurslar</h2>
          <p className="text-sm text-[#475569] mt-0.5">
            O‘zingizga mos darajani tanlang va darslarni o‘rganing
          </p>
        </div>

        {courses.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-10">
            <Empty description="Hozircha nashr etilgan kurslar yo‘q" />
          </div>
        ) : (
          <>
            {/* Course Selector */}
            <div className="flex flex-wrap gap-3">
              {courses.map((course) => {
                const active = selectedCourse?.id === course.id;
                return (
                  <button
                    key={course.id}
                    type="button"
                    onClick={() => {
                      if (course.id !== selectedCourse?.id) {
                        setLoadingLessons(true);
                        setSelectedCourse(course);
                      }
                    }}
                    className={`cursor-pointer px-4 py-2.5 min-h-[44px] rounded-xl border text-sm font-semibold transition-all flex items-center gap-2 ${
                      active
                        ? 'bg-[#DC2626] text-white border-[#DC2626] shadow-sm'
                        : 'bg-white text-[#0F172A] border-[#E2E8F0] hover:border-[#DC2626]/50'
                    }`}
                  >
                    <span>HSK {course.level}</span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        active ? 'bg-white/20 text-white' : 'bg-[#F8FAFC] text-[#475569]'
                      }`}
                    >
                      {course._count?.lessons ?? 0} dars
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Lessons Grid */}
            {selectedCourse && (
              <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 sm:p-6 space-y-5">
                <div>
                  <h3 className="text-lg font-bold text-[#0F172A]">{selectedCourse.title}</h3>
                  {selectedCourse.description && (
                    <p className="text-sm text-[#475569] mt-1">{selectedCourse.description}</p>
                  )}
                </div>

                {loadingLessons ? (
                  <div className="py-10 flex justify-center">
                    <Spin />
                  </div>
                ) : lessons.length === 0 ? (
                  <Empty description="Bu kursda hali darslar mavjud emas" className="py-8" />
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {lessons.map((lesson) => (
                      <div
                        key={lesson.id}
                        className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-5 flex flex-col justify-between gap-4 hover:border-[#DC2626]/40 transition-colors"
                      >
                        <div className="space-y-2">
                          <span className="inline-block text-xs font-bold text-[#DC2626] bg-[#FEF2F2] px-2.5 py-1 rounded-lg border border-[#FECACA]">
                            {lesson.number}-dars
                          </span>
                          <h4 className="text-base font-bold text-[#0F172A]">{lesson.title}</h4>
                        </div>

                        <Link href={`/lessons/${lesson.id}`}>
                          <Button
                            type="primary"
                            icon={<PlayCircleOutlined />}
                            block
                            className="min-h-[42px] rounded-xl"
                          >
                            Darsni boshlash
                          </Button>
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
