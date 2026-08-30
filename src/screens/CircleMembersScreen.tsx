import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Image, SafeAreaView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useAppState } from '../context/AppStateContext';
import { addCircleMember, deleteCircle, fetchCircle, fetchCircleMembers, removeCircleMember } from '../lib/api/circles';
import { searchUsers } from '../lib/api/social';
import { PrimaryButton } from '../components/PrimaryButton';
import { EmptyState } from '../components/EmptyState';
import { confirm, getErrorMessage, notify } from '../lib/alert';
import { AppColors } from '../theme/colors';
import { useTheme } from '../theme/ThemeContext';
import { AppTypography, radius, spacing } from '../theme/typography';
import { Author } from '../types/recipe';

export function CircleMembersScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'CircleMembers'>>();
  const { circleId } = route.params;
  const { currentUser } = useAppState();
  const { colors, typography } = useTheme();
  const styles = useMemo(() => createStyles(colors, typography), [colors, typography]);

  const [isOwner, setIsOwner] = useState(false);
  const [members, setMembers] = useState<Author[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [isLeavingOrDeleting, setIsLeavingOrDeleting] = useState(false);

  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Author[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const load = async () => {
    setIsLoading(true);
    try {
      const [circle, memberList] = await Promise.all([fetchCircle(circleId), fetchCircleMembers(circleId)]);
      setIsOwner(circle?.createdBy === currentUser.id);
      setMembers(memberList);
    } catch (error) {
      notify('Something went wrong', getErrorMessage(error, 'Could not load members.'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [circleId]);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    const timeout = setTimeout(() => {
      searchUsers(trimmed, currentUser.id)
        .then(setSearchResults)
        .catch(() => setSearchResults([]))
        .finally(() => setIsSearching(false));
    }, 400);
    return () => clearTimeout(timeout);
  }, [query, currentUser.id]);

  const memberIds = new Set(members.map((m) => m.id));

  const handleAdd = async (user: Author) => {
    setBusyId(user.id);
    try {
      await addCircleMember(circleId, user.id, currentUser.id);
      setMembers((prev) => [...prev, user]);
      setQuery('');
      setSearchResults([]);
    } catch (error) {
      notify('Could not add member', getErrorMessage(error, 'Please try again.'));
    } finally {
      setBusyId(null);
    }
  };

  const handleRemove = async (user: Author) => {
    const ok = await confirm({ title: `Remove ${user.name} from this circle?`, confirmLabel: 'Remove' });
    if (!ok) return;
    setBusyId(user.id);
    try {
      await removeCircleMember(circleId, user.id);
      setMembers((prev) => prev.filter((m) => m.id !== user.id));
    } catch (error) {
      notify('Could not remove member', getErrorMessage(error, 'Please try again.'));
    } finally {
      setBusyId(null);
    }
  };

  const handleLeaveOrDelete = async () => {
    const ok = await confirm({
      title: isOwner ? 'Delete this circle?' : 'Leave this circle?',
      message: isOwner ? 'This removes the circle for everyone in it. This cannot be undone.' : undefined,
      confirmLabel: isOwner ? 'Delete' : 'Leave',
    });
    if (!ok) return;
    setIsLeavingOrDeleting(true);
    try {
      if (isOwner) {
        await deleteCircle(circleId);
      } else {
        await removeCircleMember(circleId, currentUser.id);
      }
      navigation.navigate('Tabs');
    } catch (error) {
      notify('Something went wrong', getErrorMessage(error, 'Please try again.'));
      setIsLeavingOrDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator style={styles.loading} color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={members}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <Text style={[typography.subtitle, styles.sectionTitle]}>
            {members.length} member{members.length === 1 ? '' : 's'}
          </Text>
        }
        renderItem={({ item }) => (
          <View style={styles.memberRow}>
            <Image source={{ uri: item.avatarUri ?? 'https://picsum.photos/seed/circle-avatar/200' }} style={styles.avatar} />
            <View style={{ flex: 1 }}>
              <Text style={typography.bodyBold}>{item.name}</Text>
              {item.username ? <Text style={typography.meta}>@{item.username}</Text> : null}
            </View>
            {isOwner && item.id !== currentUser.id ? (
              <PrimaryButton
                label="Remove"
                variant="outline"
                fullWidth={false}
                loading={busyId === item.id}
                onPress={() => handleRemove(item)}
              />
            ) : null}
          </View>
        )}
        ListFooterComponent={
          <View style={styles.footer}>
            {isOwner ? (
              <>
                <Text style={[typography.subtitle, styles.sectionTitle]}>Add People</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Search by name or username..."
                  placeholderTextColor={colors.textMuted}
                  value={query}
                  onChangeText={setQuery}
                  autoCapitalize="none"
                />
                {isSearching ? <ActivityIndicator style={{ marginTop: spacing.sm }} color={colors.primary} /> : null}
                {searchResults
                  .filter((u) => !memberIds.has(u.id))
                  .map((user) => (
                    <View key={user.id} style={styles.memberRow}>
                      <Image
                        source={{ uri: user.avatarUri ?? 'https://picsum.photos/seed/circle-avatar/200' }}
                        style={styles.avatar}
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={typography.bodyBold}>{user.name}</Text>
                        {user.username ? <Text style={typography.meta}>@{user.username}</Text> : null}
                      </View>
                      <PrimaryButton
                        label="Add"
                        fullWidth={false}
                        loading={busyId === user.id}
                        onPress={() => handleAdd(user)}
                      />
                    </View>
                  ))}
              </>
            ) : null}

            <View style={styles.leaveButtonWrapper}>
              <PrimaryButton
                label={isOwner ? 'Delete Circle' : 'Leave Circle'}
                variant="outline"
                icon={isOwner ? 'trash-outline' : 'exit-outline'}
                loading={isLeavingOrDeleting}
                onPress={handleLeaveOrDelete}
              />
            </View>
          </View>
        }
        ListEmptyComponent={<EmptyState icon="people-outline" message="No members yet." />}
      />
    </SafeAreaView>
  );
}

function createStyles(colors: AppColors, typography: AppTypography) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    loading: { marginTop: spacing.xl },
    listContent: { padding: spacing.md },
    sectionTitle: { marginBottom: spacing.sm },
    memberRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.sm,
      marginBottom: spacing.sm,
    },
    avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.border },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.md,
      padding: spacing.md,
      backgroundColor: colors.surface,
      marginBottom: spacing.sm,
      ...typography.body,
    },
    footer: { marginTop: spacing.md },
    leaveButtonWrapper: { marginTop: spacing.lg },
  });
}
