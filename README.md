# PassDown

> "An easy, warm place to share the recipes we cook for the people we love — and find new favorites from other home cooks."

A mobile-first recipe-sharing app for everyday home cooks (not influencers or food bloggers), built from the PassDown App Design & Product Brief.

## Status

This is the **MVP scaffold** — every screen from the brief's MVP scope is built and navigable, backed by realistic mock data and local device storage. There is no backend yet: posting, saving, following, liking, and shopping-list actions all work and persist across app restarts (via `AsyncStorage`), but nothing syncs across devices or accounts yet. See [Next Steps](#next-steps) below.

## Tech stack

| Concern | Choice | Why |
|---|---|---|
| App framework | [Expo](https://expo.dev) (React Native + TypeScript) | Brief calls for real iOS/Android apps (section 15); Expo gives one codebase, fast iteration, and a clear path to native builds via EAS. |
| Navigation | React Navigation (bottom tabs + native stack) | Matches the brief's 5-tab IA (section 7) with a modal posting flow and pushed detail/cook-mode screens. |
| State (for now) | React Context + `AsyncStorage` | No backend exists yet; this keeps the app fully functional and persistent locally while keeping all data access behind one `useAppState()` hook, so swapping in a real backend later means changing one file, not every screen. |
| Images | `expo-image-picker` | Camera + photo library picking for recipe/step photos. |
| Cook Mode | `expo-keep-awake` | Keeps the screen from sleeping while cooking, per section 4.8. |

## What's implemented (MVP, brief section 4)

- **Home feed** — scrolling recipe cards with photo, author, time/servings, like + save.
- **Recipe detail** — swipeable hero photos, checkable ingredients, numbered steps, Start Cook Mode, Add to Shopping List, save/like/share, author strip with follow, comments + "I made this!" posts.
- **Search & discover** — text search across title/ingredients/tags, meal-type filter chips, browse-by-category grid.
- **Recipe Box** — saved recipes organized into named collections.
- **Shopping list** — checkable, combines duplicate ingredients across recipes automatically.
- **Cook Mode** — full-screen, large-text, one step at a time, keeps screen awake, per-step timer when a step has a duration.
- **Post a recipe** — the 6-step flow from the brief (Photo → Title/Story → Ingredients → Steps → Details → Review), with a visible "Step X of 6" progress bar, and Save-as-Draft support.
- **Profile** — own and other users' profiles, recipe grid, follower/following counts, follow button.
- **Settings** — notification toggles, account, about.

Ease-of-use and accessibility principles from sections 6 & 11 are applied throughout: every icon has a text label, minimum 16pt body text (system font-scaling left on, never disabled), 44×44pt minimum tap targets, high-contrast warm palette, and gentle empty-state copy.

## Visual design (brief section 10)

Colors, type scale, and spacing live in `src/theme/` and follow the brief's starting palette (warm terracotta primary, deep herb green secondary, cream background, charcoal text) — centralized there so a brand refresh only touches one place.

## Project structure

```
src/
  theme/        colors, typography, spacing (brief section 10)
  types/        Recipe, Ingredient, Step, Collection, ShoppingListItem, Author...
  data/         mock recipes + categories standing in for a real backend
  context/      AppStateContext — the one place all screens read/write app data
  navigation/   bottom tabs (with the emphasized center Post button) + root stack
  screens/      one file/folder per screen from the brief's screen-by-screen breakdown
  components/   RecipeCard, PrimaryButton, FilterChip, CategoryTile, EmptyState
```

## Running it

```bash
npm install
npm run ios      # or: npm run android / npm run web
```

Requires the Expo Go app on a phone, or an iOS/Android simulator, to actually see it running.

## Web preview

PassDown is a phone app at heart, but it also runs in a browser via `react-native-web` — useful for a quick look without installing anything. A GitHub Actions workflow (`.github/workflows/deploy-web.yml`) rebuilds and republishes it to GitHub Pages on every push.

**One-time setup** (repo owner, ~30 seconds): go to this repo's **Settings → Pages**, and under "Build and deployment" set **Source** to **GitHub Actions**. After that, the site is live at:

```
https://blachtb627-a11y.github.io/PassDown/
```

and stays up to date automatically as this branch is pushed. A few phone-only bits (camera capture, keep-screen-awake in Cook Mode) fall back to browser equivalents or no-ops on web — the mobile app is the real target.

## Next steps

The brief's [open questions](#) (private/family sharing, remix attribution, feed algorithm balance, voice control in Cook Mode, and the least-friction sign-up method) are still open — worth resolving before the following:

1. **Backend** — the current mock/local-storage layer was a deliberate choice to make progress without infra decisions or credentials. A managed backend (e.g. Supabase or Firebase) would give real accounts, cross-device sync, image storage/CDN, and cloud backup (brief section 15) with minimal server code to maintain.
2. **Auth & onboarding** — the 3-screen skippable welcome flow and guided first-post walkthrough (brief section 8.3) aren't built yet; they depend on picking a sign-up method (email/phone/social).
3. **Real image uploads** — photos currently stay as local device URIs; wiring them to cloud storage is part of the backend step.
4. **Push notifications** — the notification types exist in Settings as toggles but don't fire real notifications yet.
5. **Phase 2 features** (brief section 5) — video steps, voice-guided Cook Mode, family/private groups, ratings, meal planning, unit conversion, PDF export — intentionally out of scope for this MVP pass.
