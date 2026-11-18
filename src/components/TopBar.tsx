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

  return (
    <header
      className={`border-b backdrop-blur-sm sticky top-0 z-30 transition-colors duration-300 ${
        isZh
          ? 'border-[#C83228]/30 bg-[#1B0C0B]/95 text-[#F9EEDB]'
          : 'border-[#E7E2DA] bg-[#FAF8F5]/95 text-[#1C1613]'
      }`}
    >
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
              : 'font-display text-[#1C1613] focus-visible:ring-[#7C3A1D]'
          }`}
          style={isZh ? { fontFamily: '"Noto Serif SC", serif' } : undefined}
        >
          {isZh ? '御膳布朗尼品鉴会' : 'Duelo de Brownies'}
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
                : `hover:text-[#1C1613] ${currentPath === '/' ? 'text-[#1C1613]' : ''}`
            }`}
          >
            {isZh ? '评分投票' : 'Votación'}
          </a>
          <a
            href="/#reglas"
            onClick={(e) => {
              e.preventDefault();
              onNavigate('/', '#reglas');
            }}
            className={`hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 ${
              isZh ? 'hover:text-[#F6DCA8]' : 'hover:text-[#1C1613]'
            }`}
          >
            {isZh ? '大会规章' : 'Reglas'}
          </a>
        </nav>

        <div className="flex items-center shrink-0">
          {currentPath === '/' ? (
            <button
              type="button"
              onClick={() => onNavigate('/', '#votacion')}
              className={`inline-flex items-center px-4 py-2 text-xs sm:text-sm font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 cursor-pointer ${
                isZh
                  ? 'text-[#1B0C0B] bg-[#E5B85C] hover:bg-[#D4A446] focus-visible:ring-[#E5B85C]'
                  : 'text-white bg-[#7C3A1D] hover:bg-[#652E16] focus-visible:ring-[#7C3A1D]'
              }`}
            >
              {isZh ? '立即打分' : 'Votar ahora'}
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
