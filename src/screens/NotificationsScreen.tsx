import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Image, Pressable, RefreshControl, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppNotification, fetchNotifications, markAllNotificationsRead, NotificationType } from '../lib/api/notifications';
import { useAppState } from '../context/AppStateContext';
import { EmptyState } from '../components/EmptyState';
import { getErrorMessage, notify } from '../lib/alert';
import { formatRelativeTime } from '../lib/relativeTime';
import { AppColors } from '../theme/colors';
import { useTheme } from '../theme/ThemeContext';
import { radius, spacing } from '../theme/typography';
import { RootStackParamList } from '../navigation/types';

const TYPE_ICON: Record<NotificationType, keyof typeof Ionicons.glyphMap> = {
  follow: 'person-add-outline',
  like: 'heart-outline',
  comment: 'chatbubble-outline',
  made_this: 'restaurant-outline',
};

function describeNotification(n: AppNotification): string {
  const title = n.recipeTitle ? ` "${n.recipeTitle}"` : '';
  switch (n.type) {
    case 'follow':
      return `${n.actorName} started following you.`;
    case 'like':
      return `${n.actorName} liked your recipe${title}.`;
    case 'comment':
      return `${n.actorName} commented on your recipe${title}.`;
    case 'made_this':
      return `${n.actorName} made your recipe${title}!`;
  }
}

export function NotificationsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { currentUser, refreshUnreadNotificationCount } = useAppState();
  const { colors, typography } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const result = await fetchNotifications(currentUser.id);
      setNotifications(result);
      // Opening this screen is itself "seeing" them — matches how most apps
      // clear an unread badge just by opening the list, no per-item tap or
      // separate "mark all read" action needed. The dot on each row still
      // reflects whether it was unread when this screen loaded, so a viewer
      // can tell what's new this visit.
      if (result.some((n) => !n.isRead)) {
        await markAllNotificationsRead(currentUser.id);
        await refreshUnreadNotificationCount();
      }
    } catch (error) {
      notify('Something went wrong', getErrorMessage(error, 'Could not load notifications.'));
    } finally {
      setIsLoading(false);
    }
  }, [currentUser.id, refreshUnreadNotificationCount]);

  useEffect(() => {
    load();
  }, [load]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await load();
    setIsRefreshing(false);
  };

  const handlePress = (n: AppNotification) => {
    if (n.type === 'follow') {
      if (n.actorId) navigation.navigate('UserProfile', { userId: n.actorId });
    } else if (n.recipeId) {
      navigation.navigate('RecipeDetail', { recipeId: n.recipeId, focusComments: n.type === 'comment' });
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Text style={typography.body}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <EmptyState
            icon="notifications-outline"
            message="No notifications yet — likes, comments, follows, and made-this posts will show up here."
          />
        }
        renderItem={({ item }) => (
          <Pressable
            style={styles.row}
            onPress={() => handlePress(item)}
            accessibilityRole="button"
            accessibilityLabel={describeNotification(item)}
          >
            {!item.isRead ? <View style={styles.unreadDot} /> : <View style={styles.unreadDotSpacer} />}
            <View style={styles.avatarWrapper}>
              <Image
                source={{ uri: item.actorAvatarUrl ?? 'https://picsum.photos/seed/user-avatar/200' }}
                style={styles.avatar}
              />
              <View style={styles.iconBadge}>
                <Ionicons name={TYPE_ICON[item.type]} size={12} color={colors.white} />
              </View>
            </View>
            <View style={styles.textColumn}>
              <Text style={typography.body}>{describeNotification(item)}</Text>
              <Text style={typography.meta}>{formatRelativeTime(item.createdAt)}</Text>
            </View>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    listContent: { padding: spacing.md },
    row: {
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
    unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
    unreadDotSpacer: { width: 8, height: 8 },
    avatarWrapper: { width: 44, height: 44 },
    avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.border },
    iconBadge: {
      position: 'absolute',
      right: -4,
      bottom: -4,
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: colors.secondary,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: colors.surface,
    },
    textColumn: { flex: 1 },
  });
}
