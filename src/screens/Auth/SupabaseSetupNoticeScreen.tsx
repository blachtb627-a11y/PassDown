import React from 'react';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { spacing, typography } from '../../theme/typography';

// Shown instead of crashing when EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY
// aren't set — happens on a fresh checkout or a preview build before secrets are wired up.
export function SupabaseSetupNoticeScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Ionicons name="construct-outline" size={40} color={colors.textMuted} />
        <Text style={[typography.title, styles.title]}>Almost ready</Text>
        <Text style={[typography.body, styles.message]}>
          Sign-in isn't connected yet. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY (see the
          README) and reload.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  content: { alignItems: 'center', paddingHorizontal: spacing.xl },
  title: { marginTop: spacing.md },
  message: { textAlign: 'center', color: colors.textMuted, marginTop: spacing.sm },
});
