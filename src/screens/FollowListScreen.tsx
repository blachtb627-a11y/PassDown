import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, SafeAreaView, StyleSheet } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useAppState } from '../context/AppStateContext';
import { fetchFollowers, fetchFollowing } from '../lib/api/social';
import { UserResultCard } from '../components/UserResultCard';
import { EmptyState } from '../components/EmptyState';
import { AppColors } from '../theme/colors';
import { useTheme } from '../theme/ThemeContext';
import { spacing } from '../theme/typography';
import { Author } from '../types/recipe';

export function FollowListScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'FollowList'>>();
  const { userId, mode } = route.params;
  const { followedAuthorIds, followBusyIds, toggleFollowAuthor } = useAppState();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [users, setUsers] = useState<Author[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    const load = mode === 'followers' ? fetchFollowers(userId) : fetchFollowing(userId);
    load
      .then((result) => {
        if (!cancelled) setUsers(result);
      })
      .catch((error) => console.error(`Failed to load ${mode}`, error))
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId, mode]);

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={users}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator style={styles.loading} color={colors.primary} />
          ) : (
            <EmptyState
              icon="people-outline"
              message={mode === 'followers' ? 'No followers yet.' : 'Not following anyone yet.'}
            />
          )
        }
        renderItem={({ item }) => (
          <UserResultCard
            user={item}
            isFollowing={followedAuthorIds.includes(item.id)}
            isFollowBusy={followBusyIds.has(item.id)}
            onToggleFollow={() => toggleFollowAuthor(item.id)}
            onPress={() => navigation.navigate('UserProfile', { userId: item.id })}
          />
        )}
      />
    </SafeAreaView>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    list: { padding: spacing.md },
    loading: { marginTop: spacing.xl },
  });
}
