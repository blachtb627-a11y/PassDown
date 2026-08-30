import { useEffect, useRef, useState } from 'react';
import { Linking } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useAppState } from '../context/AppStateContext';
import { fetchCircle, joinCircle } from '../lib/api/circles';
import { getErrorMessage, notify } from '../lib/alert';
import { navigationRef } from './navigationRef';

type PendingDeepLink = { type: 'recipe'; recipeId: string } | { type: 'circleJoin'; circleId: string };

function parsePendingDeepLink(url: string | null): PendingDeepLink | null {
  if (!url) return null;
  try {
    const { pathname } = new URL(url);
    const recipeMatch = pathname.match(/^\/recipe\/([^/]+)\/?$/);
    if (recipeMatch) return { type: 'recipe', recipeId: decodeURIComponent(recipeMatch[1]) };
    const circleJoinMatch = pathname.match(/^\/circle\/([^/]+)\/join\/?$/);
    if (circleJoinMatch) return { type: 'circleJoin', circleId: decodeURIComponent(circleJoinMatch[1]) };
    return null;
  } catch {
    return null;
  }
}

// A shared link — a recipe ("https://passdown.it.com/recipe/<id>") or a
// circle invite ("https://passdown.it.com/circle/<id>/join") — should take
// whoever opens it straight to that content, including someone who isn't
// signed in yet, who needs to log in/sign up first. This reads the link's
// target out of the URL the app was opened with once at startup, then waits
// for both a session and the app's own data to be loaded before acting on
// it, retrying briefly since the navigator may not be mounted yet right
// after signing in.
export function DeepLinkHandler() {
  const { session } = useAuth();
  const { isLoaded, currentUser } = useAppState();
  const [pending, setPending] = useState<PendingDeepLink | null>(null);
  const hasHandled = useRef(false);

  useEffect(() => {
    Linking.getInitialURL().then((url) => setPending(parsePendingDeepLink(url)));
  }, []);

  useEffect(() => {
    if (!pending || hasHandled.current || !session || !isLoaded) return;

    const handle = async () => {
      if (pending.type === 'recipe') {
        navigationRef.navigate('RecipeDetail', { recipeId: pending.recipeId });
        return;
      }
      try {
        await joinCircle(pending.circleId, currentUser.id);
      } catch (error) {
        notify('Could not join that circle', getErrorMessage(error, 'The invite link may no longer be valid.'));
        return;
      }
      const circle = await fetchCircle(pending.circleId).catch(() => null);
      navigationRef.navigate('CircleDetail', { circleId: pending.circleId, name: circle?.name ?? 'Circle' });
    };

    const tryRun = () => {
      if (!navigationRef.isReady() || hasHandled.current) return false;
      hasHandled.current = true;
      handle();
      return true;
    };

    if (tryRun()) return;
    const interval = setInterval(() => {
      if (tryRun()) clearInterval(interval);
    }, 100);
    return () => clearInterval(interval);
  }, [pending, session, isLoaded, currentUser.id]);

  return null;
}
