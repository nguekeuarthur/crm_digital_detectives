import { notifications } from '@mantine/notifications';
import { IconCheck, IconX } from '@tabler/icons-react';
import { rem } from '@mantine/core';

/**
 * Shows a loading notification, then transitions it to a success state
 * with the pattern: loading spinner → green spinner → checkmark ✓ with burst → auto-close.
 */

let counter = 0;

// ── Burst checkmark icon with particle explosion ──────────────────────
function SuccessBurstIcon() {
  return (
    <div
      style={{
        position: 'relative',
        width: 18,
        height: 18,
        overflow: 'visible',
      }}
    >
      <style>{`
        @keyframes notif-check-pop {
          0%   { transform: scale(0) rotate(-45deg); opacity: 0; }
          40%  { transform: scale(1.5) rotate(5deg); opacity: 1; }
          70%  { transform: scale(0.9) rotate(-2deg); opacity: 1; }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        @keyframes notif-particle-burst {
          0%   { transform: translate(0, 0) scale(1.2); opacity: 1; }
          60%  { opacity: 1; }
          100% { transform: translate(var(--px), var(--py)) scale(0); opacity: 0; }
        }
        @keyframes notif-ring-expand {
          0%   { transform: scale(0.2); opacity: 1; border-width: 4px; }
          70%  { opacity: 0.6; }
          100% { transform: scale(3); opacity: 0; border-width: 0.5px; }
        }
        @keyframes notif-sparkle-twinkle {
          0%   { transform: translate(0,0) scale(0); opacity: 0; }
          30%  { transform: translate(calc(var(--px) * 0.4), calc(var(--py) * 0.4)) scale(1.5); opacity: 1; }
          100% { transform: translate(var(--px), var(--py)) scale(0); opacity: 0; }
        }
        @keyframes notif-flash {
          0%   { opacity: 0; transform: scale(0.5); }
          30%  { opacity: 0.4; transform: scale(1.2); }
          100% { opacity: 0; transform: scale(2); }
        }
        .notif-check-icon {
          animation: notif-check-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        .notif-particle-dot {
          position: absolute;
          border-radius: 50%;
          top: 50%;
          left: 50%;
          animation: notif-particle-burst 0.7s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
          z-index: 10;
          pointer-events: none;
        }
        .notif-sparkle-star {
          position: absolute;
          top: 50%;
          left: 50%;
          animation: notif-sparkle-twinkle 0.8s cubic-bezier(0.22, 0.61, 0.36, 1) forwards;
          z-index: 10;
          pointer-events: none;
        }
        .notif-ring-burst {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 20px;
          height: 20px;
          margin: -10px;
          border-radius: 50%;
          border: 3px solid #40c057;
          animation: notif-ring-expand 0.6s ease-out forwards;
          pointer-events: none;
          z-index: 5;
        }
        .notif-ring-burst-2 {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 20px;
          height: 20px;
          margin: -10px;
          border-radius: 50%;
          border: 2px solid #69db7c;
          animation: notif-ring-expand 0.7s ease-out 0.1s forwards;
          pointer-events: none;
          z-index: 5;
          opacity: 0;
        }
        .notif-flash-bg {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 24px;
          height: 24px;
          margin: -12px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(64,192,87,0.5) 0%, transparent 70%);
          animation: notif-flash 0.5s ease-out forwards;
          pointer-events: none;
          z-index: 4;
        }
      `}</style>

      {/* Flash glow behind */}
      <div className="notif-flash-bg" />

      {/* Expanding rings */}
      <div className="notif-ring-burst" />
      <div className="notif-ring-burst-2" />

      {/* Big particles – 8 directions, bigger and farther */}
      {[
        { px: '-20px', py: '-20px', bg: '#40c057', size: 7 },
        { px: '20px',  py: '-18px', bg: '#51cf66', size: 6 },
        { px: '-18px', py: '20px',  bg: '#51cf66', size: 6 },
        { px: '20px',  py: '20px',  bg: '#40c057', size: 7 },
        { px: '0px',   py: '-24px', bg: '#69db7c', size: 5 },
        { px: '0px',   py: '24px',  bg: '#69db7c', size: 5 },
        { px: '-24px', py: '0px',   bg: '#8ce99a', size: 5 },
        { px: '24px',  py: '0px',   bg: '#8ce99a', size: 5 },
      ].map((p, i) => (
        <div
          key={i}
          className="notif-particle-dot"
          style={{
            '--px': p.px,
            '--py': p.py,
            background: p.bg,
            width: p.size,
            height: p.size,
            marginTop: -(p.size / 2),
            marginLeft: -(p.size / 2),
            animationDelay: `${i * 0.02}s`,
          } as React.CSSProperties}
        />
      ))}

      {/* Medium particles – diagonal offsets */}
      {[
        { px: '-14px', py: '-22px', bg: '#b2f2bb', size: 4 },
        { px: '14px',  py: '22px',  bg: '#b2f2bb', size: 4 },
        { px: '22px',  py: '-10px', bg: '#d3f9d8', size: 4 },
        { px: '-22px', py: '10px',  bg: '#d3f9d8', size: 4 },
        { px: '10px',  py: '-22px', bg: '#b2f2bb', size: 3 },
        { px: '-10px', py: '22px',  bg: '#b2f2bb', size: 3 },
      ].map((p, i) => (
        <div
          key={`m${i}`}
          className="notif-particle-dot"
          style={{
            '--px': p.px,
            '--py': p.py,
            background: p.bg,
            width: p.size,
            height: p.size,
            marginTop: -(p.size / 2),
            marginLeft: -(p.size / 2),
            animationDelay: `${0.05 + i * 0.03}s`,
          } as React.CSSProperties}
        />
      ))}

      {/* Sparkle stars – ✦ shapes that twinkle outward */}
      {[
        { px: '-16px', py: '-26px', color: '#fff' },
        { px: '16px',  py: '26px',  color: '#fff' },
        { px: '26px',  py: '-14px', color: '#d3f9d8' },
        { px: '-26px', py: '14px',  color: '#d3f9d8' },
      ].map((p, i) => (
        <div
          key={`s${i}`}
          className="notif-sparkle-star"
          style={{
            '--px': p.px,
            '--py': p.py,
            color: p.color,
            fontSize: '10px',
            lineHeight: 1,
            marginTop: '-5px',
            marginLeft: '-5px',
            animationDelay: `${0.1 + i * 0.05}s`,
          } as React.CSSProperties}
        >
          ✦
        </div>
      ))}

      {/* The checkmark icon itself */}
      <div className="notif-check-icon" style={{ position: 'relative', zIndex: 20 }}>
        <IconCheck style={{ width: rem(18), height: rem(18) }} stroke={3} />
      </div>
    </div>
  );
}

export function showLoadingNotif(title: string, message: string): string {
  const id = `notif-loading-${Date.now()}-${counter++}`;
  notifications.show({
    id,
    title,
    message,
    loading: true,
    autoClose: false,
    withCloseButton: false,
  });
  return id;
}

export function completeNotif(id: string, title: string, message: string): void {
  // Step 1: Turn green, still loading (spinner turns green)
  notifications.update({
    id,
    title,
    message,
    loading: true,
    autoClose: false,
    withCloseButton: false,
    color: 'green',
  });

  // Step 2: After 600ms, show the checkmark with burst particles
  setTimeout(() => {
    notifications.update({
      id,
      title,
      message,
      loading: false,
      autoClose: 3000,
      withCloseButton: true,
      color: 'green',
      icon: <SuccessBurstIcon />,
      style: { overflow: 'visible' },
    });
  }, 600);
}

export function failNotif(id: string, title: string, message: string): void {
  notifications.update({
    id,
    title,
    message,
    loading: false,
    autoClose: 5000,
    withCloseButton: true,
    color: 'red',
    icon: <IconX style={{ width: rem(18), height: rem(18) }} />,
  });
}
