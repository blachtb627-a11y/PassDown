import React, { useMemo, useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { useAuth } from '../../context/AuthContext';
import { PrimaryButton } from '../../components/PrimaryButton';
import { PasswordInput } from '../../components/PasswordInput';
import { AppColors } from '../../theme/colors';
import { useTheme } from '../../theme/ThemeContext';
import { AppTypography, radius, spacing } from '../../theme/typography';

export function LogInScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { signIn } = useAuth();
  const { colors, typography } = useTheme();
  const styles = useMemo(() => createStyles(colors, typography), [colors, typography]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = email.trim().length > 0 && password.length > 0;

  const handleLogIn = async () => {
    setError(null);
    setIsSubmitting(true);
    const { error: signInError } = await signIn(email.trim(), password);
    setIsSubmitting(false);
    if (signInError) setError(signInError);
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content}>
          <Image source={require('../../../assets/logo.png')} style={styles.logoMark} accessibilityIgnoresInvertColors />
          <Text style={typography.title}>Welcome back</Text>

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
            placeholder="Your password"
            value={password}
            onChangeText={setPassword}
            textContentType="password"
          />

          <Pressable
            onPress={() => navigation.navigate('ForgotPassword')}
            accessibilityRole="button"
            style={styles.forgotPassword}
          >
            <Text style={[typography.body, styles.forgotPasswordText]}>Forgot password?</Text>
          </Pressable>

          {error ? <Text style={[typography.body, styles.error]}>{error}</Text> : null}

          <View style={styles.buttonWrapper}>
            <PrimaryButton label="Log In" onPress={handleLogIn} disabled={!canSubmit} loading={isSubmitting} />
          </View>
          <PrimaryButton label="New here? Sign Up" variant="outline" onPress={() => navigation.replace('SignUp')} />
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
    forgotPassword: { marginTop: spacing.sm, alignSelf: 'flex-end', minHeight: 44, justifyContent: 'center' },
    forgotPasswordText: { color: colors.secondary },
  });
}
