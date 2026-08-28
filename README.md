# PassDown

> "An easy, warm place to share the recipes we cook for the people we love — and find new favorites from other home cooks."

A mobile-first recipe-sharing app for everyday home cooks (not influencers or food bloggers), built from the PassDown App Design & Product Brief.

## Status

This is the **MVP** — every screen from the brief's MVP scope is built and navigable, backed by a real Supabase project: real accounts, and real recipes/comments/likes/saves/follows/collections/shopping-list shared across every user and device, enforced by row-level security so people can only edit their own data. See [Next Steps](#next-steps) below for what's still deliberately out of scope.

## Tech stack

| Concern | Choice | Why |
|---|---|---|
| App framework | [Expo](https://expo.dev) (React Native + TypeScript) | Brief calls for real iOS/Android apps (section 15); Expo gives one codebase, fast iteration, and a clear path to native builds via EAS. |
| Navigation | React Navigation (bottom tabs + native stack) | Matches the brief's 5-tab IA (section 7) with a modal posting flow and pushed detail/cook-mode screens. |
| Backend | [Supabase](https://supabase.com) | Postgres + Auth + Storage in one place, with almost no server code to run ourselves. Auth handles accounts/sessions; Postgres (with row-level security) holds recipes, comments, likes, saves, follows, collections, and the shopping list; Storage holds recipe/step photos. |
| Data access | React Context (`useAppState()`) over a small `src/lib/api/` layer | Every screen reads/writes through one hook; the Supabase queries live in one place so the query layer can change without touching screens. |
| Images | `expo-image-picker` + Supabase Storage | Camera + photo library picking, uploaded to a public `recipe-photos` bucket so photos are visible to every user, not just the device that took them. |
| Cook Mode | `expo-keep-awake` | Keeps the screen from sleeping while cooking, per section 4.8. |

## What's implemented (MVP, brief section 4)

- **Home feed** — scrolling recipe cards with photo, author, time/servings, like + save.
- **Recipe detail** — swipeable hero photos, checkable ingredients, numbered steps, Start Cook Mode, Add to Shopping List, save/like/share, author strip with follow, comments + "I made this!" posts. The author can delete the recipe from here; a private recipe shows a lock badge.
- **Search & discover** — a Recipes/People toggle: recipe search (text across title/ingredients/tags, meal-type filter chips, browse-by-category grid), or a People search (by name/username, plus a "Suggested for you" list of accounts you don't already follow) with a follow button on every result.
- **Recipe Box** — saved recipes organized into named collections.
- **Shopping list** — checkable, combines duplicate ingredients across recipes automatically.
- **Cook Mode** — full-screen, large-text, one step at a time, keeps screen awake, per-step timer when a step has a duration.
- **Post a recipe** — the 6-step flow from the brief (Photo → Title/Story → Ingredients → Steps → Details → Review), with a visible "Step X of 6" progress bar, Save-as-Draft support, and a Public/Private choice on the Details step (private = only your followers can see it).
- **Profile** — own and other users' profiles, recipe grid, follow button, and tappable follower/following counts that open a list of who they are (with a follow button on each).
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
  lib/          supabase.ts (client), database.types.ts (generated), api/ (recipes, social, collections, shoppingList, photos)
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

Every account also gets a **unique username** (separate from the display name) — the sign-up form checks availability as you type, and a unique index in Postgres (`profiles_username_unique_idx`, case-insensitive) is the actual enforcement, so a race between two people signing up with the same username at the same instant still can't succeed. **One account per email** and **email confirmation before login** are both Supabase Auth's own default behavior, not something this app's code enforces — double-check under your project's **Authentication → Sign In / Providers → Email** settings that "Confirm email" is on and duplicate emails aren't explicitly allowed, if you ever want to verify those defaults haven't been changed.

**Forgot password** — "Forgot password?" on the Log In screen sends a reset link via `supabase.auth.resetPasswordForEmail()`. The link redirects back to the web app's own origin (or `https://passdown.it.com` when sent from a context with no browser origin, e.g. the native app) with the recovery token in the URL fragment; the web build picks it up automatically (`detectSessionInUrl: true`, a no-op on native) and routes straight to a "Set a new password" screen instead of the normal signed-in app. There's no deep-linking set up for opening the native app directly from that email link yet — tapping it on a phone opens the reset flow in the browser, same as the email-confirmation link already does.

Supabase's own project email sending (used for confirmation and password-reset emails) runs on a shared test SMTP service with a very low rate limit (a few emails/hour) — fine for development, not for real users. Connect a real SMTP provider under **Project Settings → Authentication → SMTP Settings** before expecting more than a couple of signups/resets a day.

## Running it

```bash
npm install
npm run ios      # or: npm run android / npm run web
```

Requires the Expo Go app on a phone, or an iOS/Android simulator, to actually see it running.

## Web preview

PassDown is a phone app at heart, but it also runs in a browser via `react-native-web` — useful for a quick look without installing anything. A GitHub Actions workflow (`.github/workflows/deploy-web.yml`) rebuilds and republishes it to GitHub Pages on every push, live at:

```
https://passdown.it.com
```

(the old `https://blachtb627-a11y.github.io/PassDown/` URL now redirects there). A few phone-only bits (camera capture, keep-screen-awake in Cook Mode) fall back to browser equivalents or no-ops on web — the mobile app is the real target.

**Custom domain setup**, for reference (already done for `passdown.it.com`):

1. At the domain's DNS provider, point it at GitHub Pages — for an apex/root domain like this one, four `A` records at the root (`@`) to `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, and `185.199.111.153`. (A `www` subdomain instead would use a `CNAME` to `blachtb627-a11y.github.io`.)
2. In this repo's **Settings → Pages**, set **Custom domain** to `passdown.it.com` and save — GitHub verifies DNS and provisions HTTPS automatically (can take a few minutes up to a couple hours). Once verified, check **Enforce HTTPS**.
3. The deploy workflow writes a `CNAME` file into the build output on every run so this setting survives future Actions-based deploys.

## Data model

Applied to the Supabase project via migrations. The initial schema was applied directly and isn't checked in as SQL yet (see Next Steps); `supabase/migrations/` holds changes made since, starting with the username addition below.

- `profiles` — one row per account, auto-created (with two starter collections) by a trigger on signup. `username` is required and unique (case-insensitive); `full_name` is a separate, non-unique display name.
- `recipes` — ingredients/steps stored as JSONB (matches the app's nested shape exactly); `like_count`/`comment_count` kept in sync by triggers. `is_private` controls visibility: public recipes are visible to everyone, private ones only to the author and their followers — enforced by the table's row-level security policy itself (`supabase/migrations/..._add_recipe_privacy_and_delete.sql`), not by client-side filtering, so a private recipe is never even returned by the API to someone who isn't allowed to see it. The same migration lets an author delete their own recipe (cascading to its comments/likes/saves/etc.).
- `comments`, `made_this_posts`, `likes`, `saves`, `follows`, `collections`, `collection_recipes`, `shopping_list_items`.

Every table has row-level security: published recipes and social data (comments, likes, follows) are readable by everyone, but people can only write their own rows; saves, collections, and the shopping list are private per-account.

## Admin portal

A hidden "Admin Portal" entry appears in Settings for admin accounts only, with two tabs:

- **Manage Accounts** — lists every signed-up account (email, name, username, join date, last active, email-verified status), and can delete an account, make another account an admin, or remove admin access from one.
- **Ad Deployment** — a placeholder for now. Ad serving needs real decisions first (an ad network, placement, targeting) — the tab exists so the portal's shape is ready, but there's nothing to configure yet.

There's no separate admin login — admin-ness is a permission on a normal account, not a different auth system. That's deliberate: a second parallel login for the same accounts would be more attack surface to secure without adding real protection.

- **Who's an admin** lives in its own `public.admins` table (`supabase/migrations/..._add_admins_table.sql`), never a column on `profiles` — so there is no path for a user to grant themselves admin by updating their own profile. The *first* admin has to be granted by hand, directly in Supabase's SQL Editor:
  ```sql
  insert into public.admins (user_id) values ('<user-uuid-here>');
  ```
  After that, existing admins can promote or demote other accounts right from the Manage Accounts tab.
- **Listing every account's email and last-sign-in time, deleting accounts, and granting/revoking admin** all require Supabase's service-role key — which must never ship inside the app bundle. So this work happens in a Supabase Edge Function (`supabase/functions/admin-api/`), which itself checks the caller against the `admins` table (using the caller's own session, respecting RLS) *before* touching the service-role client. The app's `isCurrentUserAdmin()` check (`src/lib/api/admin.ts`) only gates the UI — the Edge Function is the real enforcement boundary. An admin can't delete their own account or remove their own admin access from the portal, to avoid an accidental lockout.
- Deleting a user cascades (via each table's `on delete cascade` foreign key) to their profile, recipes, comments, likes, saves, follows, and collections automatically.

## Next steps

The brief's remaining [open questions](#) (private/family sharing, remix attribution, feed algorithm balance, and voice control in Cook Mode) are still open — worth resolving before the following:

1. **Check the initial schema into the repo too** — everything through the social/collections tables was applied straight to the live project before `supabase/migrations/` existed; worth backfilling as a migration file so the full schema history is reproducible from git, not just changes made since.
2. **Onboarding carousel** — the brief's 3-screen skippable welcome + guided first-post walkthrough (section 8.3) isn't built; today sign-up goes straight from Welcome to the app.
3. **"I made this!" posting UI** — the data model and detail-screen display exist, but there's no button yet for a viewer to actually submit their own attempt photo.
4. **Push notifications** — the notification types exist in Settings as toggles but don't fire real notifications yet.
5. **Direct messaging** — planned next: 1:1 messages between users, separate from comments/follows. Needs its own database table + security rules, a conversation list, and a chat screen.
6. **Phase 2 features** (brief section 5) — video steps, voice-guided Cook Mode, family/private groups, ratings, meal planning, unit conversion, PDF export — intentionally out of scope for this MVP pass.
