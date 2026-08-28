import React, { useEffect, useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useAppState } from '../context/AppStateContext';
import { isUsernameTaken } from '../lib/api/social';
import { PrimaryButton } from '../components/PrimaryButton';
import { notify } from '../lib/alert';
import { colors } from '../theme/colors';
import { radius, spacing, typography } from '../theme/typography';

const USERNAME_PATTERN = /^[a-zA-Z0-9_]{3,20}$/;

type UsernameStatus = 'idle' | 'unchanged' | 'checking' | 'available' | 'taken' | 'invalid';

export function EditProfileScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { currentUser, updateProfile } = useAppState();

  const [fullName, setFullName] = useState(currentUser.name);
  const [username, setUsername] = useState(currentUser.username);
  const [bio, setBio] = useState(currentUser.bio ?? '');
  const [avatarUri, setAvatarUri] = useState<string | undefined>(currentUser.avatarUri);
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>('unchanged');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const trimmed = username.trim();
    if (trimmed.toLowerCase() === currentUser.username.toLowerCase()) {
      setUsernameStatus('unchanged');
      return;
    }
    if (!trimmed) {
      setUsernameStatus('invalid');
      return;
    }
    if (!USERNAME_PATTERN.test(trimmed)) {
      setUsernameStatus('invalid');
      return;
    }
    setUsernameStatus('checking');
    const timeout = setTimeout(() => {
      isUsernameTaken(trimmed, currentUser.id)
        .then((taken) => setUsernameStatus(taken ? 'taken' : 'available'))
        .catch(() => setUsernameStatus('idle'));
    }, 500);
    return () => clearTimeout(timeout);
  }, [username, currentUser.username, currentUser.id]);

  const canSubmit =
    fullName.trim().length > 0 &&
    (usernameStatus === 'unchanged' || usernameStatus === 'available') &&
    !isSubmitting;

  const handlePickAvatar = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      notify('Photo access needed', 'Allow photo library access in Settings to change your profile photo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (!result.canceled) {
      setAvatarUri(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      const isNewLocalPhoto = !!avatarUri && avatarUri !== currentUser.avatarUri;
      await updateProfile({
        fullName: fullName.trim(),
        username: username.trim(),
        bio: bio.trim(),
        avatarUrl: isNewLocalPhoto ? undefined : avatarUri,
        localAvatarUri: isNewLocalPhoto ? avatarUri : undefined,
      });
      navigation.goBack();
    } catch (error) {
      notify('Could not save changes', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const usernameMessage: Record<Exclude<UsernameStatus, 'idle' | 'unchanged'>, string> = {
    checking: 'Checking availability...',
    available: 'Username available',
    taken: 'That username is already taken.',
    invalid: '3-20 letters, numbers, or underscores.',
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content}>
          <Pressable onPress={handlePickAvatar} style={styles.avatarWrapper} accessibilityRole="button" accessibilityLabel="Change profile photo">
            <Image
              source={{ uri: avatarUri ?? 'https://picsum.photos/seed/you-avatar/200' }}
              style={styles.avatar}
            />
            <View style={styles.avatarBadge}>
              <Ionicons name="camera" size={16} color={colors.surface} />
            </View>
          </Pressable>
          <Text style={[typography.meta, styles.avatarHint]}>Tap to change photo</Text>

          <Text style={[typography.bodyBold, styles.label]}>Your Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Jane Doe"
            placeholderTextColor={colors.textMuted}
            value={fullName}
            onChangeText={setFullName}
            autoCapitalize="words"
          />

          <Text style={[typography.bodyBold, styles.label]}>Username</Text>
          <TextInput
            style={styles.input}
            placeholder="janedoe"
            placeholderTextColor={colors.textMuted}
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {usernameStatus !== 'idle' && usernameStatus !== 'unchanged' ? (
            <Text
              style={[
                typography.meta,
                styles.usernameStatus,
                usernameStatus === 'available' && styles.usernameAvailable,
                (usernameStatus === 'taken' || usernameStatus === 'invalid') && styles.usernameTaken,
              ]}
            >
              {usernameMessage[usernameStatus]}
            </Text>
          ) : null}

          <Text style={[typography.bodyBold, styles.label]}>Bio</Text>
          <TextInput
            style={[styles.input, styles.bioInput]}
            placeholder="Tell people a little about yourself"
            placeholderTextColor={colors.textMuted}
            value={bio}
            onChangeText={setBio}
            multiline
            numberOfLines={4}
          />

          <View style={styles.buttonWrapper}>
            <PrimaryButton label="Save Changes" onPress={handleSave} disabled={!canSubmit} loading={isSubmitting} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  content: { padding: spacing.md, alignItems: 'stretch' },
  avatarWrapper: { alignSelf: 'center', marginTop: spacing.md },
  avatar: { width: 96, height: 96, borderRadius: 48, backgroundColor: colors.border },
  avatarBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.background,
  },
  avatarHint: { alignSelf: 'center', marginTop: spacing.xs, color: colors.textMuted },
  label: { marginTop: spacing.lg, marginBottom: spacing.xs },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
    ...typography.body,
  },
  bioInput: { minHeight: 100, textAlignVertical: 'top' },
  usernameStatus: { marginTop: spacing.xs, color: colors.textMuted },
  usernameAvailable: { color: colors.success },
  usernameTaken: { color: colors.danger },
  buttonWrapper: { marginTop: spacing.xl, marginBottom: spacing.sm },
});
