import { useId } from 'react';

interface LogoProps {
  /** Alto del wordmark en px */
  size?: number;
  /** dark = texto azul marino (fondos claros) · light = texto blanco (fondos oscuros) */
  tone?: 'dark' | 'light';
  /** Muestra "CONTEXTUAL WALLET" debajo */
  subtitle?: boolean;
  /** Muestra "UNA BILLETERA. TODOS TUS MUNDOS." debajo */
  tagline?: boolean;
  className?: string;
}

/**
 * Logo AYRA según el flyer: wordmark "AYRA" + onda (turquesa → violeta → rosa) cruzando la primera A.
 * Es un SVG, así que se ve nítido en cualquier tamaño.
 */
export function Logo({ size = 40, tone = 'dark', subtitle = true, tagline = false, className = '' }: LogoProps) {
  const gradId = useId();
  const textColor = tone === 'dark' ? 'var(--navy)' : '#ffffff';

  return (
    <div className={`logo logo-${tone} ${className}`} style={{ ['--logo-h' as string]: `${size}px` }}>
      <svg
        className="logo-mark"
        viewBox="0 0 240 72"
        height={size}
        role="img"
        aria-label="AYRA"
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#22d3ee" />
            <stop offset="0.5" stopColor="#7c3aed" />
            <stop offset="1" stopColor="#ec4899" />
          </linearGradient>
        </defs>
        <text
          x="2"
          y="64"
          fill={textColor}
          fontFamily="Poppins, sans-serif"
          fontWeight={800}
          fontSize="76"
          textLength="236"
          lengthAdjust="spacingAndGlyphs"
        >
          AYRA
        </text>
        {/* Onda: cruza la primera A de izquierda a derecha */}
        <path
          d="M -4 50 C 10 36, 24 36, 34 46 S 58 60, 76 34"
          fill="none"
          stroke={`url(#${gradId})`}
          strokeWidth="9"
          strokeLinecap="round"
        />
      </svg>
      {subtitle && <span className="logo-sub">CONTEXTUAL WALLET</span>}
      {tagline && <span className="logo-tagline">UNA BILLETERA. TODOS TUS MUNDOS.</span>}
    </div>
  );
}
