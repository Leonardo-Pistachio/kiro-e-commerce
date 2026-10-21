import { useEffect, useRef } from 'react';

/**
 * A spray of shooting stars that trails the pointer across its parent element
 * (the home page banner). Drawn on a canvas so hundreds of particles stay cheap,
 * and the animation loop only runs while stars are alive. Decorative only:
 * hidden from assistive tech, ignores touch, and does nothing for people who
 * ask for reduced motion.
 */

interface Star {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number; // ms remaining
  maxLife: number;
  size: number;
  color: string;
  sparkle: boolean;
}

const COLORS = ['#ffffff', '#efe8ff', '#b794ff', '#8f4bff', '#ff9ee8'];
const MAX_STARS = 260;
const FRICTION = 0.94; // per 16 ms frame
const GRAVITY = 0.012; // px per ms², a gentle droop like falling sparks

export function HeroStarfield() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = canvas?.parentElement;
    const context = canvas?.getContext('2d');
    if (!canvas || !host || !context) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const stars: Star[] = [];
    let frame = 0;
    let lastTime = 0;
    let last: { x: number; y: number } | null = null;

    // Keep the canvas pixel-sharp at the host's size and the screen's density.
    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(host.clientWidth * ratio);
      canvas.height = Math.round(host.clientHeight * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(host);

    const spawn = (x: number, y: number, dx: number, dy: number) => {
      const speed = Math.hypot(dx, dy);
      // Faster movement sprays more stars, capped so a flick stays tasteful.
      const count = Math.min(2 + Math.floor(speed / 6), 9);
      for (let index = 0; index < count && stars.length < MAX_STARS; index += 1) {
        const angle = Math.atan2(dy, dx) + Math.PI + (Math.random() - 0.5) * 1.4;
        const push = 0.05 + Math.random() * 0.25 + Math.min(speed, 40) * 0.006;
        const maxLife = 500 + Math.random() * 700;
        stars.push({
          x: x + (Math.random() - 0.5) * 6,
          y: y + (Math.random() - 0.5) * 6,
          vx: Math.cos(angle) * push,
          vy: Math.sin(angle) * push - 0.04,
          life: maxLife,
          maxLife,
          size: 0.8 + Math.random() * 1.8,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          sparkle: Math.random() < 0.12,
        });
      }
    };

    const drawSparkle = (x: number, y: number, radius: number) => {
      context.beginPath();
      context.moveTo(x, y - radius);
      context.quadraticCurveTo(x, y, x + radius, y);
      context.quadraticCurveTo(x, y, x, y + radius);
      context.quadraticCurveTo(x, y, x - radius, y);
      context.quadraticCurveTo(x, y, x, y - radius);
      context.fill();
    };

    const tick = (time: number) => {
      const elapsed = lastTime ? Math.min(time - lastTime, 48) : 16;
      lastTime = time;
      const drag = Math.pow(FRICTION, elapsed / 16);

      context.clearRect(0, 0, host.clientWidth, host.clientHeight);
      context.globalCompositeOperation = 'lighter';
      context.lineCap = 'round';

      for (let index = stars.length - 1; index >= 0; index -= 1) {
        const star = stars[index];
        star.life -= elapsed;
        if (star.life <= 0) {
          stars.splice(index, 1);
          continue;
        }
        star.vx *= drag;
        star.vy = star.vy * drag + GRAVITY * (elapsed / 16);
        star.x += star.vx * elapsed;
        star.y += star.vy * elapsed;

        const fade = star.life / star.maxLife;
        context.globalAlpha = fade;
        context.strokeStyle = star.color;
        context.fillStyle = star.color;

        // The streak points back along the star's path: a tiny comet tail.
        const tail = 9 + star.size * 4;
        const speed = Math.hypot(star.vx, star.vy) || 1;
        context.lineWidth = star.size;
        context.beginPath();
        context.moveTo(star.x, star.y);
        context.lineTo(star.x - (star.vx / speed) * tail * fade, star.y - (star.vy / speed) * tail * fade);
        context.stroke();

        if (star.sparkle) drawSparkle(star.x, star.y, star.size * 3.2 * (0.6 + fade * 0.4));
      }
      context.globalAlpha = 1;

      frame = stars.length > 0 ? requestAnimationFrame(tick) : 0;
      if (!frame) lastTime = 0;
    };

    const onMove = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return;
      const box = host.getBoundingClientRect();
      const point = { x: event.clientX - box.left, y: event.clientY - box.top };
      const dx = last ? point.x - last.x : 0;
      const dy = last ? point.y - last.y : 0;
      last = point;
      spawn(point.x, point.y, dx, dy);
      if (!frame) frame = requestAnimationFrame(tick);
    };
    const onLeave = () => {
      last = null;
    };

    host.addEventListener('pointermove', onMove);
    host.addEventListener('pointerleave', onLeave);
    return () => {
      host.removeEventListener('pointermove', onMove);
      host.removeEventListener('pointerleave', onLeave);
      observer.disconnect();
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return <canvas ref={canvasRef} className="hero-starfield" aria-hidden="true" />;
}
