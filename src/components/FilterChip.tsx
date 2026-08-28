import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { AppColors } from '../theme/colors';
import { useTheme } from '../theme/ThemeContext';
import { radius, spacing } from '../theme/typography';

type Props = {
  label: string;
  selected: boolean;
  onPress: () => void;
  color?: string;
};

export function FilterChip({ label, selected, onPress, color }: Props) {
  const { colors, typography } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const tint = color ?? colors.secondary;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      style={[
        styles.chip,
        { borderColor: tint },
        selected && { backgroundColor: tint },
      ]}
    >
      <Text style={[typography.bodyBold, { color: selected ? colors.white : tint }]}>{label}</Text>
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
      marginRight: spacing.sm,
      marginBottom: spacing.sm,
      backgroundColor: colors.surface,
    },
  });
}
