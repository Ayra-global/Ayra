/**
 * Banderas en SVG (W8): Windows no dibuja los emojis de bandera
 * y muestra "US", "EU", "AR" en su lugar. Con SVG se ven igual en todos lados.
 */

import type { ReactElement } from 'react';

const STAR_POINTS = '0,-1 0.2245,-0.309 0.951,-0.309 0.3633,0.118 0.5878,0.809 0,0.382 -0.5878,0.809 -0.3633,0.118 -0.951,-0.309 -0.2245,-0.309';

function Usd() {
  return (
    <>
      <rect width="32" height="24" fill="#fff" />
      {Array.from({ length: 7 }, (_, i) => (
        <rect key={i} x="0" y={i * (24 / 6.5)} width="32" height={24 / 13} fill="#b22234" />
      ))}
      <rect x="0" y="0" width="14" height={(24 / 13) * 7} fill="#3c3b6e" />
      {[2.5, 6, 9.5].map((y) =>
        [2.5, 7, 11.5].map((x) => <circle key={`${x}-${y}`} cx={x} cy={y} r="0.9" fill="#fff" />),
      )}
    </>
  );
}

function Eur() {
  return (
    <>
      <rect width="32" height="24" fill="#003399" />
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i / 12) * Math.PI * 2;
        return (
          <polygon
            key={i}
            points={STAR_POINTS}
            fill="#ffcc00"
            transform={`translate(${16 + Math.sin(a) * 7} ${12 - Math.cos(a) * 7}) scale(1.35)`}
          />
        );
      })}
    </>
  );
}

function Ars() {
  return (
    <>
      <rect width="32" height="24" fill="#fff" />
      <rect width="32" height="8" fill="#74acdf" />
      <rect y="16" width="32" height="8" fill="#74acdf" />
      <circle cx="16" cy="12" r="2.6" fill="#f6b40e" stroke="#85340a" strokeWidth="0.4" />
    </>
  );
}

const FLAGS: Record<string, () => ReactElement> = { USD: Usd, EUR: Eur, ARS: Ars };

export function Flag({ currency, size = 28 }: { currency: string; size?: number }) {
  const Draw = FLAGS[currency];
  const id = `flag-clip-${currency}`;
  return (
    <svg
      className="flag-svg"
      width={size}
      height={size}
      viewBox="4 0 24 24"
      role="img"
      aria-label={`Bandera ${currency}`}
    >
      <clipPath id={id}>
        <circle cx="16" cy="12" r="12" />
      </clipPath>
      <g clipPath={`url(#${id})`}>
        {Draw ? (
          <Draw />
        ) : (
          <>
            <rect width="32" height="24" fill="#e7e5f4" />
            <text x="16" y="15.5" textAnchor="middle" fontSize="8" fontWeight="700" fill="#161a4a">
              {currency.slice(0, 3)}
            </text>
          </>
        )}
      </g>
      <circle cx="16" cy="12" r="11.5" fill="none" stroke="rgba(255,255,255,0.35)" />
    </svg>
  );
}
