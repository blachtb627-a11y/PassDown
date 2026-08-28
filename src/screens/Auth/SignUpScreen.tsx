import React, { useEffect, useMemo, useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { useAuth } from '../../context/AuthContext';
import { isUsernameTaken } from '../../lib/api/social';
import { PrimaryButton } from '../../components/PrimaryButton';
import { PasswordInput } from '../../components/PasswordInput';
import { AppColors } from '../../theme/colors';
import { useTheme } from '../../theme/ThemeContext';
import { AppTypography, radius, spacing } from '../../theme/typography';

const USERNAME_PATTERN = /^[a-zA-Z0-9_]{3,20}$/;

type UsernameStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid';

export function SignUpScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { signUp } = useAuth();
  const { colors, typography } = useTheme();
  const styles = useMemo(() => createStyles(colors, typography), [colors, typography]);
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>('idle');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmationSent, setConfirmationSent] = useState(false);

  useEffect(() => {
    const trimmed = username.trim();
    if (!trimmed) {
      setUsernameStatus('idle');
      return;
    }
    if (!USERNAME_PATTERN.test(trimmed)) {
      setUsernameStatus('invalid');
      return;
    }
    setUsernameStatus('checking');
    const timeout = setTimeout(() => {
      isUsernameTaken(trimmed)
        .then((taken) => setUsernameStatus(taken ? 'taken' : 'available'))
        .catch(() => setUsernameStatus('idle'));
    }, 500);
    return () => clearTimeout(timeout);
  }, [username]);

  const canSubmit =
    fullName.trim().length > 0 &&
    usernameStatus === 'available' &&
    email.trim().length > 0 &&
    password.length >= 6;

  const handleSignUp = async () => {
    setError(null);
    setIsSubmitting(true);
    const { error: signUpError } = await signUp(email.trim(), password, fullName.trim(), username.trim());
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

  const usernameMessage: Record<Exclude<UsernameStatus, 'idle'>, string> = {
    checking: 'Checking availability...',
    available: 'Username available',
    taken: 'That username is already taken.',
    invalid: '3-20 letters, numbers, or underscores.',
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content}>
          <Image source={require('../../../assets/logo.png')} style={styles.logoMark} accessibilityIgnoresInvertColors />
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

          <Text style={[typography.bodyBold, styles.label]}>Username</Text>
          <TextInput
            style={styles.input}
            placeholder="janedoe"
            placeholderTextColor={colors.textMuted}
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {usernameStatus !== 'idle' ? (
            <Text
              style={[
                typography.meta,
                styles.usernameStatus,
                usernameStatus === 'available' && styles.usernameAvailable,
                (usernameStatus === 'taken' || usernameStatus === 'invalid') && styles.usernameTaken,
              ]}
            >
              {usernameMessage[usernameStatus]}
            </Text>
          ) : null}

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
          <PasswordInput
            placeholder="At least 6 characters"
            value={password}
            onChangeText={setPassword}
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

function createStyles(colors: AppColors, typography: AppTypography) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    flex: { flex: 1 },
    content: { padding: spacing.md },
    logoMark: { width: 64, height: 64, alignSelf: 'center', marginBottom: spacing.md },
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
    usernameStatus: { marginTop: spacing.xs, color: colors.textMuted },
    usernameAvailable: { color: colors.success },
    usernameTaken: { color: colors.danger },
    error: { color: colors.danger, marginTop: spacing.md },
    buttonWrapper: { marginTop: spacing.xl, marginBottom: spacing.sm },
  });
}
