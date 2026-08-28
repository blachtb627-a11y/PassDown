// Palette from the PassDown design brief (Section 10.1) — warm, homey, cookbook-like.
// accentGold/accentOlive match the logo mark's heart and fork exactly (see assets/logo.png)
// and are available for small brand touches (highlights, celebratory moments) elsewhere.
export const lightColors = {
  primary: '#E2622B', // Warm Terracotta / Orange — buttons, accents, Post button
  secondary: '#2F4F3E', // Deep Herb Green — headers, icons, text accents
  background: '#FBF6EE', // Cream / Warm White
  surface: '#FFFFFF',
  text: '#2B2B2B', // Charcoal
  textMuted: '#6B6B6B', // Muted Taupe
  border: '#E7DFD0',
  success: '#3F7D5A',
  danger: '#C4432B',
  white: '#FFFFFF',
  overlay: 'rgba(43, 43, 43, 0.6)',
  accentGold: '#D6A234', // logo heart
  accentOlive: '#5C6B2E', // logo fork
  headerBanner: '#1F3D2E', // bold deep-green top banner (Home feed) — a brand statement, so it
  onHeaderBanner: '#FBF6EE', // stays the same in both themes rather than adapting like `secondary` does
};

export type AppColors = typeof lightColors;

// Same warm, homey feel, just inverted — a warm near-black (not pure black) background
// instead of stark grayscale, and brand colors nudged brighter so they still pop for
// contrast against the dark surfaces.
export const darkColors: AppColors = {
  primary: '#E8794F',
  secondary: '#7FA98D',
  background: '#1C1B18',
  surface: '#26241F',
  text: '#F3EDE2',
  textMuted: '#B7AE9E',
  border: '#3B3730',
  success: '#6FBE8F',
  danger: '#E88569',
  white: '#FFFFFF',
  overlay: 'rgba(0, 0, 0, 0.7)',
  accentGold: '#E6BC55',
  accentOlive: '#8CA562',
  headerBanner: '#1F3D2E',
  onHeaderBanner: '#FBF6EE',
};
