import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { useAuth } from '../../context/AuthContext';
import { PrimaryButton } from '../../components/PrimaryButton';
import { colors } from '../../theme/colors';
import { radius, spacing, typography } from '../../theme/typography';

export function SignUpScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { signUp } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmationSent, setConfirmationSent] = useState(false);

  const canSubmit = fullName.trim().length > 0 && email.trim().length > 0 && password.length >= 6;

  const handleSignUp = async () => {
    setError(null);
    setIsSubmitting(true);
    const { error: signUpError } = await signUp(email.trim(), password, fullName.trim());
    setIsSubmitting(false);
    if (signUpError) {
      setError(signUpError);
    } else {
      setConfirmationSent(true);
    }
  };

  if (confirmationSent) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Text style={typography.title}>Check your email</Text>
          <Text style={[typography.body, styles.helper]}>
            We sent a confirmation link to {email}. Tap it, then come back and log in.
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
          <Text style={typography.title}>Create your account</Text>

          <Text style={[typography.bodyBold, styles.label]}>Your Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Jane Doe"
            placeholderTextColor={colors.textMuted}
            value={fullName}
            onChangeText={setFullName}
            autoCapitalize="words"
          />

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

          <Text style={[typography.bodyBold, styles.label]}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="At least 6 characters"
            placeholderTextColor={colors.textMuted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            textContentType="newPassword"
          />

          {error ? <Text style={[typography.body, styles.error]}>{error}</Text> : null}

          <View style={styles.buttonWrapper}>
            <PrimaryButton label="Sign Up" onPress={handleSignUp} disabled={!canSubmit} loading={isSubmitting} />
          </View>
          <PrimaryButton label="Already have an account? Log In" variant="outline" onPress={() => navigation.replace('LogIn')} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
