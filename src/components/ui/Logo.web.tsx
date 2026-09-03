import React from 'react';

type LogoProps = {
  isMobile?: boolean;
  isMenu?: boolean;
};

// Web: a plain <img> pointing at the small unhashed /logo.webp (public/) instead
// of the 6072x5568 PNG Metro would otherwise export. Same box sizes as Logo.tsx;
// `object-fit: contain` keeps the artwork's aspect ratio inside the box.
const SIZES = {
  desktop: { width: 320, height: 80 },
  mobile: { width: 180, height: 50 },
  menu: { width: 32, height: 30 },
} as const;

export const Logo = ({ isMobile = false, isMenu = false }: LogoProps) => {
  const { width, height } = isMenu ? SIZES.menu : isMobile ? SIZES.mobile : SIZES.desktop;
  return (
    <img
      src="/logo.webp"
      alt="Find Local"
      width={width}
      height={height}
      decoding="async"
      style={{ width, height, objectFit: 'contain', display: 'block' }}
    />
  );
};
