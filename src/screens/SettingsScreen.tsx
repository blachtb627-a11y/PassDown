import React, { useEffect, useMemo, useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useAuth } from '../context/AuthContext';
import { isCurrentUserAdmin } from '../lib/api/admin';
import { PrimaryButton } from '../components/PrimaryButton';
import { AppColors } from '../theme/colors';
import { useTheme } from '../theme/ThemeContext';
import { AppTypography, spacing } from '../theme/typography';

type ToggleRowProps = { label: string; value: boolean; onValueChange: (v: boolean) => void };

function ToggleRow({ label, value, onValueChange }: ToggleRowProps) {
  const { colors, typography } = useTheme();
  const styles = useMemo(() => createStyles(colors, typography), [colors, typography]);
  return (
    <View style={styles.row}>
      <Text style={typography.body}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ true: colors.secondary }}
        accessibilityLabel={label}
      />
    </View>
  );
}

export function SettingsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { session, signOut } = useAuth();
  const { colors, typography, isDark, toggleTheme } = useTheme();
  const styles = useMemo(() => createStyles(colors, typography), [colors, typography]);
  const [notifyFollowers, setNotifyFollowers] = useState(true);
  const [notifyLikesComments, setNotifyLikesComments] = useState(true);
  const [notifyMadeThis, setNotifyMadeThis] = useState(true);
  const [notifyDigest, setNotifyDigest] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    isCurrentUserAdmin().then(setIsAdmin);
  }, []);

  const handleSignOut = async () => {
    if (isSigningOut) return;
    setIsSigningOut(true);
    try {
      await signOut();
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={typography.subtitle}>Appearance</Text>
        <ToggleRow label="Dark mode" value={isDark} onValueChange={toggleTheme} />

        <Text style={[typography.subtitle, styles.sectionSpacing]}>Notifications</Text>
        <ToggleRow label="New followers" value={notifyFollowers} onValueChange={setNotifyFollowers} />
        <ToggleRow label="Likes & comments" value={notifyLikesComments} onValueChange={setNotifyLikesComments} />
        <ToggleRow label='"I made this!" posts' value={notifyMadeThis} onValueChange={setNotifyMadeThis} />
        <ToggleRow label="Weekly digest" value={notifyDigest} onValueChange={setNotifyDigest} />

        <Text style={[typography.subtitle, styles.sectionSpacing]}>Account</Text>
        <Text style={typography.body}>{session?.user.email}</Text>
        <View style={styles.signOutButton}>
          <PrimaryButton label="Log Out" variant="outline" loading={isSigningOut} onPress={handleSignOut} />
        </View>

        {isAdmin ? (
          <>
            <Text style={[typography.subtitle, styles.sectionSpacing]}>Admin</Text>
            <PrimaryButton
              label="Admin Portal"
              icon="shield-checkmark-outline"
              variant="outline"
              onPress={() => navigation.navigate('AdminPortal')}
            />
          </>
        ) : null}

        <Text style={[typography.subtitle, styles.sectionSpacing]}>About</Text>
        <Text style={typography.body}>PassDown — an easy, warm place to share the recipes we cook for the people we love.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(colors: AppColors, typography: AppTypography) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: spacing.md },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      minHeight: 48,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    sectionSpacing: { marginTop: spacing.xl, marginBottom: spacing.sm },
    signOutButton: { marginTop: spacing.md },
  });
}
