import React from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { PrimaryButton } from '../../components/PrimaryButton';
import { colors } from '../../theme/colors';
import { radius, spacing, typography } from '../../theme/typography';

const MAX_PHOTOS = 10;

type Props = {
  photos: string[];
  onChange: (photos: string[]) => void;
};

export function PhotoStep({ photos, onChange }: Props) {
  const addFromLibrary = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Photo access needed', 'Allow photo library access in Settings to add recipe photos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsMultipleSelection: true,
      selectionLimit: MAX_PHOTOS - photos.length,
    });
    if (!result.canceled) {
      onChange([...photos, ...result.assets.map((a) => a.uri)].slice(0, MAX_PHOTOS));
    }
  };

  const addFromCamera = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Camera access needed', 'Allow camera access in Settings to take a recipe photo.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (!result.canceled) {
      onChange([...photos, ...result.assets.map((a) => a.uri)].slice(0, MAX_PHOTOS));
    }
  };

  const removePhoto = (uri: string) => onChange(photos.filter((p) => p !== uri));

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={typography.title}>Add a photo</Text>
      <Text style={[typography.body, styles.helper]}>
        A simple phone photo is perfect — one photo is required, up to {MAX_PHOTOS} total.
      </Text>

      <View style={styles.grid}>
        {photos.map((uri) => (
          <View key={uri} style={styles.photoWrapper}>
            <Image source={{ uri }} style={styles.photo} />
            <Pressable
              onPress={() => removePhoto(uri)}
              style={styles.removeButton}
              accessibilityRole="button"
              accessibilityLabel="Remove photo"
            >
              <Ionicons name="close" size={16} color={colors.white} />
            </Pressable>
          </View>
        ))}
      </View>

      {photos.length < MAX_PHOTOS ? (
        <View style={styles.buttonStack}>
          <PrimaryButton label="Take a Photo" icon="camera-outline" onPress={addFromCamera} />
          <View style={{ height: spacing.sm }} />
          <PrimaryButton label="Choose from Library" icon="images-outline" variant="outline" onPress={addFromLibrary} />
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.md },
  helper: { color: colors.textMuted, marginTop: spacing.xs, marginBottom: spacing.lg },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  photoWrapper: { width: 100, height: 100 },
  photo: { width: '100%', height: '100%', borderRadius: radius.md, backgroundColor: colors.border },
  removeButton: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: colors.danger,
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonStack: { marginTop: spacing.sm },
});
