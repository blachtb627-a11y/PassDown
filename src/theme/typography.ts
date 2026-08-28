import { AppColors } from './colors';

// Minimum 16pt body text per the brief's ease-of-use & accessibility guidelines (sections 6, 11).
// System scaling (Dynamic Type / font scale) is left on — we never disable allowFontScaling.
// A function (not a static object) because text color depends on the active theme (light/dark) —
// see ThemeContext, which calls this whenever the theme changes.
export function getTypography(colors: AppColors) {
  return {
    display: { fontSize: 32, fontWeight: '700' as const, color: colors.secondary },
    title: { fontSize: 24, fontWeight: '700' as const, color: colors.text },
    subtitle: { fontSize: 18, fontWeight: '600' as const, color: colors.text },
    body: { fontSize: 16, fontWeight: '400' as const, color: colors.text },
    bodyBold: { fontSize: 16, fontWeight: '600' as const, color: colors.text },
    meta: { fontSize: 14, fontWeight: '400' as const, color: colors.textMuted },
    button: { fontSize: 16, fontWeight: '700' as const, color: colors.white },
  };
}

export type AppTypography = ReturnType<typeof getTypography>;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const radius = {
  sm: 8,
  md: 14,
  lg: 20,
  pill: 999,
};
