import { useEffect, useRef, useState } from 'react';
import { Linking } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useAppState } from '../context/AppStateContext';
import { navigationRef } from './navigationRef';

function parseRecipeIdFromUrl(url: string | null): string | null {
  if (!url) return null;
  try {
    const { pathname } = new URL(url);
    const match = pathname.match(/^\/recipe\/([^/]+)\/?$/);
    return match ? decodeURIComponent(match[1]) : null;
  } catch {
    return null;
  }
}

// A shared recipe link (e.g. "https://passdown.it.com/recipe/<id>") should
// drop whoever opens it straight onto that recipe — including someone who
// isn't signed in yet, who needs to log in/sign up first. This reads the
// recipe id out of the URL the app was opened with once at startup, then
// waits for both a session and the recipe data to be loaded before
// navigating, retrying briefly since the navigator may not be mounted yet
// right after signing in.
export function DeepLinkHandler() {
  const { session } = useAuth();
  const { isLoaded } = useAppState();
  const [pendingRecipeId, setPendingRecipeId] = useState<string | null>(null);
  const hasNavigated = useRef(false);

  useEffect(() => {
    Linking.getInitialURL().then((url) => setPendingRecipeId(parseRecipeIdFromUrl(url)));
  }, []);

  useEffect(() => {
    if (!pendingRecipeId || hasNavigated.current || !session || !isLoaded) return;

    const tryNavigate = () => {
      if (!navigationRef.isReady()) return false;
      navigationRef.navigate('RecipeDetail', { recipeId: pendingRecipeId });
      hasNavigated.current = true;
      return true;
    };

    if (tryNavigate()) return;
    const interval = setInterval(() => {
      if (tryNavigate()) clearInterval(interval);
    }, 100);
    return () => clearInterval(interval);
  }, [pendingRecipeId, session, isLoaded]);

  return null;
}
