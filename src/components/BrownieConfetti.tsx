import React, { useEffect, useRef } from 'react';

interface BrownieConfettiProps {
  tone?: 'light' | 'imperial';
  triggerKey: string;
}

type ParticleKind = 'confetti' | 'brownie' | 'chip';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  aspect: number;
  rotation: number;
  rotationSpeed: number;
  tilt: number;
  tiltSpeed: number;
  color: string;
  highlight: string;
  kind: ParticleKind;
  gravity: number;
  drag: number;
  swayPhase: number;
  swayFreq: number;
  alpha: number;
}

const LIGHT_PALETTE = [
  { color: '#3B1E14', highlight: '#5A3224' }, // dark chocolate chunk
  { color: '#5C2E1B', highlight: '#7C432B' }, // cocoa brownie
  { color: '#7C3A1D', highlight: '#9B5130' }, // baked crust
  { color: '#C27D38', highlight: '#DDA05E' }, // toasted caramel
  { color: '#E5B85C', highlight: '#F6DCA8' }, // gold foil
  { color: '#EFE5D6', highlight: '#FFFFFF' }, // sea salt flake
];

const IMPERIAL_PALETTE = [
  { color: '#E5B85C', highlight: '#FFF0C2' }, // imperial gold
  { color: '#F6DCA8', highlight: '#FFFFFF' }, // pale gold leaf
  { color: '#C83228', highlight: '#E55347' }, // imperial crimson
  { color: '#5C2E1B', highlight: '#85462B' }, // cocoa brownie
  { color: '#3B1E14', highlight: '#613524' }, // dark chocolate chip
  { color: '#F9EEDB', highlight: '#FFFFFF' }, // warm ivory
];

export const BrownieConfetti: React.FC<BrownieConfettiProps> = ({
  tone = 'light',
  triggerKey,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const palette = tone === 'imperial' ? IMPERIAL_PALETTE : LIGHT_PALETTE;
    let width = window.innerWidth;
    let height = window.innerHeight;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    window.addEventListener('resize', resize);

    const particles: Particle[] = [];

    const spawnBurst = (
      originX: number,
      originY: number,
      angleCenter: number,
      spread: number,
      count: number,
      speedMin: number,
      speedMax: number,
    ) => {
      for (let i = 0; i < count; i++) {
        const angle = angleCenter + (Math.random() - 0.5) * spread;
        const speed = speedMin + Math.random() * (speedMax - speedMin);
        const roll = Math.random();
        const kind: ParticleKind =
          roll < 0.34 ? 'brownie' : roll < 0.56 ? 'chip' : 'confetti';

        const swatch =
          kind === 'brownie' || kind === 'chip'
            ? palette[Math.floor(Math.random() * (tone === 'imperial' ? 5 : 4))]
            : palette[Math.floor(Math.random() * palette.length)];

        particles.push({
          x: originX + (Math.random() - 0.5) * 28,
          y: originY + (Math.random() - 0.5) * 18,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size:
            kind === 'brownie'
              ? 7 + Math.random() * 6
              : kind === 'chip'
                ? 4 + Math.random() * 3.5
                : 7 + Math.random() * 5,
          aspect: kind === 'confetti' ? 0.45 + Math.random() * 0.35 : 0.8 + Math.random() * 0.3,
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 0.16,
          tilt: Math.random() * Math.PI * 2,
          tiltSpeed: 0.06 + Math.random() * 0.1,
          color: swatch.color,
          highlight: swatch.highlight,
          kind,
          gravity: kind === 'confetti' ? 0.24 : 0.34,
          drag: kind === 'confetti' ? 0.985 : 0.991,
          swayPhase: Math.random() * Math.PI * 2,
          swayFreq: 0.04 + Math.random() * 0.04,
          alpha: 1,
        });
      }
    };

    // Initial celebratory burst from left, right, and upper-center
    const isNarrow = width < 640;
    const baseSpeed = isNarrow ? 11 : 15;
    spawnBurst(width * 0.18, height * 0.72, -Math.PI * 0.36, 0.72, 42, baseSpeed * 0.75, baseSpeed * 1.25);
    spawnBurst(width * 0.82, height * 0.72, -Math.PI * 0.64, 0.72, 42, baseSpeed * 0.75, baseSpeed * 1.25);
    spawnBurst(width * 0.5, height * 0.35, -Math.PI * 0.5, 1.8, 36, baseSpeed * 0.45, baseSpeed * 0.9);

    let secondaryFired = false;
    const startTime = performance.now();
    const maxDurationMs = 5200;
    let rafId = 0;

    const render = (now: number) => {
      const elapsed = now - startTime;

      if (!secondaryFired && elapsed > 260) {
        secondaryFired = true;
        spawnBurst(width * 0.35, height * 0.52, -Math.PI * 0.45, 0.9, 26, baseSpeed * 0.65, baseSpeed * 1.05);
        spawnBurst(width * 0.65, height * 0.52, -Math.PI * 0.55, 0.9, 26, baseSpeed * 0.65, baseSpeed * 1.05);
      }

      ctx.clearRect(0, 0, width, height);

      const fadeProgress = Math.max(0, (elapsed - 3200) / (maxDurationMs - 3200));
      let aliveCount = 0;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.vx *= p.drag;
        p.vy = p.vy * p.drag + p.gravity;
        p.swayPhase += p.swayFreq;
        p.x += p.vx + (p.kind === 'confetti' ? Math.sin(p.swayPhase) * 0.75 : 0);
        p.y += p.vy;
        p.rotation += p.rotationSpeed;
        p.tilt += p.tiltSpeed;

        const targetAlpha = Math.max(0, 1 - fadeProgress);
        p.alpha = targetAlpha;

        if (p.y > height + 40 || p.alpha <= 0.01) {
          continue;
        }
        aliveCount++;

        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);

        if (p.kind === 'brownie') {
          // Crumbly square brownie chunk with a subtle baked crust highlight
          const half = p.size * 0.5;
          const hHalf = half * p.aspect;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.roundRect(-half, -hHalf, p.size, p.size * p.aspect, 2);
          ctx.fill();

          ctx.fillStyle = p.highlight;
          ctx.fillRect(-half + 1.2, -hHalf + 1.2, p.size * 0.45, Math.max(1.5, p.size * 0.22));
        } else if (p.kind === 'chip') {
          // Tear-drop / faceted chocolate chip fleck
          const r = p.size * 0.5;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.moveTo(0, -r * 1.15);
          ctx.quadraticCurveTo(r * 1.1, 0, r * 0.8, r * 0.75);
          ctx.quadraticCurveTo(0, r * 1.1, -r * 0.8, r * 0.75);
          ctx.quadraticCurveTo(-r * 1.1, 0, 0, -r * 1.15);
          ctx.fill();

          ctx.fillStyle = p.highlight;
          ctx.beginPath();
          ctx.arc(-r * 0.22, -r * 0.15, Math.max(1, r * 0.24), 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Fluttering confetti ribbon with 3D flip illusion
          const scaleY = Math.max(0.2, Math.abs(Math.cos(p.tilt)));
          ctx.scale(1, scaleY);
          ctx.fillStyle = Math.cos(p.tilt) >= 0 ? p.color : p.highlight;
          ctx.fillRect(-p.size * 0.5, -p.size * p.aspect * 0.5, p.size, p.size * p.aspect);
        }

        ctx.restore();
      }

      if (elapsed < maxDurationMs && aliveCount > 0) {
        rafId = window.requestAnimationFrame(render);
      } else {
        ctx.clearRect(0, 0, width, height);
      }
    };

    rafId = window.requestAnimationFrame(render);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
      ctx.clearRect(0, 0, width, height);
    };
  }, [tone, triggerKey]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="fixed inset-0 z-50 pointer-events-none"
    />
  );
};
