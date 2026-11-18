import React from 'react';
import { motion, MotionConfig } from 'motion/react';

interface DancingSkeletonProps {
  label?: string;
  tone?: 'light' | 'imperial';
}

export const DancingSkeleton: React.FC<DancingSkeletonProps> = ({
  label = 'Esqueleto haciendo backflip',
  tone = 'light',
}) => {
  const flipTimes = [0, 0.14, 0.28, 0.48, 0.68, 0.8, 0.9, 1];
  const boneStroke = tone === 'imperial' ? '#F6DCA8' : '#1C1613';
  const boneFill = tone === 'imperial' ? '#271210' : '#FAF8F5';
  const shadowFill = tone === 'imperial' ? '#0D0505' : '#E2DBD1';

  return (
    <MotionConfig reducedMotion="user">
      <div
        className="w-40 h-48 mx-auto flex flex-col items-center justify-center select-none overflow-visible"
        aria-label={label}
        role="img"
      >
        <svg
          viewBox="0 -28 160 212"
          className="w-full h-full overflow-visible"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Ground shadow synced to backflip jump height */}
          <motion.ellipse
            cx="80"
            cy="170"
            rx="34"
            ry="6"
            fill={shadowFill}
            animate={{
              scaleX: [1, 1.16, 0.45, 0.32, 0.62, 1.12, 0.9, 1],
              opacity: [0.7, 0.85, 0.25, 0.18, 0.42, 0.8, 0.6, 0.7],
            }}
            transition={{
              duration: 2.2,
              times: flipTimes,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            style={{ transformOrigin: '80px 170px' }}
          />

          {/* Main jump + 360-degree backflip group */}
          <motion.g
            animate={{
              y: [0, 7, -42, -52, -18, 4, -6, 0],
              rotate: [0, 12, -125, -250, -360, -360, -352, -360],
            }}
            transition={{
              duration: 2.2,
              times: flipTimes,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            style={{ transformOrigin: '80px 104px' }}
          >
            {/* Left Leg */}
            <motion.g
              animate={{ rotate: [-14, 28, -14] }}
              transition={{ duration: 0.55, repeat: Infinity, ease: 'easeInOut' }}
              style={{ transformOrigin: '70px 115px' }}
            >
              <line
                x1="70"
                y1="115"
                x2="60"
                y2="140"
                stroke={boneStroke}
                strokeWidth="5"
                strokeLinecap="round"
              />
              <motion.g
                animate={{ rotate: [12, -32, 12] }}
                transition={{ duration: 0.55, repeat: Infinity, ease: 'easeInOut' }}
                style={{ transformOrigin: '60px 140px' }}
              >
                <line
                  x1="60"
                  y1="140"
                  x2="56"
                  y2="162"
                  stroke={boneStroke}
                  strokeWidth="4.5"
                  strokeLinecap="round"
                />
                <line
                  x1="56"
                  y1="162"
                  x2="45"
                  y2="164"
                  stroke={boneStroke}
                  strokeWidth="4.5"
                  strokeLinecap="round"
                />
              </motion.g>
              <circle cx="60" cy="140" r="3" fill={boneFill} stroke={boneStroke} strokeWidth="2" />
            </motion.g>

            {/* Right Leg */}
            <motion.g
              animate={{ rotate: [28, -14, 28] }}
              transition={{ duration: 0.55, repeat: Infinity, ease: 'easeInOut' }}
              style={{ transformOrigin: '90px 115px' }}
            >
              <line
                x1="90"
                y1="115"
                x2="100"
                y2="140"
                stroke={boneStroke}
                strokeWidth="5"
                strokeLinecap="round"
              />
              <motion.g
                animate={{ rotate: [-32, 12, -32] }}
                transition={{ duration: 0.55, repeat: Infinity, ease: 'easeInOut' }}
                style={{ transformOrigin: '100px 140px' }}
              >
                <line
                  x1="100"
                  y1="140"
                  x2="104"
                  y2="162"
                  stroke={boneStroke}
                  strokeWidth="4.5"
                  strokeLinecap="round"
                />
                <line
                  x1="104"
                  y1="162"
                  x2="115"
                  y2="164"
                  stroke={boneStroke}
                  strokeWidth="4.5"
                  strokeLinecap="round"
                />
              </motion.g>
              <circle cx="100" cy="140" r="3" fill={boneFill} stroke={boneStroke} strokeWidth="2" />
            </motion.g>

            {/* Pelvis */}
            <path
              d="M65 106 C65 101, 95 101, 95 106 L92 117 C86 113, 74 113, 68 117 Z"
              fill={boneFill}
              stroke={boneStroke}
              strokeWidth="3.5"
              strokeLinejoin="round"
            />

            {/* Spine */}
            <line
              x1="80"
              y1="62"
              x2="80"
              y2="105"
              stroke={boneStroke}
              strokeWidth="5"
              strokeLinecap="round"
            />

            {/* Ribcage */}
            <path
              d="M62 70 C62 66, 98 66, 98 70"
              stroke={boneStroke}
              strokeWidth="4.5"
              strokeLinecap="round"
            />
            <path
              d="M64 78 C70 81, 90 81, 96 78"
              stroke={boneStroke}
              strokeWidth="3.5"
              strokeLinecap="round"
            />
            <path
              d="M66 86 C72 89, 88 89, 94 86"
              stroke={boneStroke}
              strokeWidth="3.5"
              strokeLinecap="round"
            />
            <path
              d="M69 94 C74 96, 86 96, 91 94"
              stroke={boneStroke}
              strokeWidth="3"
              strokeLinecap="round"
            />

            {/* Left Arm */}
            <motion.g
              animate={{ rotate: [38, -42, 38] }}
              transition={{ duration: 0.55, repeat: Infinity, ease: 'easeInOut' }}
              style={{ transformOrigin: '60px 69px' }}
            >
              <line
                x1="60"
                y1="69"
                x2="38"
                y2="82"
                stroke={boneStroke}
                strokeWidth="4.5"
                strokeLinecap="round"
              />
              <motion.g
                animate={{ rotate: [30, -25, 30] }}
                transition={{ duration: 0.55, repeat: Infinity, ease: 'easeInOut' }}
                style={{ transformOrigin: '38px 82px' }}
              >
                <line
                  x1="38"
                  y1="82"
                  x2="28"
                  y2="58"
                  stroke={boneStroke}
                  strokeWidth="4"
                  strokeLinecap="round"
                />
                <circle cx="27" cy="54" r="4" fill={boneFill} stroke={boneStroke} strokeWidth="2.5" />
              </motion.g>
              <circle cx="38" cy="82" r="2.8" fill={boneFill} stroke={boneStroke} strokeWidth="2" />
            </motion.g>

            {/* Right Arm */}
            <motion.g
              animate={{ rotate: [-42, 38, -42] }}
              transition={{ duration: 0.55, repeat: Infinity, ease: 'easeInOut' }}
              style={{ transformOrigin: '100px 69px' }}
            >
              <line
                x1="100"
                y1="69"
                x2="122"
                y2="82"
                stroke={boneStroke}
                strokeWidth="4.5"
                strokeLinecap="round"
              />
              <motion.g
                animate={{ rotate: [-25, 30, -25] }}
                transition={{ duration: 0.55, repeat: Infinity, ease: 'easeInOut' }}
                style={{ transformOrigin: '122px 82px' }}
              >
                <line
                  x1="122"
                  y1="82"
                  x2="132"
                  y2="58"
                  stroke={boneStroke}
                  strokeWidth="4"
                  strokeLinecap="round"
                />
                <circle cx="133" cy="54" r="4" fill={boneFill} stroke={boneStroke} strokeWidth="2.5" />
              </motion.g>
              <circle cx="122" cy="82" r="2.8" fill={boneFill} stroke={boneStroke} strokeWidth="2" />
            </motion.g>

            {/* Skull */}
            <motion.g
              animate={{ rotate: [7, -7, 7] }}
              transition={{ duration: 0.45, repeat: Infinity, ease: 'easeInOut' }}
              style={{ transformOrigin: '80px 56px' }}
            >
              <path
                d="M62 36 C62 21, 98 21, 98 36 C98 44, 93 48, 91 52 L91 58 L69 58 L69 52 C67 48, 62 44, 62 36 Z"
                fill={boneFill}
                stroke={boneStroke}
                strokeWidth="3.5"
                strokeLinejoin="round"
              />
              <circle cx="72" cy="37" r="4.5" fill={boneStroke} />
              <circle cx="88" cy="37" r="4.5" fill={boneStroke} />
              <path d="M80 42 L77.5 47 L82.5 47 Z" fill={boneStroke} />
              <line x1="74" y1="53" x2="74" y2="58" stroke={boneStroke} strokeWidth="2" />
              <line x1="80" y1="53" x2="80" y2="58" stroke={boneStroke} strokeWidth="2" />
              <line x1="86" y1="53" x2="86" y2="58" stroke={boneStroke} strokeWidth="2" />
            </motion.g>
          </motion.g>
        </svg>
      </div>
    </MotionConfig>
  );
};
