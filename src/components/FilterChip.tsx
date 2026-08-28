import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { AppColors } from '../theme/colors';
import { useTheme } from '../theme/ThemeContext';
import { radius, spacing } from '../theme/typography';

type Props = {
  label: string;
  selected: boolean;
  onPress: () => void;
};

export function FilterChip({ label, selected, onPress }: Props) {
  const { colors, typography } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      style={[styles.chip, selected && styles.chipSelected]}
    >
      <Text style={[typography.bodyBold, { color: selected ? colors.white : colors.secondary }]}>{label}</Text>
    </Pressable>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    chip: {
      paddingHorizontal: spacing.md,
      minHeight: 44,
      justifyContent: 'center',
      borderRadius: radius.pill,
      borderWidth: 1.5,
      borderColor: colors.secondary,
      marginRight: spacing.sm,
      marginBottom: spacing.sm,
      backgroundColor: colors.surface,
    },
    chipSelected: {
      backgroundColor: colors.secondary,
    },
  });
}
