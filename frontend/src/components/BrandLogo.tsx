'use client';

import React from 'react';

export interface BrandLogoProps {
  variant?: 'full' | 'icon' | 'light' | 'dark';
  size?: 'sm' | 'md' | 'lg';
  showSubtitle?: boolean;
  className?: string;
}

const SIZE_MAP = {
  sm: {
    iconBox: 'w-8 h-8',
    title: 'text-base',
    subtitle: 'text-[10px]',
    gap: 'gap-2',
  },
  md: {
    iconBox: 'w-10 h-10',
    title: 'text-xl',
    subtitle: 'text-xs',
    gap: 'gap-2.5',
  },
  lg: {
    iconBox: 'w-14 h-14',
    title: 'text-2xl sm:text-3xl',
    subtitle: 'text-xs sm:text-sm',
    gap: 'gap-3.5',
  },
} as const;

export function BrandLogo({
  variant = 'full',
  size = 'md',
  showSubtitle = false,
  className = '',
}: BrandLogoProps) {
  const isLight = variant === 'light';
  const showText = variant !== 'icon';
  const dims = SIZE_MAP[size];

  const primaryLeft = isLight ? '#FFFFFF' : '#B91C1C';
  const monogramLeft = isLight ? '#FFFFFF' : '#991B1B';
  const darkRight = isLight ? '#FEE2E2' : '#291C1A';
  const goldAccent = isLight ? '#FDE047' : '#D4A34B';
  const bookFill = isLight ? '#991B1B' : '#FFFFFF';
  const bookStroke = isLight ? '#FFFFFF' : '#291C1A';

  const titleColor = isLight ? 'text-white' : 'text-[#0F172A]';
  const subtitleColor = isLight ? 'text-red-100' : 'text-[#475569]';

  return (
    <div className={`inline-flex items-center ${dims.gap} shrink-0 select-none ${className}`}>
      <div className={`${dims.iconBox} aspect-square shrink-0 flex items-center justify-center`}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 120 120"
          fill="none"
          className="w-full h-full object-contain"
          aria-hidden="true"
        >
          {/* Pagoda Roof */}
          <path
            d="M60 12H35C35 16 32 19 28 21C22 24 14 26 8 25C11 31 18 35 28 36H60V12Z"
            fill={primaryLeft}
          />
          <path
            d="M60 12H85C85 16 88 19 92 21C98 24 106 26 112 25C109 31 102 35 92 36H60V12Z"
            fill={darkRight}
          />
          <path
            d="M36 16L24 34M45 14L38 34M53 14L50 34"
            stroke={goldAccent}
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M84 16L96 34M75 14L82 34M67 14L70 34"
            stroke={goldAccent}
            strokeWidth="2"
            strokeLinecap="round"
          />

          {/* Outer Frame */}
          <path
            d="M20 40V88C20 93 24 97 29 97H49"
            stroke={primaryLeft}
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          <path
            d="M100 40V88C100 93 96 97 91 97H71"
            stroke={goldAccent}
            strokeWidth="3.5"
            strokeLinecap="round"
          />

          {/* LU Monogram */}
          <path d="M29 42V88H56V80H38V42H29Z" fill={monogramLeft} />
          <path
            d="M64 88H79C87 88 91 83 91 75V42H82V74C82 78 79 80 75 80H64V88Z"
            fill={darkRight}
          />

          {/* Open Book & Sun */}
          <path
            d="M60 55C54 51 45 51 41 53V73C46 71 54 71 60 76C66 71 74 71 79 73V53C75 51 66 51 60 55Z"
            fill={bookFill}
            stroke={bookStroke}
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          <path d="M60 55V76" stroke={goldAccent} strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="60" cy="44" r="4.5" fill={goldAccent} />

          {/* Hanging Lantern */}
          <line x1="103" y1="35" x2="103" y2="44" stroke={goldAccent} strokeWidth="2" />
          <ellipse
            cx="103"
            cy="53"
            rx="6.5"
            ry="8.5"
            fill={bookFill}
            stroke={goldAccent}
            strokeWidth="2.2"
          />
          <line x1="103" y1="44.5" x2="103" y2="61.5" stroke={goldAccent} strokeWidth="1.5" />
          <line
            x1="103"
            y1="61.5"
            x2="103"
            y2="70"
            stroke={goldAccent}
            strokeWidth="2"
            strokeLinecap="round"
          />

          {/* Endless Knot */}
          <circle cx="60" cy="97" r="4" stroke={primaryLeft} strokeWidth="2.2" />
          <circle cx="53" cy="97" r="2.8" stroke={primaryLeft} strokeWidth="2" />
          <circle cx="67" cy="97" r="2.8" stroke={goldAccent} strokeWidth="2" />
          <circle cx="60" cy="90" r="2.6" stroke={primaryLeft} strokeWidth="2" />
          <circle cx="60" cy="104" r="2.6" stroke={goldAccent} strokeWidth="2" />
        </svg>
      </div>

      {showText && (
        <div className="flex flex-col leading-none">
          <span className={`font-bold tracking-tight ${dims.title} ${titleColor}`}>
            LaoshiUz
          </span>
          {showSubtitle && (
            <span className={`font-medium mt-1 ${dims.subtitle} ${subtitleColor}`}>
              Xitoy tili va HSK
            </span>
          )}
        </div>
      )}
    </div>
  );
}
