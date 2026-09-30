/**
 * Íconos de línea (estilo del flyer). SVG inline, heredan el color con currentColor.
 */
type IconProps = { size?: number };

const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
});

export const IconGlobe = ({ size = 22 }: IconProps) => (
  <svg {...base(size)}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></svg>
);

export const IconContexts = ({ size = 22 }: IconProps) => (
  <svg {...base(size)}><rect x="3" y="3" width="7" height="7" rx="2" /><rect x="14" y="3" width="7" height="7" rx="2" /><rect x="3" y="14" width="7" height="7" rx="2" /><rect x="14" y="14" width="7" height="7" rx="2" /></svg>
);

export const IconExchange = ({ size = 22 }: IconProps) => (
  <svg {...base(size)}><path d="M4 8h14l-4-4M20 16H6l4 4" /></svg>
);

export const IconChart = ({ size = 22 }: IconProps) => (
  <svg {...base(size)}><path d="M5 20V12M10 20V6M15 20v-9M20 20V4" /></svg>
);

export const IconSparkles = ({ size = 22 }: IconProps) => (
  <svg {...base(size)}><path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8zM19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z" /></svg>
);

export const IconUsers = ({ size = 22 }: IconProps) => (
  <svg {...base(size)}><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0" /><circle cx="17" cy="9" r="2.8" /><path d="M16 14.2a5 5 0 0 1 5.5 5.3" /></svg>
);

export const IconShield = ({ size = 22 }: IconProps) => (
  <svg {...base(size)}><path d="M12 3l8 3v6c0 4.5-3.4 8.2-8 9-4.6-.8-8-4.5-8-9V6z" /><path d="M9 12l2 2 4-4" /></svg>
);

export const IconEye = ({ size = 20 }: IconProps) => (
  <svg {...base(size)}><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></svg>
);

export const IconEyeOff = ({ size = 20 }: IconProps) => (
  <svg {...base(size)}><path d="M3 3l18 18M10.6 5.1A10.8 10.8 0 0 1 12 5c6.4 0 10 7 10 7a17.6 17.6 0 0 1-3.2 4.1M6.6 6.6A17.4 17.4 0 0 0 2 12s3.6 7 10 7a10 10 0 0 0 5.4-1.6M9.9 9.9a3 3 0 0 0 4.2 4.2" /></svg>
);

export const IconChevron = ({ size = 18 }: IconProps) => (
  <svg {...base(size)}><path d="M9 6l6 6-6 6" /></svg>
);
