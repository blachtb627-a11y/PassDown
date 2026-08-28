import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppColors } from '../theme/colors';
import { useTheme } from '../theme/ThemeContext';
import { spacing } from '../theme/typography';

type Props = {
  icon: keyof typeof Ionicons.glyphMap;
  message: string;
};

// Gentle, helpful empty states per the brief's tone & voice guidance (section 10.4).
export function EmptyState({ icon, message }: Props) {
  const { colors, typography } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      <Ionicons name={icon} size={40} color={colors.textMuted} />
      <Text style={[typography.body, styles.message]}>{message}</Text>
    </View>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    container: {
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.xl,
    },
    message: {
      color: colors.textMuted,
      textAlign: 'center',
      marginTop: spacing.md,
    },
  });
}
