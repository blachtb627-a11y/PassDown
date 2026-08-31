import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Image, RefreshControl, SafeAreaView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import {
  AdminAccount,
  deleteAccount,
  fetchAllAccounts,
  grantAdmin,
  isCurrentUserAdmin,
  revokeAdmin,
} from '../lib/api/admin';
import {
  Ad,
  AdMediaType,
  createAd,
  deleteAd,
  fetchAllAdsForAdmin,
  setAdActive,
  uploadAdMedia,
} from '../lib/api/ads';
import { useAppState } from '../context/AppStateContext';
import { PrimaryButton } from '../components/PrimaryButton';
import { FilterChip } from '../components/FilterChip';
import { EmptyState } from '../components/EmptyState';
import { confirm, getErrorMessage, notify } from '../lib/alert';
import { AppColors } from '../theme/colors';
import { useTheme } from '../theme/ThemeContext';
import { AppTypography, radius, spacing } from '../theme/typography';

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
  const { colors, typography } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
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
      notify('Something went wrong', getErrorMessage(error, 'Could not load accounts.'));
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

  const handleDelete = async (account: AdminAccount) => {
    const ok = await confirm({
      title: 'Delete this account?',
      message: `This permanently deletes ${account.email ?? account.username ?? 'this account'} and everything they posted. This cannot be undone.`,
      confirmLabel: 'Delete',
    });
    if (!ok) return;

    setBusyId(account.id);
    try {
      await deleteAccount(account.id);
      setAccounts((prev) => prev.filter((a) => a.id !== account.id));
    } catch (error) {
      notify('Could not delete account', getErrorMessage(error, 'Please try again.'));
    } finally {
      setBusyId(null);
    }
  };

  const handleToggleAdmin = async (account: AdminAccount) => {
    const name = account.email ?? account.username ?? 'this account';
    const title = account.isAdmin ? `Remove admin access from ${name}?` : `Make ${name} an admin?`;
    const message = account.isAdmin
      ? undefined
      : 'They will be able to view every account and delete them, and grant admin access to others.';
    const ok = await confirm({ title, message, confirmLabel: account.isAdmin ? 'Remove Admin' : 'Make Admin' });
    if (!ok) return;

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
      notify('Something went wrong', getErrorMessage(error, 'Please try again.'));
    } finally {
      setBusyId(null);
    }
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

type PickedMedia = { uri: string; type: AdMediaType };

function AdDeploymentTab() {
  const { currentUser } = useAppState();
  const { colors, typography } = useTheme();
  const styles = useMemo(() => createStyles(colors, typography), [colors, typography]);

  const [ads, setAds] = useState<Ad[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [companyName, setCompanyName] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [durationDays, setDurationDays] = useState('7');
  const [targetViewCount, setTargetViewCount] = useState('');
  const [pickedMedia, setPickedMedia] = useState<PickedMedia | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      setAds(await fetchAllAdsForAdmin());
    } catch (error) {
      notify('Something went wrong', getErrorMessage(error, 'Could not load ads.'));
    } finally {
      setIsLoading(false);
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

  const handlePickMedia = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      notify('Photo access needed', 'Allow photo library access in Settings to pick an ad image or video.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images', 'videos'], quality: 0.8 });
    if (!result.canceled) {
      const asset = result.assets[0];
      setPickedMedia({ uri: asset.uri, type: asset.type === 'video' ? 'video' : 'image' });
    }
  };

  const resetForm = () => {
    setCompanyName('');
    setLinkUrl('');
    setDurationDays('7');
    setTargetViewCount('');
    setPickedMedia(null);
  };

  const handleCreate = async () => {
    if (!companyName.trim() || !pickedMedia) {
      notify('Missing info', 'Add a company name and pick a photo or video first.');
      return;
    }
    const days = Number(durationDays);
    if (!Number.isFinite(days) || days <= 0) {
      notify('Invalid duration', 'Enter how many days this ad should run.');
      return;
    }
    const views = targetViewCount.trim() ? Number(targetViewCount) : undefined;
    if (views !== undefined && (!Number.isFinite(views) || views <= 0)) {
      notify('Invalid view limit', 'Enter a positive number of home views, or leave it blank for no limit.');
      return;
    }

    setIsSubmitting(true);
    try {
      const mediaUrl = await uploadAdMedia(pickedMedia.uri, pickedMedia.type, currentUser.id);
      const created = await createAd({
        companyName: companyName.trim(),
        mediaUrl,
        mediaType: pickedMedia.type,
        linkUrl: linkUrl.trim() || undefined,
        targetViewCount: views,
        durationDays: days,
      });
      setAds((prev) => [created, ...prev]);
      resetForm();
      notify('Ad created!', 'It will start showing on the Home feed right away.');
    } catch (error) {
      notify('Could not create ad', getErrorMessage(error, 'Please try again.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (target: Ad) => {
    const nextActive = !target.isActive;
    setBusyId(target.id);
    setAds((prev) => prev.map((a) => (a.id === target.id ? { ...a, isActive: nextActive } : a)));
    try {
      await setAdActive(target.id, nextActive);
    } catch (error) {
      setAds((prev) => prev.map((a) => (a.id === target.id ? { ...a, isActive: !nextActive } : a)));
      notify('Something went wrong', getErrorMessage(error, 'Could not update this ad.'));
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (target: Ad) => {
    const ok = await confirm({ title: `Delete this ad for ${target.companyName}?`, confirmLabel: 'Delete' });
    if (!ok) return;
    setBusyId(target.id);
    try {
      await deleteAd(target.id);
      setAds((prev) => prev.filter((a) => a.id !== target.id));
    } catch (error) {
      notify('Could not delete ad', getErrorMessage(error, 'Please try again.'));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <FlatList
      data={ads}
      keyExtractor={(item) => item.id}
      refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />}
      contentContainerStyle={styles.listContent}
      ListHeaderComponent={
        <View style={styles.formCard}>
          <Text style={[typography.subtitle, styles.formTitle]}>New Ad</Text>
          <TextInput
            style={styles.input}
            placeholder="Company name"
            placeholderTextColor={colors.textMuted}
            value={companyName}
            onChangeText={setCompanyName}
          />
          <TextInput
            style={styles.input}
            placeholder="Link when tapped (optional)"
            placeholderTextColor={colors.textMuted}
            value={linkUrl}
            onChangeText={setLinkUrl}
            autoCapitalize="none"
            keyboardType="url"
          />
          <View style={styles.formRow}>
            <View style={styles.formRowItem}>
              <Text style={[typography.meta, styles.fieldLabel]}>Run for how many days</Text>
              <TextInput
                style={styles.input}
                placeholder="7"
                placeholderTextColor={colors.textMuted}
                value={durationDays}
                onChangeText={setDurationDays}
                keyboardType="number-pad"
              />
            </View>
            <View style={styles.formRowItem}>
              <Text style={[typography.meta, styles.fieldLabel]}>Home views (optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="No limit"
                placeholderTextColor={colors.textMuted}
                value={targetViewCount}
                onChangeText={setTargetViewCount}
                keyboardType="number-pad"
              />
            </View>
          </View>

          {pickedMedia ? (
            pickedMedia.type === 'image' ? (
              <Image source={{ uri: pickedMedia.uri }} style={styles.previewMedia} />
            ) : (
              <View style={[styles.previewMedia, styles.videoPreview]}>
                <Ionicons name="videocam" size={28} color={colors.textMuted} />
                <Text style={typography.meta}>Video selected</Text>
              </View>
            )
          ) : null}

          <PrimaryButton
            label={pickedMedia ? 'Change Photo/Video' : 'Choose Photo or Video'}
            variant="outline"
            icon="image-outline"
            onPress={handlePickMedia}
          />
          <View style={{ height: spacing.sm }} />
          <PrimaryButton label="Create Ad" icon="megaphone-outline" loading={isSubmitting} onPress={handleCreate} />

          <Text style={[typography.subtitle, styles.listTitle]}>
            {ads.length} ad{ads.length === 1 ? '' : 's'}
          </Text>
        </View>
      }
      ListEmptyComponent={!isLoading ? <EmptyState icon="megaphone-outline" message="No ads yet — create one above." /> : null}
      renderItem={({ item }) => {
        const now = Date.now();
        const isExpired = item.endsAt ? new Date(item.endsAt).getTime() <= now : false;
        const daysLeft = item.endsAt ? Math.max(0, Math.ceil((new Date(item.endsAt).getTime() - now) / 86400000)) : null;
        const isCapped = item.targetViewCount !== undefined && item.viewCount >= item.targetViewCount;
        const isRunning = item.isActive && !isExpired && !isCapped;
        const statusLabel = isRunning ? 'Running' : !item.isActive ? 'Paused' : 'Ended';

        return (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={{ flex: 1 }}>
                <Text style={typography.bodyBold}>{item.companyName}</Text>
                <Text style={typography.meta}>{item.mediaType === 'video' ? 'Video ad' : 'Image ad'}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: isRunning ? colors.success : colors.textMuted }]}>
                <Text style={styles.statusBadgeText}>{statusLabel}</Text>
              </View>
            </View>
            <Text style={typography.meta}>
              {item.viewCount} view{item.viewCount === 1 ? '' : 's'}
              {item.targetViewCount ? ` of ${item.targetViewCount}` : ''}
              {daysLeft !== null ? ` · ${daysLeft} day${daysLeft === 1 ? '' : 's'} left` : ''}
            </Text>
            <PrimaryButton
              label={item.isActive ? 'Pause' : 'Resume'}
              variant="outline"
              icon={item.isActive ? 'pause-outline' : 'play-outline'}
              loading={busyId === item.id}
              onPress={() => handleToggleActive(item)}
            />
            <View style={{ height: spacing.sm }} />
            <PrimaryButton
              label="Delete Ad"
              variant="outline"
              icon="trash-outline"
              loading={busyId === item.id}
              onPress={() => handleDelete(item)}
            />
          </View>
        );
      }}
    />
  );
}

export function AdminPortalScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
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

function createStyles(colors: AppColors, typography?: AppTypography) {
  return StyleSheet.create({
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
  formCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  formTitle: { marginBottom: spacing.sm },
  formRow: { flexDirection: 'row', gap: spacing.sm },
  formRowItem: { flex: 1 },
  fieldLabel: { marginBottom: spacing.xs },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    backgroundColor: colors.background,
    marginBottom: spacing.sm,
    ...(typography ? typography.body : null),
  },
  previewMedia: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: radius.md,
    backgroundColor: colors.border,
    marginBottom: spacing.sm,
  },
  videoPreview: { alignItems: 'center', justifyContent: 'center', gap: spacing.xs },
  listTitle: { marginTop: spacing.lg, marginBottom: spacing.sm },
  statusBadge: { borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 3 },
  statusBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  });
}
