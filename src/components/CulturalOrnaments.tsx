import React from 'react';
import { motion, MotionConfig } from 'motion/react';

export const ChineseLanternPair: React.FC = () => {
  return (
    <MotionConfig reducedMotion="user">
      <div
        className="flex items-start justify-end gap-4 select-none pointer-events-none"
        aria-hidden="true"
      >
        {[0, 1].map((idx) => (
          <motion.svg
            key={idx}
            width="44"
            height="72"
            viewBox="0 0 44 72"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            animate={{ rotate: idx === 0 ? [-3, 3, -3] : [3, -3, 3] }}
            transition={{
              duration: 4.2 + idx * 0.6,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            style={{ transformOrigin: '22px 0px' }}
          >
            {/* Hanging cord */}
            <line x1="22" y1="0" x2="22" y2="10" stroke="#E5B85C" strokeWidth="1.5" />
            {/* Top gold cap */}
            <rect x="14" y="10" width="16" height="4" rx="1.5" fill="#E5B85C" />
            {/* Red silk lantern body */}
            <ellipse cx="22" cy="29" rx="15" ry="15" fill="#C81E1E" stroke="#E5B85C" strokeWidth="1.5" />
            {/* Ribs */}
            <ellipse cx="22" cy="29" rx="9" ry="15" stroke="#991B1B" strokeWidth="1" />
            <line x1="22" y1="14" x2="22" y2="44" stroke="#E5B85C" strokeWidth="1" opacity="0.7" />
            {/* Center character */}
            <text
              x="22"
              y="33"
              textAnchor="middle"
              fill="#F9EEDB"
              fontSize="11"
              fontWeight="700"
              fontFamily="Noto Serif SC, serif"
            >
              {idx === 0 ? '福' : '茶'}
            </text>
            {/* Bottom gold cap */}
            <rect x="15" y="43" width="14" height="4" rx="1.5" fill="#E5B85C" />
            {/* Tassels */}
            <line x1="18" y1="47" x2="17" y2="63" stroke="#E5B85C" strokeWidth="1.3" />
            <line x1="22" y1="47" x2="22" y2="67" stroke="#DC2626" strokeWidth="1.6" />
            <line x1="26" y1="47" x2="27" y2="63" stroke="#E5B85C" strokeWidth="1.3" />
          </motion.svg>
        ))}
      </div>
    </MotionConfig>
  );
};

export const VenezuelanCriolloCrest: React.FC = () => {
  const starAngles = [-56, -40, -24, -8, 8, 24, 40, 56];
  return (
    <div
      className="hidden lg:flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-[#FFFDF7] border border-[#E7DEC8] select-none"
      aria-hidden="true"
    >
      <svg
        width="44"
        height="44"
        viewBox="0 0 44 44"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <clipPath id="ve-circle">
            <circle cx="22" cy="22" r="20" />
          </clipPath>
        </defs>
        <g clipPath="url(#ve-circle)">
          <rect x="2" y="2" width="40" height="13.5" fill="#F4C430" />
          <rect x="2" y="15.5" width="40" height="13" fill="#003893" />
          <rect x="2" y="28.5" width="40" height="13.5" fill="#CF142B" />
          {starAngles.map((deg) => {
            const rad = ((deg - 90) * Math.PI) / 180;
            const cx = 22 + Math.cos(rad) * 11;
            const cy = 24.5 + Math.sin(rad) * 11;
            return (
              <circle
                key={deg}
                cx={cx}
                cy={cy}
                r="1.1"
                fill="#FFFFFF"
              />
            );
          })}
        </g>
        <circle cx="22" cy="22" r="19.5" stroke="#D8CCB4" strokeWidth="1" />
      </svg>
      <div className="text-left leading-tight">
        <p className="text-[11px] font-semibold text-[#003893]">
          Cacao de Chuao · Venezuela
        </p>
        <p className="text-[11px] text-[#5C524B]">
          Con sabor a arepa y malta fría
        </p>
      </div>
    </div>
  );
};
