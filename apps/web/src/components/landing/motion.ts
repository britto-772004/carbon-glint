import { keyframes } from '@mui/material/styles';

/**
 * Keyframes for the landing pages. Every keyframe only declares its *starting* state, so the element's natural
 * style is the end state. With `prefers-reduced-motion` the animation is dropped and the final state shows.
 */
export const fadeUp = keyframes`from{opacity:0;transform:translateY(22px)}`;
export const popIn = keyframes`from{opacity:0;transform:scale(.6)}`;
export const growX = keyframes`from{transform:scaleX(0)}`;
export const growY = keyframes`from{transform:scaleY(0)}`;
export const drawLine = keyframes`from{stroke-dashoffset:100}`;
export const drawArc = keyframes`from{stroke-dasharray:0 100}`;
/** Reveals a line from left to right (clip-based, so it also works with non-scaling strokes). */
export const revealX = keyframes`from{clip-path:inset(-12px 100% -12px 0)}`;
/**
 * Four-card carousel: each card is visible for its own quarter of the cycle (give each a delay of `index × slot`).
 * Cards share one grid cell and come up one after another.
 */
export const slotCard = keyframes`0%{opacity:0;transform:translateY(36px) scale(.97)}3%,22%{opacity:1;transform:none}25%,100%{opacity:0;transform:translateY(-16px) scale(.98)}`;
export const slotBar = keyframes`0%{transform:scaleX(0);opacity:1}24.9%{transform:scaleX(1);opacity:1}25%,100%{transform:scaleX(1);opacity:0}`;
export const slotLabel = keyframes`0%{opacity:.5}.1%,24.9%{opacity:1}25%,100%{opacity:.5}`;
/** Nature design: intro splash, meadow and the five-stop route. */
export const splashOut = keyframes`0%,80%{opacity:1;visibility:visible}100%{opacity:0;visibility:hidden}`;
export const sway = keyframes`0%,100%{transform:rotate(calc(var(--s,3deg) * -1))}50%{transform:rotate(var(--s,3deg))}`;
export const firefly = keyframes`0%{transform:translate(0,0);opacity:0}15%{opacity:1}50%{transform:translate(var(--fx,30px),var(--fy,-40px));opacity:.35}85%{opacity:1}100%{transform:translate(0,0);opacity:0}`;
export const bubbleRise = keyframes`0%{transform:translateY(0) scale(.6);opacity:0}15%{opacity:.8}100%{transform:translateY(-280px) scale(1.1);opacity:0}`;
export const leafFloat = keyframes`0%,100%{transform:translate(0,0) rotate(var(--r0,-15deg))}50%{transform:translate(var(--dx,24px),-28px) rotate(var(--r1,20deg))}`;
export const statFloat = keyframes`0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}`;
export const glowText = keyframes`0%,100%{text-shadow:0 0 0 transparent}50%{text-shadow:0 0 18px var(--glow)}`;
export const slot5Card = keyframes`0%{opacity:0;transform:translateY(24px)}3%,17%{opacity:1;transform:none}20%,100%{opacity:0;transform:translateY(-12px)}`;
export const slot5Bar = keyframes`0%{transform:scaleX(0);opacity:1}19.9%{transform:scaleX(1);opacity:1}20%,100%{transform:scaleX(1);opacity:0}`;
export const slot5Glow = keyframes`0%{opacity:.3;transform:scale(1)}.1%,19.9%{opacity:1;transform:scale(1.5)}20%,100%{opacity:.3;transform:scale(1)}`;
export const slot5Label = keyframes`0%{opacity:.45}.1%,19.9%{opacity:1}20%,100%{opacity:.45}`;
export const slot5Fade = keyframes`0%{opacity:0}.1%,19.9%{opacity:1}20%,100%{opacity:0}`;
export const trackFill = keyframes`0%,16%{transform:scaleY(0)}20%,36%{transform:scaleY(.25)}40%,56%{transform:scaleY(.5)}60%,76%{transform:scaleY(.75)}80%,100%{transform:scaleY(1)}`;
/** Like slideInRight but starts faint instead of invisible, so the final layout is hinted from the start. */
export const slideInSoft = keyframes`from{opacity:.22;transform:translateX(26px)}`;
/** Outlines a candidate for a moment, as if it were being weighed. */
export const scanFlash = keyframes`0%{opacity:0}8%,30%{opacity:1}38%,100%{opacity:0}`;
export const slideInLeft = keyframes`from{opacity:0;transform:translateX(-26px)}`;
export const slideInRight = keyframes`from{opacity:0;transform:translateX(26px)}`;

export const float = keyframes`0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}`;
export const floatSlow = keyframes`0%,100%{transform:translateY(0) rotate(var(--r,0deg))}50%{transform:translateY(-14px) rotate(var(--r,0deg))}`;
export const pulse = keyframes`0%,100%{opacity:1;transform:scale(1)}50%{opacity:.5;transform:scale(1.3)}`;
export const ping = keyframes`0%{transform:scale(1);opacity:.55}100%{transform:scale(2.6);opacity:0}`;
export const spin = keyframes`to{transform:rotate(360deg)}`;
export const blink = keyframes`0%,100%{opacity:1}50%{opacity:.2}`;
export const marquee = keyframes`to{transform:translateX(-50%)}`;
export const rollUp = keyframes`to{transform:translateY(-50%)}`;
export const flowX = keyframes`0%{left:0;opacity:0}15%{opacity:1}85%{opacity:1}100%{left:calc(100% - 8px);opacity:0}`;
export const flowY = keyframes`0%{top:0;opacity:0}15%{opacity:1}85%{opacity:1}100%{top:calc(100% - 8px);opacity:0}`;
export const marchDash = keyframes`to{stroke-dashoffset:-16}`;
export const sweep = keyframes`0%{transform:translateX(-120%)}60%,100%{transform:translateX(220%)}`;
export const drift = keyframes`0%{transform:translate(0,-10vh) rotate(0deg);opacity:0}10%{opacity:.9}90%{opacity:.9}100%{transform:translate(var(--dx,40px),110vh) rotate(360deg);opacity:0}`;
export const cellPulse = keyframes`0%,100%{opacity:var(--o)}50%{opacity:calc(var(--o) * .35)}`;
/** Highlights one stage of a looping sequence (use with `animationDelay` per stage). */
export const stageGlow = keyframes`0%,18%{box-shadow:0 0 0 0 var(--glow);transform:scale(1.08)}30%,100%{box-shadow:0 0 0 0 transparent;transform:scale(1)}`;
export const stageDot = keyframes`0%,18%{opacity:1}30%,100%{opacity:.35}`;

const REDUCED = '@media (prefers-reduced-motion: reduce)';

/** `animation` plus the reduced-motion opt-out, ready to spread into `sx`. */
export const motion = (animation: string) => ({ animation, [REDUCED]: { animation: 'none' } });

/**
 * Progressive enhancement for `motion()`: where scroll-driven animations are supported, play the animation as the
 * element scrolls into view instead of at page load. Elsewhere it simply plays on load.
 * Pass a named timeline (`--name`) to follow an ancestor's `view-timeline-name` instead of the element's own.
 */
export const onScroll = (range: string, timeline = 'view()') => ({
  '@supports (animation-timeline: view())': {
    animationTimeline: timeline,
    animationRange: range,
    animationDuration: 'auto',
    animationDelay: '0s',
    animationTimingFunction: 'linear',
    animationFillMode: 'both',
  },
});
