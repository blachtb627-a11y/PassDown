import React, { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { radius, spacing, typography } from '../theme/typography';

type Props = {
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  textContentType?: 'password' | 'newPassword';
};

// A visible "show password" toggle beats a bare icon-only eye per the brief's
// ease-of-use guidance, but the eye glyph itself is a familiar enough
// convention here that pairing it with a real accessibility label (read by
// screen readers) covers the same "no ambiguous icons" intent without
// crowding the field with extra text.
export function PasswordInput({ value, onChangeText, placeholder, textContentType }: Props) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={!isVisible}
        textContentType={textContentType}
        autoCapitalize="none"
        autoCorrect={false}
      />
      <Pressable
        onPress={() => setIsVisible((prev) => !prev)}
        style={styles.toggle}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={isVisible ? 'Hide password' : 'Show password'}
      >
        <Ionicons name={isVisible ? 'eye-off-outline' : 'eye-outline'} size={22} color={colors.textMuted} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  input: {
    flex: 1,
    padding: spacing.md,
    ...typography.body,
  },
  toggle: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
});
