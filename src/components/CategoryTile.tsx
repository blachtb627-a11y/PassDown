import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { radius, spacing, typography } from '../theme/typography';

type Props = {
  label: string;
  photoUri: string;
  onPress: () => void;
};

export function CategoryTile({ label, photoUri, onPress }: Props) {
  return (
    <Pressable onPress={onPress} style={styles.tile} accessibilityRole="button" accessibilityLabel={label}>
      <Image source={{ uri: photoUri }} style={styles.photo} />
      <View style={styles.overlay}>
        <Text style={[typography.bodyBold, { color: colors.white }]}>{label}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    width: '48%',
    aspectRatio: 1.3,
    borderRadius: radius.md,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  photo: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.border,
  },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.overlay,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
});
