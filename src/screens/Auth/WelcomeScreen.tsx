import React, { useMemo } from 'react';
import { Image, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { PrimaryButton } from '../../components/PrimaryButton';
import { AppColors } from '../../theme/colors';
import { useTheme } from '../../theme/ThemeContext';
import { spacing } from '../../theme/typography';

export function WelcomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { colors, typography } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Image source={require('../../../assets/logo.png')} style={styles.logoMark} accessibilityIgnoresInvertColors />
        <Text style={styles.logo}>PassDown</Text>
        <Text style={[typography.body, styles.tagline]}>
          An easy, warm place to share the recipes we cook for the people we love — and find new favorites from
          other home cooks.
        </Text>
      </View>

      <View style={styles.buttonStack}>
        <PrimaryButton label="Sign Up" onPress={() => navigation.navigate('SignUp')} />
        <View style={{ height: spacing.sm }} />
        <PrimaryButton label="Log In" variant="outline" onPress={() => navigation.navigate('LogIn')} />
      </View>
    </SafeAreaView>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background, justifyContent: 'space-between' },
    content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl },
    logoMark: { width: 128, height: 128, marginBottom: spacing.md },
    logo: { fontSize: 44, fontWeight: '700', color: colors.secondary, marginBottom: spacing.lg },
    tagline: { textAlign: 'center', color: colors.textMuted, fontSize: 17, lineHeight: 24 },
    buttonStack: { padding: spacing.lg },
  });
}
