import React, { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, RefreshControl, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AdminAccount, deleteAccount, fetchAllAccounts, isCurrentUserAdmin } from '../lib/api/admin';
import { PrimaryButton } from '../components/PrimaryButton';
import { EmptyState } from '../components/EmptyState';
import { colors } from '../theme/colors';
import { radius, spacing, typography } from '../theme/typography';

function formatDate(iso: string | null): string {
  if (!iso) return 'Never';
  return new Date(iso).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

type Status = 'checking' | 'not-authorized' | 'loading' | 'ready';

export function AdminPortalScreen() {
  const [status, setStatus] = useState<Status>('checking');
  const [accounts, setAccounts] = useState<AdminAccount[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const admin = await isCurrentUserAdmin();
    if (!admin) {
      setStatus('not-authorized');
      return;
    }
    setStatus('loading');
    try {
      const result = await fetchAllAccounts();
      result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setAccounts(result);
      setStatus('ready');
    } catch (error) {
      Alert.alert('Something went wrong', error instanceof Error ? error.message : 'Could not load accounts.');
      setStatus('ready');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await load();
    setIsRefreshing(false);
  };

  const handleDelete = (account: AdminAccount) => {
    Alert.alert(
      'Delete this account?',
      `This permanently deletes ${account.email ?? account.username ?? 'this account'} and everything they posted. This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeletingId(account.id);
            try {
              await deleteAccount(account.id);
              setAccounts((prev) => prev.filter((a) => a.id !== account.id));
            } catch (error) {
              Alert.alert('Could not delete account', error instanceof Error ? error.message : 'Please try again.');
            } finally {
              setDeletingId(null);
            }
          },
        },
      ]
    );
  };

  if (status === 'checking' || status === 'loading') {
    return (
      <SafeAreaView style={[styles.container, styles.centered]}>
        <Text style={typography.body}>Loading...</Text>
      </SafeAreaView>
    );
  }

  if (status === 'not-authorized') {
    return <EmptyState icon="lock-closed-outline" message="You don't have access to this page." />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={accounts}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <Text style={[typography.meta, styles.countLabel]}>
            {accounts.length} account{accounts.length === 1 ? '' : 's'}
          </Text>
        }
        ListEmptyComponent={<EmptyState icon="people-outline" message="No accounts yet." />}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={{ flex: 1 }}>
                <Text style={typography.bodyBold}>{item.email ?? 'No email'}</Text>
                <Text style={typography.meta}>
                  {item.fullName ?? 'Unnamed'} {item.username ? `· @${item.username}` : ''}
                </Text>
              </View>
              {item.emailConfirmedAt ? (
                <View style={styles.confirmedBadge}>
                  <Ionicons name="checkmark-circle" size={14} color={colors.success} />
                  <Text style={[typography.meta, { color: colors.success }]}> Verified</Text>
                </View>
              ) : (
                <View style={styles.confirmedBadge}>
                  <Ionicons name="time-outline" size={14} color={colors.textMuted} />
                  <Text style={typography.meta}> Unverified</Text>
                </View>
              )}
            </View>

            <View style={styles.metaRow}>
              <Text style={typography.meta}>Joined {formatDate(item.createdAt)}</Text>
              <Text style={typography.meta}>Last active {formatDate(item.lastSignInAt)}</Text>
            </View>

            <PrimaryButton
              label="Delete Account"
              variant="outline"
              icon="trash-outline"
              loading={deletingId === item.id}
              onPress={() => handleDelete(item)}
            />
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { alignItems: 'center', justifyContent: 'center' },
  listContent: { padding: spacing.md },
  countLabel: { marginBottom: spacing.sm },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  confirmedBadge: { flexDirection: 'row', alignItems: 'center' },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: spacing.xs },
});
