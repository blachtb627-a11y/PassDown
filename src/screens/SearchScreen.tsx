import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, SafeAreaView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useAppState } from '../context/AppStateContext';
import { fetchSuggestedUsers, searchUsers } from '../lib/api/social';
import { UserResultCard } from '../components/UserResultCard';
import { EmptyState } from '../components/EmptyState';
import { AppColors } from '../theme/colors';
import { useTheme } from '../theme/ThemeContext';
import { AppTypography, radius, spacing } from '../theme/typography';
import { Author } from '../types/recipe';

export function SearchScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { currentUser, followedAuthorIds, followBusyIds, toggleFollowAuthor } = useAppState();
  const { colors, typography } = useTheme();
  const styles = useMemo(() => createStyles(colors, typography), [colors, typography]);
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [results, setResults] = useState<Author[]>([]);
  const isSearching = query.trim().length > 0;

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    const load = isSearching
      ? searchUsers(query, currentUser.id)
      : fetchSuggestedUsers([currentUser.id, ...followedAuthorIds]);
    const timeout = setTimeout(
      () => {
        load
          .then((users) => {
            if (!cancelled) setResults(users);
          })
          .catch((error) => console.error('Failed to load people', error))
          .finally(() => {
            if (!cancelled) setIsLoading(false);
          });
      },
      isSearching ? 400 : 0
    );
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, currentUser.id]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.searchBarWrapper}>
        <Ionicons name="search" size={20} color={colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search people by name or username..."
          placeholderTextColor={colors.textMuted}
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          returnKeyType="search"
        />
      </View>
      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.peopleList}
        ListHeaderComponent={
          !isSearching ? <Text style={[typography.subtitle, styles.peopleHeader]}>Suggested for you</Text> : null
        }
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator style={styles.loading} color={colors.primary} />
          ) : (
            <EmptyState
              icon="people-outline"
              message={isSearching ? 'No one found with that name or username.' : 'No suggestions right now.'}
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

function createStyles(colors: AppColors, typography: AppTypography) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    peopleList: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl },
    peopleHeader: { marginTop: spacing.md, marginBottom: spacing.sm },
    loading: { marginTop: spacing.xl },
    searchBarWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      margin: spacing.md,
      paddingHorizontal: spacing.md,
      minHeight: 48,
      borderRadius: radius.pill,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    searchInput: { flex: 1, ...typography.body, paddingVertical: spacing.sm },
  });
}
