# PassDown

> "An easy, warm place to share the recipes we cook for the people we love — and find new favorites from other home cooks."

A mobile-first recipe-sharing app for everyday home cooks (not influencers or food bloggers), built from the PassDown App Design & Product Brief.

## Status

This is the **MVP scaffold** — every screen from the brief's MVP scope is built and navigable. Accounts are real (Supabase Auth: sign up, log in, log out, sessions persist across restarts). Recipe data itself is still local to the device (`AsyncStorage`) — posting, saving, following, liking, and shopping-list actions all work and persist across app restarts, but recipes don't yet sync across devices or between different users' accounts. See [Next Steps](#next-steps) below.

## Tech stack

| Concern | Choice | Why |
|---|---|---|
| App framework | [Expo](https://expo.dev) (React Native + TypeScript) | Brief calls for real iOS/Android apps (section 15); Expo gives one codebase, fast iteration, and a clear path to native builds via EAS. |
| Navigation | React Navigation (bottom tabs + native stack) | Matches the brief's 5-tab IA (section 7) with a modal posting flow and pushed detail/cook-mode screens. |
| Auth | [Supabase Auth](https://supabase.com) | Real email/password accounts with almost no backend code to run ourselves; session persistence handled by `supabase-js` + `AsyncStorage`. |
| Data (for now) | React Context + `AsyncStorage` | Recipe data has no backend yet; this keeps the app fully functional and persistent locally while keeping all data access behind one `useAppState()` hook, so moving recipes to Supabase later (or any backend) means changing one file, not every screen. |
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
  data/         category tiles for Search/Discover browsing
  lib/          supabase.ts — the Supabase client
  context/      AuthContext (real sessions) + AppStateContext (recipes/collections/etc.)
  navigation/   bottom tabs (with the emphasized center Post button) + root stack, gated on session
  screens/      one file/folder per screen from the brief's screen-by-screen breakdown, plus screens/Auth/
  components/   RecipeCard, PrimaryButton, FilterChip, CategoryTile, EmptyState
```

## Authentication setup

Sign-up/log-in/log-out is real, backed by [Supabase](https://supabase.com)'s free tier. To connect it:

1. Create a free project at [supabase.com](https://supabase.com) (takes ~2 minutes to provision).
2. In that project, go to **Settings → API** and copy the **Project URL** and the **anon public** key.
3. Locally: copy `.env.example` to `.env` and paste those two values in.
4. For the hosted web preview: in this GitHub repo, go to **Settings → Secrets and variables → Actions** and add two repository secrets with those same values, named `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` — the deploy workflow picks them up automatically on the next push.

Email/password is the sign-up method (simplest for the least tech-savvy users per the brief's open question in section 18, and needs no extra provider setup). Supabase's Email provider is on by default and requires confirming a link sent to your inbox before you can log in — there's a "Check your email" screen after signing up for exactly that reason. Until the two env vars above are set (locally or in CI), the app shows an "Almost ready" screen instead of crashing.

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

The brief's remaining [open questions](#) (private/family sharing, remix attribution, feed algorithm balance, and voice control in Cook Mode) are still open — worth resolving before the following:

1. **Move recipe data to Supabase too** — accounts are real now, but recipes/collections/shopping-list/likes still live in local `AsyncStorage`, so they don't sync across devices or between users. Same database as auth, so this is schema + swapping `AppStateContext`'s storage calls for Supabase queries, not a new backend.
2. **Onboarding carousel** — the brief's 3-screen skippable welcome + guided first-post walkthrough (section 8.3) isn't built; today sign-up goes straight from Welcome to the app.
3. **Real image uploads** — photos currently stay as local device URIs; wiring them to Supabase Storage is part of step 1.
4. **Push notifications** — the notification types exist in Settings as toggles but don't fire real notifications yet.
5. **Phase 2 features** (brief section 5) — video steps, voice-guided Cook Mode, family/private groups, ratings, meal planning, unit conversion, PDF export — intentionally out of scope for this MVP pass.
