import React, { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { useAuth } from '../../context/AuthContext';
import { PrimaryButton } from '../../components/PrimaryButton';
import { AppColors } from '../../theme/colors';
import { useTheme } from '../../theme/ThemeContext';
import { AppTypography, radius, spacing } from '../../theme/typography';

export function ForgotPasswordScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { sendPasswordReset } = useAuth();
  const { colors, typography } = useTheme();
  const styles = useMemo(() => createStyles(colors, typography), [colors, typography]);
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const handleSend = async () => {
    setError(null);
    setIsSubmitting(true);
    const { error: sendError } = await sendPasswordReset(email.trim());
    setIsSubmitting(false);
    if (sendError) {
      setError(sendError);
    } else {
      setSent(true);
    }
  };

  if (sent) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Text style={typography.title}>Check your email</Text>
          <Text style={[typography.body, styles.helper]}>
            If an account exists for {email}, we sent a link to reset your password. Tap it, then set a new
            password.
          </Text>
          <PrimaryButton label="Back to Log In" onPress={() => navigation.replace('LogIn')} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={typography.title}>Reset your password</Text>
          <Text style={[typography.body, styles.helper]}>
            Enter your email and we'll send you a link to set a new password.
          </Text>

          <Text style={[typography.bodyBold, styles.label]}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="you@example.com"
            placeholderTextColor={colors.textMuted}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            textContentType="emailAddress"
          />

          {error ? <Text style={[typography.body, styles.error]}>{error}</Text> : null}

          <View style={styles.buttonWrapper}>
            <PrimaryButton
              label="Send Reset Link"
              onPress={handleSend}
              disabled={email.trim().length === 0}
              loading={isSubmitting}
            />
          </View>
          <PrimaryButton label="Back to Log In" variant="outline" onPress={() => navigation.replace('LogIn')} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function createStyles(colors: AppColors, typography: AppTypography) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    flex: { flex: 1 },
    content: { padding: spacing.md },
    helper: { color: colors.textMuted, marginVertical: spacing.md },
    label: { marginTop: spacing.lg, marginBottom: spacing.xs },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.md,
      padding: spacing.md,
      backgroundColor: colors.surface,
      ...typography.body,
    },
    error: { color: colors.danger, marginTop: spacing.md },
    buttonWrapper: { marginTop: spacing.xl, marginBottom: spacing.sm },
  });
}
