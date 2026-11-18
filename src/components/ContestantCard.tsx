import React, { useState } from 'react';
import { Utensils } from 'lucide-react';

interface ContestantCardProps {
  indexLabel: string;
  bakerName: string;
  subtitle: string;
  imageUrl: string;
  imageAlt: string;
  score: number | null;
  onSelectScore: (score: number) => void;
  accentTone: 'cocoa' | 'espresso';
}

const SCORES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export const ContestantCard: React.FC<ContestantCardProps> = ({
  indexLabel,
  bakerName,
  subtitle,
  imageUrl,
  imageAlt,
  score,
  onSelectScore,
  accentTone,
}) => {
  const [imgFailed, setImgFailed] = useState(false);

  const selectedButtonClass =
    accentTone === 'cocoa'
      ? 'bg-[#7C3A1D] text-white border-[#7C3A1D] shadow-sm'
      : 'bg-[#1C1613] text-white border-[#1C1613] shadow-sm';

  return (
    <article className="bg-white border border-[#E7E2DA] rounded-xl overflow-hidden flex flex-col h-full">
      <div className="aspect-[4/3] w-full bg-[#EFEAE2] relative overflow-hidden">
        {!imgFailed ? (
          <img
            src={imageUrl}
            alt={imageAlt}
            referrerPolicy="no-referrer"
            onError={() => setImgFailed(true)}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-gradient-to-br from-[#EFEAE2] to-[#E3DAD0] text-[#5C524B]">
            <Utensils className="w-8 h-8 mb-2 opacity-70" aria-hidden="true" />
            <span className="font-display text-lg font-medium text-[#1C1613]">
              Brownie de {bakerName}
            </span>
          </div>
        )}
      </div>

      <div className="p-6 flex flex-col flex-1 justify-between gap-6">
        <div>
          <p className="text-xs font-medium text-[#8A7E75] tracking-normal mb-1.5">
            {indexLabel}
          </p>
          <h2 className="font-display text-2xl font-semibold text-[#1C1613] tracking-tight">
            {bakerName}
          </h2>
          <p className="text-sm text-[#5C524B] mt-1.5 leading-relaxed">
            {subtitle}
          </p>
        </div>

        <div className="pt-4 border-t border-[#F0ECE4]">
          <div className="flex items-baseline justify-between gap-4 mb-3">
            <span className="text-sm font-semibold text-[#1C1613]">
              Tu puntuación (1 a 10)
            </span>
            <span className="font-mono text-sm tabular-nums text-[#5C524B]">
              {score !== null ? (
                <strong className="text-[#1C1613] font-semibold">
                  {score} / 10
                </strong>
              ) : (
                'Sin seleccionar'
              )}
            </span>
          </div>

          <div
            role="radiogroup"
            aria-label={`Puntuación del 1 al 10 para el brownie de ${bakerName}`}
            className="grid grid-cols-5 sm:grid-cols-10 gap-1.5"
          >
            {SCORES.map((val) => {
              const isSelected = score === val;
              return (
                <button
                  key={val}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  aria-label={`Puntuar a ${bakerName} con ${val} sobre 10`}
                  onClick={() => onSelectScore(val)}
                  className={`min-h-[44px] rounded-lg border font-mono text-sm font-medium tabular-nums transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#7C3A1D] cursor-pointer ${
                    isSelected
                      ? selectedButtonClass
                      : 'bg-[#FAF8F5] text-[#1C1613] border-[#DFD8CE] hover:bg-[#EFEAE2] hover:border-[#C9BFAF]'
                  }`}
                >
                  {val}
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between text-xs text-[#8A7E75] mt-2">
            <span>1 · Muy mejorable</span>
            <span>10 · Sobresaliente</span>
          </div>
        </div>
      </div>
    </article>
  );
};
