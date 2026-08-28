import { Alert, Platform } from 'react-native';

// React Native Web's Alert.alert() is a complete no-op — it doesn't call
// window.alert, doesn't render anything, and never invokes button
// callbacks. Any code relying on it (a confirm dialog gating a delete, or
// even just a heads-up message) silently does nothing in the browser. These
// helpers give the same call sites a real implementation on both platforms.

export function notify(title: string, message?: string): void {
  if (Platform.OS === 'web') {
    window.alert(message ? `${title}\n\n${message}` : title);
    return;
  }
  Alert.alert(title, message);
}

type ConfirmOptions = {
  title: string;
  message?: string;
  confirmLabel?: string;
  destructive?: boolean;
};

export function confirm({ title, message, confirmLabel = 'OK' }: ConfirmOptions): Promise<boolean> {
  if (Platform.OS === 'web') {
    return Promise.resolve(window.confirm(message ? `${title}\n\n${message}` : title));
  }
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      { text: confirmLabel, style: 'destructive', onPress: () => resolve(true) },
    ]);
  });
}
