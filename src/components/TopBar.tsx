import React from 'react';
import { Lock, ArrowLeft } from 'lucide-react';

interface TopBarProps {
  currentPath: '/' | '/admin';
  onNavigate: (path: '/' | '/admin', hash?: string) => void;
}

export const TopBar: React.FC<TopBarProps> = ({ currentPath, onNavigate }) => {
  return (
    <header className="border-b border-[#E7E2DA] bg-[#FAF8F5]/95 backdrop-blur-sm sticky top-0 z-30">
      <div className="max-w-6xl mx-auto px-4 sm:px-8 h-16 flex items-center justify-between gap-8">
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault();
            onNavigate('/');
          }}
          className="font-display text-lg sm:text-xl font-semibold tracking-tight text-[#1C1613] whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3A1D] rounded"
        >
          Duelo de Brownies
        </a>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-[#5C524B]">
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              onNavigate('/', '#votacion');
            }}
            className={`hover:text-[#1C1613] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 ${
              currentPath === '/' ? 'text-[#1C1613] underline' : ''
            }`}
          >
            Votación
          </a>
          <a
            href="/#reglas"
            onClick={(e) => {
              e.preventDefault();
              onNavigate('/', '#reglas');
            }}
            className="hover:text-[#1C1613] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Reglas
          </a>
          <a
            href="/#participantes"
            onClick={(e) => {
              e.preventDefault();
              onNavigate('/', '#participantes');
            }}
            className="hover:text-[#1C1613] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Participantes
          </a>
          <a
            href="/admin"
            onClick={(e) => {
              e.preventDefault();
              onNavigate('/admin');
            }}
            className={`hover:text-[#1C1613] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 ${
              currentPath === '/admin' ? 'text-[#1C1613] underline' : ''
            }`}
          >
            Panel Admin
          </a>
        </nav>

        <div className="flex items-center shrink-0">
          {currentPath === '/' ? (
            <button
              type="button"
              onClick={() => onNavigate('/admin')}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-medium text-white bg-[#1C1613] hover:bg-[#332924] rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#7C3A1D] cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Acceso Admin</span>
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
