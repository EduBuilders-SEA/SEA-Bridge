import * as React from 'react';

const Logo = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 100 40"
    xmlns="http://www.w3.org/2000/svg"
    aria-label="SEA Bridge Logo"
  >
    <defs>
      <linearGradient id="logo-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" style={{ stopColor: 'hsl(var(--primary))' }} />
        <stop offset="100%" style={{ stopColor: 'hsl(var(--accent))' }} />
      </linearGradient>
    </defs>
    <path
      d="M10 35 C 20 10, 40 10, 50 35"
      stroke="url(#logo-gradient)"
      strokeWidth="4"
      fill="none"
      strokeLinecap="round"
    />
    <path
      d="M50 35 C 60 10, 80 10, 90 35"
      stroke="url(#logo-gradient)"
      strokeWidth="4"
      fill="none"
      strokeLinecap="round"
    />
    <circle cx="10" cy="35" r="5" fill="hsl(var(--primary))" />
    <circle cx="90" cy="35" r="5" fill="hsl(var(--accent))" />
    <line x1="10" y1="35" x2="90" y2="35" stroke="hsl(var(--border))" strokeWidth="2" />
  </svg>
);

export default Logo;
