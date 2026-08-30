import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppColors } from '../theme/colors';
import { useTheme } from '../theme/ThemeContext';
import { radius, spacing } from '../theme/typography';

type Props = {
  label: string;
  value: string | null;
  placeholder?: string;
  onPress: () => void;
};

export function DropdownButton({ label, value, placeholder = 'All', onPress }: Props) {
  const { colors, typography } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <Pressable style={styles.button} onPress={onPress} accessibilityRole="button" accessibilityLabel={label}>
      <View style={{ flex: 1 }}>
        <Text style={typography.meta}>{label}</Text>
        <Text style={typography.bodyBold} numberOfLines={1}>
          {value ?? placeholder}
        </Text>
      </View>
      <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
    </Pressable>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    button: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      minHeight: 52,
      paddingHorizontal: spacing.md,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
  });
}
