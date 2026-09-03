/**
 * Web override: no runtime font loading. The Epilogue/Manrope faces are
 * self-hosted woff2 files in public/fonts/ and declared with @font-face
 * (font-display: swap) by scripts/inject-head.js, using the same
 * `Manrope_400Regular`-style family names the theme references.
 */
export const FONT_MAP: Record<string, number> = {};
