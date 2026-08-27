import React, { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, RefreshControl, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  AdminAccount,
  deleteAccount,
  fetchAllAccounts,
  grantAdmin,
  isCurrentUserAdmin,
  revokeAdmin,
} from '../lib/api/admin';
import { PrimaryButton } from '../components/PrimaryButton';
import { FilterChip } from '../components/FilterChip';
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
type Tab = 'accounts' | 'ads';

function ManageAccountsTab() {
  const [status, setStatus] = useState<Status>('checking');
  const [accounts, setAccounts] = useState<AdminAccount[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

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
            setBusyId(account.id);
            try {
              await deleteAccount(account.id);
              setAccounts((prev) => prev.filter((a) => a.id !== account.id));
            } catch (error) {
              Alert.alert('Could not delete account', error instanceof Error ? error.message : 'Please try again.');
            } finally {
              setBusyId(null);
            }
          },
        },
      ]
    );
  };

  const handleToggleAdmin = (account: AdminAccount) => {
    const name = account.email ?? account.username ?? 'this account';
    const title = account.isAdmin ? `Remove admin access from ${name}?` : `Make ${name} an admin?`;
    const message = account.isAdmin
      ? undefined
      : 'They will be able to view every account and delete them, and grant admin access to others.';
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: account.isAdmin ? 'Remove Admin' : 'Make Admin',
        style: account.isAdmin ? 'destructive' : 'default',
        onPress: async () => {
          setBusyId(account.id);
          try {
            if (account.isAdmin) {
              await revokeAdmin(account.id);
            } else {
              await grantAdmin(account.id);
            }
            setAccounts((prev) =>
              prev.map((a) => (a.id === account.id ? { ...a, isAdmin: !a.isAdmin } : a))
            );
          } catch (error) {
            Alert.alert('Something went wrong', error instanceof Error ? error.message : 'Please try again.');
          } finally {
            setBusyId(null);
          }
        },
      },
    ]);
  };

  if (status === 'checking' || status === 'loading') {
    return (
      <View style={styles.centered}>
        <Text style={typography.body}>Loading...</Text>
      </View>
    );
  }

  if (status === 'not-authorized') {
    return <EmptyState icon="lock-closed-outline" message="You don't have access to this page." />;
  }

  return (
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
            <View style={styles.badgeColumn}>
              {item.isAdmin ? (
                <View style={styles.badge}>
                  <Ionicons name="shield-checkmark" size={14} color={colors.secondary} />
                  <Text style={[typography.meta, { color: colors.secondary }]}> Admin</Text>
                </View>
              ) : null}
              {item.emailConfirmedAt ? (
                <View style={styles.badge}>
                  <Ionicons name="checkmark-circle" size={14} color={colors.success} />
                  <Text style={[typography.meta, { color: colors.success }]}> Verified</Text>
                </View>
              ) : (
                <View style={styles.badge}>
                  <Ionicons name="time-outline" size={14} color={colors.textMuted} />
                  <Text style={typography.meta}> Unverified</Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.metaRow}>
            <Text style={typography.meta}>Joined {formatDate(item.createdAt)}</Text>
            <Text style={typography.meta}>Last active {formatDate(item.lastSignInAt)}</Text>
          </View>

          <PrimaryButton
            label={item.isAdmin ? 'Remove Admin' : 'Make Admin'}
            variant="outline"
            icon="shield-outline"
            loading={busyId === item.id}
            onPress={() => handleToggleAdmin(item)}
          />
          <View style={{ height: spacing.sm }} />
          <PrimaryButton
            label="Delete Account"
            variant="outline"
            icon="trash-outline"
            loading={busyId === item.id}
            onPress={() => handleDelete(item)}
          />
        </View>
      )}
    />
  );
}

function AdDeploymentTab() {
  return (
    <View style={styles.centered}>
      <EmptyState
        icon="megaphone-outline"
        message="Ad deployment isn't set up yet. When you're ready to run ads, this tab is where you'll create and publish them."
      />
    </View>
  );
}

export function AdminPortalScreen() {
  const [activeTab, setActiveTab] = useState<Tab>('accounts');

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.tabBar}>
        <FilterChip label="Manage Accounts" selected={activeTab === 'accounts'} onPress={() => setActiveTab('accounts')} />
        <FilterChip label="Ad Deployment" selected={activeTab === 'ads'} onPress={() => setActiveTab('ads')} />
      </View>
      <View style={styles.tabContent}>{activeTab === 'accounts' ? <ManageAccountsTab /> : <AdDeploymentTab />}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  tabBar: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: spacing.md, paddingTop: spacing.md },
  tabContent: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
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
  badgeColumn: { alignItems: 'flex-end', gap: spacing.xs },
  badge: { flexDirection: 'row', alignItems: 'center' },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: spacing.xs },
});
