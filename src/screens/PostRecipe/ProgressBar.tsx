import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../../theme/colors';
import { radius, spacing, typography } from '../../theme/typography';
import { STEP_TITLES } from './formTypes';

export function ProgressBar({ stepIndex }: { stepIndex: number }) {
  return (
    <View style={styles.container}>
      <Text style={typography.meta}>
        Step {stepIndex + 1} of {STEP_TITLES.length} — {STEP_TITLES[stepIndex]}
      </Text>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${((stepIndex + 1) / STEP_TITLES.length) * 100}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: spacing.md, paddingTop: spacing.sm },
  track: { height: 8, borderRadius: radius.pill, backgroundColor: colors.border, marginTop: spacing.xs, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: colors.primary },
});
