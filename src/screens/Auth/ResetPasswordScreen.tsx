import React, { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { PrimaryButton } from '../../components/PrimaryButton';
import { PasswordInput } from '../../components/PasswordInput';
import { AppColors } from '../../theme/colors';
import { useTheme } from '../../theme/ThemeContext';
import { spacing } from '../../theme/typography';

// Shown instead of the normal signed-in app whenever AuthContext reports
// isPasswordRecovery — the session at this point came from a password-reset
// email link, not a real login, so the user must set a new password (or bail
// out via Cancel) before going any further.
export function ResetPasswordScreen() {
  const { updatePassword, signOut } = useAuth();
  const { colors, typography } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = password.length >= 6 && password === confirmPassword;

  const handleSave = async () => {
    setError(null);
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setIsSubmitting(true);
    const { error: updateError } = await updatePassword(password);
    setIsSubmitting(false);
    if (updateError) setError(updateError);
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={typography.title}>Set a new password</Text>
          <Text style={[typography.body, styles.helper]}>Choose a new password for your account.</Text>

          <Text style={[typography.bodyBold, styles.label]}>New Password</Text>
          <PasswordInput
            placeholder="At least 6 characters"
            value={password}
            onChangeText={setPassword}
            textContentType="newPassword"
          />

          <Text style={[typography.bodyBold, styles.label]}>Confirm Password</Text>
          <PasswordInput
            placeholder="Re-enter your new password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            textContentType="newPassword"
          />

          {error ? <Text style={[typography.body, styles.error]}>{error}</Text> : null}

          <View style={styles.buttonWrapper}>
            <PrimaryButton label="Save New Password" onPress={handleSave} disabled={!canSubmit} loading={isSubmitting} />
          </View>
          <PrimaryButton label="Cancel" variant="outline" onPress={() => signOut()} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    flex: { flex: 1 },
    content: { padding: spacing.md },
    helper: { color: colors.textMuted, marginVertical: spacing.md },
    label: { marginTop: spacing.lg, marginBottom: spacing.xs },
    error: { color: colors.danger, marginTop: spacing.md },
    buttonWrapper: { marginTop: spacing.xl, marginBottom: spacing.sm },
  });
}
