import React from 'react';
import { FlatList, Image, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useAppState } from '../context/AppStateContext';
import { PrimaryButton } from '../components/PrimaryButton';
import { EmptyState } from '../components/EmptyState';
import { colors } from '../theme/colors';
import { radius, spacing, typography } from '../theme/typography';

export function ProfileScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute();
  const { recipes, followedAuthorIds, toggleFollowAuthor, currentUser } = useAppState();
  const userId = (route.params as { userId?: string } | undefined)?.userId ?? currentUser.id;

  const isOwnProfile = userId === currentUser.id;
  const authoredRecipes = recipes.filter((r) => (isOwnProfile ? r.author.id === currentUser.id : r.author.id === userId));
  const profileAuthor = isOwnProfile ? currentUser : authoredRecipes[0]?.author;

  if (!profileAuthor) {
    return <EmptyState icon="person-circle-outline" message="This profile couldn't be found." />;
  }

  const isFollowing = followedAuthorIds.includes(profileAuthor.id);

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={authoredRecipes}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={{ gap: spacing.md, paddingHorizontal: spacing.md }}
        contentContainerStyle={{ gap: spacing.md, paddingBottom: spacing.xl }}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.headerTop}>
              <Text style={typography.display}>{isOwnProfile ? 'Profile' : profileAuthor.name}</Text>
              {isOwnProfile ? (
                <Pressable
                  onPress={() => navigation.navigate('Settings')}
                  accessibilityRole="button"
                  accessibilityLabel="Settings"
                  style={styles.settingsButton}
                >
                  <Ionicons name="settings-outline" size={24} color={colors.secondary} />
                </Pressable>
              ) : null}
            </View>

            <View style={styles.profileRow}>
              <Image
                source={{ uri: profileAuthor.avatarUri ?? 'https://picsum.photos/seed/you-avatar/200' }}
                style={styles.avatar}
              />
              <View style={{ flex: 1 }}>
                <Text style={typography.subtitle}>{profileAuthor.name}</Text>
                {profileAuthor.bio ? <Text style={typography.body}>{profileAuthor.bio}</Text> : null}
                <View style={styles.countsRow}>
                  <Text style={typography.meta}>
                    <Text style={typography.bodyBold}>{authoredRecipes.length}</Text> recipes
                  </Text>
                  <Text style={typography.meta}>
                    <Text style={typography.bodyBold}>{profileAuthor.followerCount}</Text> followers
                  </Text>
                  <Text style={typography.meta}>
                    <Text style={typography.bodyBold}>{profileAuthor.followingCount}</Text> following
                  </Text>
                </View>
              </View>
            </View>

            {!isOwnProfile ? (
              <PrimaryButton
                label={isFollowing ? 'Following' : 'Follow'}
                variant={isFollowing ? 'outline' : 'primary'}
                onPress={() => toggleFollowAuthor(profileAuthor.id)}
              />
            ) : (
              <PrimaryButton label="Edit Profile" variant="outline" onPress={() => {}} />
            )}

            <Text style={[typography.subtitle, styles.recipesLabel]}>
              {isOwnProfile ? 'Your Recipes' : `${profileAuthor.name}'s Recipes`}
            </Text>
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            icon="restaurant-outline"
            message={isOwnProfile ? 'No recipes posted yet — tap the "+" button to share your first one.' : 'No recipes posted yet.'}
          />
        }
        renderItem={({ item }) => (
          <Pressable
            style={styles.gridItem}
            onPress={() => navigation.navigate('RecipeDetail', { recipeId: item.id })}
            accessibilityRole="button"
            accessibilityLabel={item.title}
          >
            <Image source={{ uri: item.photos[0] }} style={styles.gridPhoto} />
            <Text style={typography.bodyBold} numberOfLines={2}>
              {item.title}
            </Text>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: spacing.md, paddingTop: spacing.md },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  settingsButton: { minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center' },
  profileRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md, alignItems: 'center' },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.border },
  countsRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm },
  recipesLabel: { marginTop: spacing.lg, marginBottom: spacing.sm },
  gridItem: { flex: 1, gap: spacing.xs },
  gridPhoto: { width: '100%', aspectRatio: 1, borderRadius: radius.md, backgroundColor: colors.border },
});
