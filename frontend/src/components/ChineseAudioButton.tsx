'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Button } from 'antd';
import { PauseCircleOutlined, SoundOutlined } from '@ant-design/icons';

interface ChineseAudioButtonProps {
  audioUrl?: string | null;
  text?: string;
  size?: 'small' | 'middle';
  label?: string;
}

export function ChineseAudioButton({
  audioUrl,
  text,
  size = 'middle',
  label,
}: ChineseAudioButtonProps) {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  if (!audioUrl && !text) {
    return null;
  }

  function handleToggle(e: React.MouseEvent) {
    e.stopPropagation();

    if (playing) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      setPlaying(false);
      return;
    }

    if (audioUrl) {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const fullUrl = audioUrl.startsWith('http') ? audioUrl : `${baseUrl}${audioUrl}`;

      if (audioRef.current) {
        audioRef.current.pause();
      }
      const audio = new Audio(fullUrl);
      audioRef.current = audio;
      setPlaying(true);

      audio.onended = () => setPlaying(false);
      audio.onerror = () => setPlaying(false);
      void audio.play().catch(() => setPlaying(false));
      return;
    }

    if (text && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'zh-CN';
      utterance.rate = 0.85;
      utterance.onend = () => setPlaying(false);
      utterance.onerror = () => setPlaying(false);
      setPlaying(true);
      window.speechSynthesis.speak(utterance);
    }
  }

  return (
    <Button
      type={playing ? 'primary' : 'default'}
      size={size}
      onClick={handleToggle}
      icon={
        playing ? (
          <PauseCircleOutlined className="animate-pulse" />
        ) : (
          <SoundOutlined />
        )
      }
      className={`rounded-xl inline-flex items-center gap-1.5 ${
        playing ? 'shadow-sm' : 'border-[#E2E8F0] text-[#0F172A]'
      }`}
    >
      {label ?? (playing ? 'To‘xtatish' : 'Tinglash')}
    </Button>
  );
}
