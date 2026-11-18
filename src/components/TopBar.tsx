import React from 'react';
import { ArrowLeft } from 'lucide-react';
import type { VoteLanguage } from '../types/contest';

interface TopBarProps {
  currentPath: '/' | '/admin';
  language: VoteLanguage;
  onNavigate: (path: '/' | '/admin', hash?: string) => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  currentPath,
  language,
  onNavigate,
}) => {
  const isZh = currentPath === '/' && language === 'zh';
  const isVe = currentPath === '/' && language === 'es';

  return (
    <header
      className={`border-b backdrop-blur-sm sticky top-0 z-30 transition-colors duration-300 ${
        isZh
          ? 'border-[#D99B26]/40 bg-[#180505]/95 text-[#F9EEDB]'
          : isVe
            ? 'border-[#E7DEC8] bg-[#FFFBF2]/95 text-[#1C1613]'
            : 'border-[#E7E2DA] bg-[#FAF8F5]/95 text-[#1C1613]'
      }`}
    >
      {/* Subtle 3px cultural top ribbon */}
      {isVe && (
        <div className="h-[3px] w-full grid grid-cols-3" aria-hidden="true">
          <div className="bg-[#F4C430]" />
          <div className="bg-[#003893]" />
          <div className="bg-[#CF142B]" />
        </div>
      )}
      {isZh && (
        <div className="h-[3px] w-full bg-gradient-to-r from-[#B91C1C] via-[#E5B85C] to-[#B91C1C]" aria-hidden="true" />
      )}

      <div className="max-w-6xl mx-auto px-4 sm:px-8 h-16 flex items-center justify-between gap-8">
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault();
            onNavigate('/');
          }}
          className={`text-lg sm:text-xl font-semibold tracking-tight whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 rounded ${
            isZh
              ? 'text-[#F6DCA8] focus-visible:ring-[#D99B26]'
              : 'font-display text-[#1C1613] focus-visible:ring-[#003893]'
          }`}
          style={isZh ? { fontFamily: '"Noto Serif SC", serif' } : undefined}
        >
          {isZh ? '御膳龙凤大酒楼 · 布朗尼' : isVe ? 'La Rumba del Brownie' : 'Duelo de Brownies'}
        </a>

        <nav
          className={`hidden md:flex items-center gap-6 text-sm font-medium ${
            isZh ? 'text-[#E7D4B5]' : 'text-[#5C524B]'
          }`}
        >
          <a
            href="/#votacion"
            onClick={(e) => {
              e.preventDefault();
              onNavigate('/', '#votacion');
            }}
            className={`hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 ${
              isZh
                ? 'hover:text-[#F6DCA8]'
                : `hover:text-[#003893] ${currentPath === '/' ? 'text-[#1C1613]' : ''}`
            }`}
          >
            {isZh ? '御前打分' : 'A votar pues'}
          </a>
          <a
            href="/#reglas"
            onClick={(e) => {
              e.preventDefault();
              onNavigate('/', '#reglas');
            }}
            className={`hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 ${
              isZh ? 'hover:text-[#F6DCA8]' : 'hover:text-[#003893]'
            }`}
          >
            {isZh ? '祖宗家法' : 'Las Reglas'}
          </a>
        </nav>

        <div className="flex items-center shrink-0">
          {currentPath === '/' ? (
            <button
              type="button"
              onClick={() => onNavigate('/', '#votacion')}
              className={`inline-flex items-center px-4 py-2 text-xs sm:text-sm font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 cursor-pointer ${
                isZh
                  ? 'text-[#180505] bg-[#E5B85C] hover:bg-[#D4A446] focus-visible:ring-[#E5B85C]'
                  : 'text-white bg-[#003893] hover:bg-[#00296B] focus-visible:ring-[#003893]'
              }`}
            >
              {isZh ? '速速呈上满分' : '¡Échale bola!'}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onNavigate('/')}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-medium text-[#1C1613] bg-white border border-[#D8D0C5] hover:bg-[#F3EFE9] rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#7C3A1D] cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Ir a votar</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
