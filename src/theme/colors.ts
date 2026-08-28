// Palette from the PassDown design brief (Section 10.1) — warm, homey, cookbook-like.
// accentGold/accentOlive match the logo mark's heart and fork exactly (see assets/logo.png)
// and are available for small brand touches (highlights, celebratory moments) elsewhere.
export const colors = {
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
};

export type AppColors = typeof colors;
