import React, { useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { spacing, typography } from '../theme/typography';

type ToggleRowProps = { label: string; value: boolean; onValueChange: (v: boolean) => void };

function ToggleRow({ label, value, onValueChange }: ToggleRowProps) {
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
  const [notifyFollowers, setNotifyFollowers] = useState(true);
  const [notifyLikesComments, setNotifyLikesComments] = useState(true);
  const [notifyMadeThis, setNotifyMadeThis] = useState(true);
  const [notifyDigest, setNotifyDigest] = useState(false);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={typography.subtitle}>Notifications</Text>
        <ToggleRow label="New followers" value={notifyFollowers} onValueChange={setNotifyFollowers} />
        <ToggleRow label="Likes & comments" value={notifyLikesComments} onValueChange={setNotifyLikesComments} />
        <ToggleRow label='"I made this!" posts' value={notifyMadeThis} onValueChange={setNotifyMadeThis} />
        <ToggleRow label="Weekly digest" value={notifyDigest} onValueChange={setNotifyDigest} />

        <Text style={[typography.subtitle, styles.sectionSpacing]}>Account</Text>
        <Text style={typography.body}>{'blachtb627@gmail.com'}</Text>

        <Text style={[typography.subtitle, styles.sectionSpacing]}>About</Text>
        <Text style={typography.body}>PassDown — an easy, warm place to share the recipes we cook for the people we love.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
});
