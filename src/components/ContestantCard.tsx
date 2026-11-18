import React, { useState } from 'react';
import { Utensils } from 'lucide-react';
import type { VoteLanguage } from '../types/contest';

interface ContestantCardProps {
  indexLabel: string;
  bakerName: string;
  subtitle: string;
  imageUrl: string;
  imageAlt: string;
  score: number | null;
  language: VoteLanguage;
  onSelectScore: (score: number) => void;
  accentTone: 'cocoa' | 'espresso';
}

const ES_SCORES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const ZH_SCORES = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

export const ZH_SCORE_LABELS: Record<number, string> = {
  0: '零',
  10: '十',
  20: '二十',
  30: '三十',
  40: '四十',
  50: '五十',
  60: '六十',
  70: '七十',
  80: '八十',
  90: '九十',
  100: '一百',
};

export function formatChineseScore(score: number): string {
  return ZH_SCORE_LABELS[score] ?? String(score);
}

export const ContestantCard: React.FC<ContestantCardProps> = ({
  indexLabel,
  bakerName,
  subtitle,
  imageUrl,
  imageAlt,
  score,
  language,
  onSelectScore,
  accentTone,
}) => {
  const [imgFailed, setImgFailed] = useState(false);

  const isZh = language === 'zh';
  const scaleOptions = isZh ? ZH_SCORES : ES_SCORES;

  const selectedButtonClass = isZh
    ? accentTone === 'cocoa'
      ? 'bg-[#B91C1C] text-[#FBF4E9] border-[#E5B85C] shadow-sm'
      : 'bg-[#3D0D0D] text-[#F6DCA8] border-[#D99B26] shadow-sm'
    : accentTone === 'cocoa'
      ? 'bg-[#003893] text-white border-[#003893] shadow-sm'
      : 'bg-[#7C3A1D] text-white border-[#7C3A1D] shadow-sm';

  return (
    <article
      className={`rounded-xl overflow-hidden flex flex-col h-full transition-colors duration-300 ${
        isZh
          ? 'bg-[#2A0B0B] border border-[#D99B26]/45 text-[#F9EEDB]'
          : 'bg-[#FFFDF8] border border-[#E7DEC8] text-[#1C1613]'
      }`}
    >
      <div
        className={`aspect-[4/3] w-full relative overflow-hidden ${
          isZh ? 'bg-[#1B0C0B]' : 'bg-[#EFEAE2]'
        }`}
      >
        {!imgFailed ? (
          <img
            src={imageUrl}
            alt={imageAlt}
            referrerPolicy="no-referrer"
            onError={() => setImgFailed(true)}
            className="w-full h-full object-cover"
          />
        ) : (
          <div
            className={`w-full h-full flex flex-col items-center justify-center p-6 text-center ${
              isZh
                ? 'bg-gradient-to-br from-[#2B1210] to-[#1B0C0B] text-[#E7D4B5]'
                : 'bg-gradient-to-br from-[#EFEAE2] to-[#E3DAD0] text-[#5C524B]'
            }`}
          >
            <Utensils className="w-8 h-8 mb-2 opacity-70" aria-hidden="true" />
            <span
              className={`text-lg font-medium ${
                isZh ? 'text-[#F6DCA8]' : 'font-display text-[#1C1613]'
              }`}
            >
              {isZh ? `${bakerName}大厨的功夫布朗尼` : `Brownie criollo de ${bakerName}`}
            </span>
          </div>
        )}
      </div>

      <div className="p-6 flex flex-col flex-1 justify-between gap-6">
        <div>
          <p
            className={`text-xs font-medium tracking-normal mb-1.5 ${
              isZh ? 'text-[#D99B26]' : 'text-[#8A7E75]'
            }`}
          >
            {indexLabel}
          </p>
          <h2
            className={`text-2xl font-semibold tracking-tight ${
              isZh ? 'text-[#F9EEDB]' : 'font-display text-[#1C1613]'
            }`}
            style={isZh ? { fontFamily: '"Noto Serif SC", serif' } : undefined}
          >
            {bakerName}
          </h2>
          <p
            className={`text-sm mt-1.5 leading-relaxed ${
              isZh ? 'text-[#E0CCA8]' : 'text-[#5C524B]'
            }`}
          >
            {subtitle}
          </p>
        </div>

        <div
          className={`pt-4 border-t ${
            isZh ? 'border-[#D99B26]/25' : 'border-[#EFE7D6]'
          }`}
        >
          <div className="flex items-baseline justify-between gap-4 mb-3">
            <span
              className={`text-sm font-semibold ${
                isZh ? 'text-[#F9EEDB]' : 'text-[#1C1613]'
              }`}
            >
              {isZh ? '你的金口御评（零至一百分）' : 'Tu nota, mi pana (0 a 10)'}
            </span>
            <span
              className={`text-sm ${
                isZh
                  ? 'text-[#E5B85C]'
                  : 'font-mono tabular-nums text-[#5C524B]'
              }`}
            >
              {score !== null ? (
                <strong
                  className={`font-semibold ${
                    isZh ? 'text-[#F6DCA8]' : 'text-[#1C1613]'
                  }`}
                >
                  {isZh
                    ? `${formatChineseScore(score)}分（满分一百）`
                    : `${score} / 10`}
                </strong>
              ) : isZh ? (
                '尚未落印'
              ) : (
                'Falta el beta'
              )}
            </span>
          </div>

          <div
            role="radiogroup"
            aria-label={
              isZh
                ? `为${bakerName}大厨的布朗尼打分（零至一百分）`
                : `Puntuación del 0 al 10 para el brownie de ${bakerName}`
            }
            className={`grid gap-1.5 ${
              isZh ? 'grid-cols-4 sm:grid-cols-6' : 'grid-cols-4 sm:grid-cols-6 xl:grid-cols-11'
            }`}
          >
            {scaleOptions.map((val) => {
              const isSelected = score === val;
              const displayLabel = isZh ? formatChineseScore(val) : String(val);

              return (
                <button
                  key={val}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  aria-label={
                    isZh
                      ? `给${bakerName}大厨打${displayLabel}分（满分一百）`
                      : `Puntuar a ${bakerName} con ${val} sobre 10`
                  }
                  onClick={() => onSelectScore(val)}
                  className={`min-h-[44px] rounded-lg border text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 cursor-pointer ${
                    isZh ? 'px-1 focus-visible:ring-[#E5B85C]' : 'font-mono tabular-nums focus-visible:ring-[#003893]'
                  } ${
                    isSelected
                      ? selectedButtonClass
                      : isZh
                        ? 'bg-[#180505] text-[#F9EEDB] border-[#D99B26]/35 hover:bg-[#3F1212] hover:border-[#E5B85C]'
                        : 'bg-[#FFFBF2] text-[#1C1613] border-[#DFD5BE] hover:bg-[#F4EBD7] hover:border-[#C2B394]'
                  }`}
                >
                  {displayLabel}
                </button>
              );
            })}
          </div>

          <div
            className={`flex items-center justify-between text-xs mt-2 gap-2 ${
              isZh ? 'text-[#C9B086]' : 'text-[#8A7E75]'
            }`}
          >
            <span>{isZh ? '零分 · 难吃哭了' : '0 · Más chimbo que lunes sin luz'}</span>
            <span className="text-right">{isZh ? '一百分 · 皇上钦点天下第一' : '10 · ¡Brutal, nivel Dios!'}</span>
          </div>
        </div>
      </div>
    </article>
  );
};
