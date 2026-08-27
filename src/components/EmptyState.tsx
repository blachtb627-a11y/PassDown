import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { spacing, typography } from '../theme/typography';

type Props = {
  icon: keyof typeof Ionicons.glyphMap;
  message: string;
};

// Gentle, helpful empty states per the brief's tone & voice guidance (section 10.4).
export function EmptyState({ icon, message }: Props) {
  return (
    <View style={styles.container}>
      <Ionicons name={icon} size={40} color={colors.textMuted} />
      <Text style={[typography.body, styles.message]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
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
