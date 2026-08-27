import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { isSupabaseConfigured } from './src/lib/supabase';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { AppStateProvider } from './src/context/AppStateContext';
import { RootNavigator } from './src/navigation/RootNavigator';
import { SupabaseSetupNoticeScreen } from './src/screens/Auth/SupabaseSetupNoticeScreen';
import { colors } from './src/theme/colors';

function AppShell() {
  const { isLoading } = useAuth();

  if (!isSupabaseConfigured) {
    return <SupabaseSetupNoticeScreen />;
  }

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <AppStateProvider>
      <NavigationContainer>
        <RootNavigator />
        <StatusBar style="dark" />
      </NavigationContainer>
    </AppStateProvider>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AppShell />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
});
