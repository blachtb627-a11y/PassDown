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
| Images | `expo-image-picker` + Supabase Storage | Camera + photo library picking, uploaded to a public `recipe-photos` bucket so photos are visible to every user, not just the device that took them. On web, photos are downscaled (capped at 1600px on the long edge, JPEG quality 0.82) client-side via canvas before upload — a phone photo can be 10+ MB at full resolution, which made the feed feel slow since every card was fetching a full-size photo just to show a small thumbnail. |
| Cook Mode | `expo-keep-awake` | Keeps the screen from sleeping while cooking, per section 4.8. |
| AI recipe scan | Claude (`claude-sonnet-5`), called from a Supabase Edge Function | Reads a photo of a handwritten/printed recipe and returns structured title/ingredients/steps via forced tool-use (reliable JSON, no prompt-parsing). Runs server-side since the Anthropic API key can never ship in the app bundle — same reasoning as the admin portal below. |
| AI shopping list merge | Claude (`claude-sonnet-5`), called from a Supabase Edge Function | Decides, for each ingredient being added, whether it's the same grocery item as something already on the list even if worded differently (e.g. "bell pepper" vs "red pepper, diced") and what the combined quantity should be — same forced tool-use approach and same reason it's server-side, see below. |
| AI recipe translation | Claude (`claude-sonnet-5`), called from a Supabase Edge Function | Translates a recipe's title/story/ingredients/steps to English and converts metric units to US customary ones, on demand from a button on Recipe Detail — same forced tool-use approach and same reason it's server-side, see below. |
| Video ads | `expo-video` | Plays a video ad on the Home feed the same way an image ad shows — see Ad system below. |

## What's implemented (MVP, brief section 4)

- **Home feed** — a bold deep-green header banner (logo, "PassDown" wordmark, a Shopping List shortcut, a notification bell with an unread-count badge — see Notifications below), a floating search bar, a **Public / Following** tab switcher, and two compact filter dropdowns — **Cuisine** (every country, with its own search box) and **Meal Type** — replacing what used to be a wrapping row of chip bubbles. Public shows every recipe you can see (the old default feed); Following narrows that down to just the people you follow. Below that, a single-column card feed: each card leads with the poster's name ("passed this down") and how long ago it was posted ("5 min ago", "3 hours ago", "2 days ago" — see Feed ranking below), then the photo with title overlaid, a cuisine badge, diet/occasion/meal-type tags, and like/comment/share/save/circle actions. Tapping the comment icon jumps straight to that recipe's comments and focuses the input.
- **Recipe detail** — swipeable hero photos, checkable ingredients, numbered steps, Start Cook Mode, Add to Shopping List, save/like/share/share-to-circle, author strip with follow, comments + "I made this!" posts. The author can edit or delete the recipe from here; a private recipe shows a lock badge. A **Translate** button in the top-right of the header (see AI recipe translation below) translates the whole recipe to English and converts its units to US customary measurements, with a tap to flip back to the original.
- **Search** — people only: search by name/username, or browse a "Suggested for you" list of accounts you don't already follow, with a follow button on every result. Recipe search/filtering lives on the Home feed instead (see above), rather than being split across two tabs.
- **Recipe Box** — saved recipes organized into named collections.
- **Shopping list** — checkable, combines matching ingredients across recipes automatically (including differently-worded matches, e.g. "1 pepper" + "2 peppers" → "3 pepper", via AI — see below), falling back to an exact-match numeric sum if that call fails.
- **Cook Mode** — full-screen, large-text, one step at a time, keeps screen awake, per-step timer when a step has a duration.
- **Post a recipe** — the 6-step flow from the brief (Photo → Title/Story → Ingredients → Steps → Details → Review), with a visible "Step X of 6" progress bar, Save-as-Draft support, and a Public/Private choice on the Details step (private = only your followers can see it). The Photo step's **"Scan a Recipe Card"** button reads a photo of a handwritten or printed recipe with AI (see below) and fills in title/ingredients/steps for you, jumping straight to Review. The Details step's Cuisine field is the same country picker used to filter Home, so what a recipe can be posted as always matches what it can be filtered by.
- **Profile** — own and other users' profiles, a Your Recipes / Saved tab switcher (own profile only — Saved carries collection filter chips, a "New Collection" button, and per-recipe collection assignment), follow button, and tappable follower/following counts that open a list of who they are (with a follow button on each).
- **Circles** — private named groups (open from the Circles tab) for bringing specific family/friends together — e.g. "Mom's Side" or "Sunday Dinner." A **Members** button in the top-right of a circle's screen opens its roster, where the creator (or anyone, via a shareable **invite link** — see Circle invite links below) adds people, the creator can remove anyone or delete the circle, and anyone else can leave. The circle's main screen is its Shared Recipes row (any member can share one of their saved recipes in, from there or from the recipe's own "Circle" action — this makes the recipe visible to every member regardless of its own public/private setting, since sharing into a trusted circle is a deliberate visibility grant) plus a **group chat** every member can post to and read, live-updating via Supabase Realtime — see Circle group chat below. There's still no invite/accept step — joining, by search or by link, is immediate.
- **Settings** — notification toggles, account, about.

Ease-of-use and accessibility principles from sections 6 & 11 are applied throughout: every icon has a text label, minimum 16pt body text (system font-scaling left on, never disabled), 44×44pt minimum tap targets, high-contrast warm palette, and gentle empty-state copy.

## Visual design (brief section 10)

Colors, type scale, and spacing live in `src/theme/` and follow the brief's starting palette (warm terracotta primary, deep herb green secondary, cream background, charcoal text) — centralized there so a brand refresh only touches one place.

**Dark mode** — a toggle in Settings ("Appearance") switches the whole app between the light palette and a warm dark one (near-black background, brand colors nudged brighter for contrast), persisted across launches via AsyncStorage. `src/theme/ThemeContext.tsx`'s `useTheme()` hook provides the active `colors` and `typography` to every screen; every screen builds its `StyleSheet` from those (memoized on the current theme) instead of importing static color constants, so the switch actually repaints everything — text, backgrounds, borders, the navigation header — rather than just a subset.

**Logo**: a rounded pin badge holding a heart-and-fork mark (`assets/logo.png`) — terracotta ring, cream fill, gold heart, olive fork, matching the palette above exactly (`colors.accentGold`/`colors.accentOlive`). It's the app icon, favicon, Android adaptive/monochrome icon, and appears in-app on the Welcome, Sign Up, and Log In screens and the Home feed header. It was recreated as flat vector shapes (rendered to PNG at build time) from the reference logo image rather than imported as a binary file, since this environment can't save a pasted image straight to disk — regenerate or tweak it by editing the SVG-building script and re-rendering (a headless-browser screenshot of an HTML/SVG page) rather than hand-editing pixels.

## Project structure

```
src/
  theme/        colors, typography, spacing (brief section 10)
  types/        Recipe, Ingredient, Step, Collection, ShoppingListItem, Author...
  data/         countries.ts (the fixed cuisine/country list shared by Home's filter and Post Recipe's Details step)
  lib/          supabase.ts (client), database.types.ts (generated), api/ (recipes, social, collections, shoppingList, photos, circles, circleRecipes, aiRecipeScan, translateRecipe, admin)
  context/      AuthContext (real sessions) + AppStateContext (recipes/collections/etc.)
  navigation/   bottom tabs (with the emphasized center Post button) + root stack, gated on session
  screens/      one file/folder per screen from the brief's screen-by-screen breakdown, plus screens/Auth/
  components/   RecipeCard, PrimaryButton, FilterChip, DropdownButton, SelectModal, ShareToCircleModal, EmptyState
```

```
supabase/functions/
  admin-api/            service-role account management, gated on the admins table (see Admin portal below)
  scan-recipe/          calls the Anthropic API server-side to read a photo of a recipe (see AI recipe scan below)
  merge-shopping-list/  calls the Anthropic API server-side to decide how to combine ingredients on the shopping list (see AI shopping list merge below)
  translate-recipe/     calls the Anthropic API server-side to translate a recipe and convert its units (see AI recipe translation below)
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

## Sharing a recipe

The Share button (on a recipe card or Recipe Detail) shares a real link — `https://passdown.it.com/recipe/<id>` — instead of just text, so whoever gets it (iMessage, texts, anywhere) lands straight on that recipe. Opening the link:

- If they're already signed in, it goes directly to the recipe.
- If not, it takes them to sign up/log in first (same as any other page — there's no public/anonymous browsing), then drops them onto that exact recipe right after, instead of the normal home feed.
- If the recipe is private and they don't have access to it (not the author, not shared to a circle they're in), it shows the normal "couldn't be found" message rather than the recipe — the same row-level security that already protects private recipes everywhere else.

Two pieces make this work (shared with Circle invite links below, which is the other kind of link `DeepLinkHandler` understands):
- `src/navigation/DeepLinkHandler.tsx` reads the `/recipe/<id>` out of the URL the app was opened with, and once both a session and the recipe data are loaded, navigates there via a navigation ref (`src/navigation/navigationRef.ts`) set up in `App.tsx`.
- GitHub Pages has no server-side router, so a hard page load of `/recipe/<id>` (exactly what happens when a link is tapped) would 404 before the app ever boots. `scripts/fix-web-base-path.js` writes a `dist/404.html` that repackages the requested path into a query string and redirects to `/`, and injects a small inline script into `dist/index.html` that unpacks it back into the address bar (via `history.replaceState`) before the app boots — a standard workaround for static hosts with no routing of their own. This is generic to any path, so it covers every link type below too with no extra work.

This is web-only for now, matching the only build that's actually distributed today (see Web preview above) — there's no custom URL scheme set up for a native build to catch these links itself yet.

## Data model

Applied to the Supabase project via migrations. The initial schema was applied directly and isn't checked in as SQL yet (see Next Steps); `supabase/migrations/` holds changes made since, starting with the username addition below.

- `profiles` — one row per account, auto-created (with two starter collections) by a trigger on signup. `username` is required and unique (case-insensitive); `full_name` is a separate, non-unique display name.
- `recipes` — ingredients/steps stored as JSONB (matches the app's nested shape exactly); `like_count`/`comment_count` kept in sync by triggers. `is_private` controls visibility: public recipes are visible to everyone, private ones only to the author and their followers — enforced by the table's row-level security policy itself (`supabase/migrations/..._add_recipe_privacy_and_delete.sql`), not by client-side filtering, so a private recipe is never even returned by the API to someone who isn't allowed to see it. The same migration lets an author delete their own recipe (cascading to its comments/likes/saves/etc.).
- `comments`, `made_this_posts`, `likes`, `saves`, `follows`, `collections`, `collection_recipes`, `shopping_list_items`.
- `circles` / `circle_members` — a circle (and its members, shared recipes, chat) is only visible to its own members. The creator can delete the circle; anyone can add themselves (via an invite link, see Circle invite links below) or be added by the creator (by search), and can remove themselves (`supabase/migrations/..._add_circles.sql`, `..._add_circle_invite_links.sql`, `..._fix_circles_select_leak.sql`).
- `circle_recipes` — join table sharing a recipe into a circle; any member can add one, the adder or the circle's owner can remove it. A recipe shared into a circle gets an *additional* permissive SELECT policy on `recipes` granting visibility to that circle's members, layered on top of (not replacing) the recipe's own public/private/followers rule.
- `circle_messages` — a circle's group chat; any member can post, any member can read the full history (`supabase/migrations/..._add_circle_messages.sql`, see Circle group chat below).

Every table has row-level security: published recipes and social data (comments, likes, follows) are readable by everyone, but people can only write their own rows; saves, collections, and the shopping list are private per-account.

## Admin portal

A hidden "Admin Portal" entry appears in Settings for admin accounts only, with two tabs:

- **Manage Accounts** — lists every signed-up account (email, name, username, join date, last active, email-verified status), and can delete an account, make another account an admin, or remove admin access from one.
- **Ad Deployment** — create and manage ads that run on the Home feed. See Ad system below.

There's no separate admin login — admin-ness is a permission on a normal account, not a different auth system. That's deliberate: a second parallel login for the same accounts would be more attack surface to secure without adding real protection.

- **Who's an admin** lives in its own `public.admins` table (`supabase/migrations/..._add_admins_table.sql`), never a column on `profiles` — so there is no path for a user to grant themselves admin by updating their own profile. The *first* admin has to be granted by hand, directly in Supabase's SQL Editor:
  ```sql
  insert into public.admins (user_id) values ('<user-uuid-here>');
  ```
  After that, existing admins can promote or demote other accounts right from the Manage Accounts tab.
- **Listing every account's email and last-sign-in time, deleting accounts, and granting/revoking admin** all require Supabase's service-role key — which must never ship inside the app bundle. So this work happens in a Supabase Edge Function (`supabase/functions/admin-api/`), which itself checks the caller against the `admins` table (using the caller's own session, respecting RLS) *before* touching the service-role client. The app's `isCurrentUserAdmin()` check (`src/lib/api/admin.ts`) only gates the UI — the Edge Function is the real enforcement boundary. An admin can't delete their own account or remove their own admin access from the portal, to avoid an accidental lockout.
- Deleting a user cascades (via each table's `on delete cascade` foreign key) to their profile, recipes, comments, likes, saves, follows, and collections automatically.

## AI recipe scan

The Post Recipe flow's **"Scan a Recipe Card"** button (Photo step) reads a photo of a handwritten or printed recipe and fills in the title, ingredients, and steps automatically, jumping straight to Review so the poster can check and fix up anything it misread.

Same reasoning as the admin portal above: reading the photo needs an Anthropic API key, which must never ship inside the app bundle, so it happens in a Supabase Edge Function (`supabase/functions/scan-recipe/`) instead of on-device. The function checks the caller is signed in (any account, no special permission needed), then calls Claude (`claude-sonnet-5`) with the photo and a forced tool-use call (`extract_recipe`) so the response is always structured JSON rather than prose Claude's response needs to be parsed out of.

To enable it:

1. Get an API key from the [Anthropic Console](https://console.anthropic.com/).
2. Deploy the function and set the key as a function secret:
   ```bash
   npx supabase functions deploy scan-recipe --project-ref <your-project-ref>
   npx supabase secrets set ANTHROPIC_API_KEY=sk-ant-... --project-ref <your-project-ref>
   ```
   (`SUPABASE_URL` and `SUPABASE_ANON_KEY` are already available to every Edge Function automatically — no need to set those yourself.)

Until the key is set, a scan attempt fails with a normal "Could not read that recipe" error — it doesn't block the rest of Post a Recipe, since typing everything in by hand always still works.

## AI shopping list merge

Adding a recipe's ingredients to the shopping list (`src/lib/api/shoppingList.ts`) sends the new ingredients and the current list to a Supabase Edge Function (`supabase/functions/merge-shopping-list/`), which asks Claude (`claude-sonnet-5`) — again via a forced tool-use call, `merge_shopping_list` — to decide for each new ingredient whether it matches something already on the list (even worded differently, e.g. "bell pepper" vs "red pepper, diced") and what the combined quantity/unit/display name should be (e.g. "1 pepper" + "2 peppers" → "3 pepper"). The client then applies that plan with normal per-user writes, so RLS on `shopping_list_items` still applies — the function only returns a plan, it never touches the database itself.

If that call fails for any reason (key not set, network error, etc.), it falls back to a local exact-match: same item name and unit combine by numerically summing their quantities (handling plain numbers, simple fractions like `1/2`, and mixed numbers like `1 1/2`), while anything non-numeric is joined as readable text instead of silently dropped.

It uses the same Anthropic API key as the recipe scan above, and Edge Function secrets are shared across every function in a project, so no extra setup is needed if `scan-recipe` is already deployed with `ANTHROPIC_API_KEY` set — just deploy the new function itself:
```bash
npx supabase functions deploy merge-shopping-list --project-ref <your-project-ref>
```

## AI recipe translation

Recipe Detail has a **Translate** button in the top-right of the header. Tapping it sends the recipe's title, story, ingredients, and steps to a Supabase Edge Function (`supabase/functions/translate-recipe/`), which asks Claude (`claude-sonnet-5`) — via a forced tool-use call, `translate_recipe` — to translate everything into English and convert any metric or otherwise non-US units (grams, milliliters, Celsius, etc.) into US customary cooking units (cups, tablespoons, ounces, °F), rounded to sensible measurements rather than exact decimals. If the recipe was already in English, only the unit conversion happens, and a brief note says so. Tapping the button again flips back to the original — the translation is only ever shown to the viewer, never written back to the recipe or seen by anyone else, so the original recipe (and other viewers' language/units) is never touched.

Uses the same Anthropic API key as the two Edge Functions above, so — same as `merge-shopping-list` — no new secret is needed if one of those is already deployed:
```bash
npx supabase functions deploy translate-recipe --project-ref <your-project-ref>
```

## Circle group chat

Opening a circle now shows its Shared Recipes row plus a group chat every member can post to and read — a normal name-and-message feed with a text box pinned to the bottom, no bubbles or read receipts. A **Members** button in the top-right of the header (`src/screens/CircleMembersScreen.tsx`) is where the roster, adding people, removing people, and leaving/deleting the circle all live now — that used to be the main content of a circle's screen, moved out to make room for the chat.

New messages appear for every other member without them needing to refresh, via Supabase Realtime (`src/lib/api/circleMessages.ts`'s `subscribeToCircleMessages`, a `postgres_changes` subscription filtered to that circle). Realtime still enforces the table's own row-level security per subscriber, so a member of one circle never receives another circle's messages even though the whole table is broadcast-enabled.

`supabase/migrations/20260830230000_add_circle_messages.sql` creates the `circle_messages` table, its RLS (any member can read, any member can post as themselves — reusing the `is_circle_member()` helper already defined for circles' own RLS), and adds the table to the `supabase_realtime` publication so the live-update part above works with no separate dashboard toggle. Apply it the same way as any other migration: Supabase Dashboard → **SQL Editor** → **New query** → paste the file's contents → **Run**.

## Circle invite links

An **Invite via Link** button on the Members screen (`getCircleInviteUrl()` in `src/lib/shareLink.ts`) shares a real link — `https://passdown.it.com/circle/<id>/join` — so sending it (iMessage, texts, anywhere) is enough to bring someone into the circle, no name search needed. Opening it:

- If they're already signed in, they're added to the circle immediately and land on it.
- If not, they sign up/log in first, then get added and land on the circle right after — same pattern as a shared recipe link (see Sharing a recipe above), handled by the same `DeepLinkHandler`.
- Opening it again (or already being a member) is a no-op, not an error.

The circle's own UUID *is* the invite secret — knowing the link is what grants access, the same way a Google Doc or Slack invite link works, rather than a separate one-time invite code. `supabase/migrations/20260830240000_add_circle_invite_links.sql` adds the policy that makes this possible: a user can add *themselves* to a circle's membership, alongside the existing "owner adds anyone by search" policy. Apply it the same way as any other migration: Supabase Dashboard → **SQL Editor** → **New query** → paste the file's contents → **Run**.

That migration originally *also* widened circles' own SELECT policy to let any signed-in user look up any circle's name, reasoning (wrongly) that resolving a link needed it before the visitor had joined. It didn't: `DeepLinkHandler` inserts the join first and only fetches the circle's name after, by which point the visitor already is a member — so the original member-only SELECT policy covers it. That widened policy made every "my circles" list in the app (Circles tab, the Share-to-Circle picker) briefly show every circle from every account instead of just the caller's own, since those all rely on RLS to scope "my circles" rather than filtering explicitly. `supabase/migrations/20260831180000_fix_circles_select_leak.sql` restores the member-only policy — apply it too, the same way, and apply it *after* the invite-links migration above.

## Ad system

The Admin Portal's **Ad Deployment** tab is where an admin creates and manages ads:

- Pick a photo or video from the device's library, give it a company name and an optional link (opens when tapped), set how many days it should run, and optionally cap it at a number of Home-feed views.
- A stats strip above the form totals **Total ads**, **Running now**, **Total views**, and **Total clicks** (with an overall click-through rate once there's at least one view) across every ad the admin has ever created.
- Every ad the admin has ever created is listed below the form, each showing **Running** / **Paused** / **Ended**, its current view count, days remaining, click count, and per-ad CTR, with a **Pause**/**Resume** toggle and a **Delete** button.

On the Home feed, one currently-running ad (if any) shows as a card right under the Cuisine/Meal Type filters — a photo or an autoplaying muted looping video (`expo-video`), labeled "Sponsored," tapping through to its link if it has one. One ad is picked (at random among everything currently eligible, so several running ads share views roughly evenly) each time the feed loads, and that counts as one view toward its cap. Tapping through to the link counts as one click. An ad stops showing on its own once it's paused, past its end date, or (if it has one) past its view cap — no code change needed, that's enforced by the `ads` table's own row-level security, the same way a private recipe is invisible to someone who isn't allowed to see it.

Recording a view or a click each needed their own narrow door: a regular user has no general permission to update the `ads` table (only an admin does), so `record_ad_view()` and `record_ad_click()` are database functions that can each only ever add exactly 1 to one specific ad's view count or click count — nothing else about the table is exposed to them, unlike a broad "any signed-in user can update ads" policy would allow.

`supabase/migrations/20260831190000_add_ads.sql` creates the `ads` table and its RLS (admins can do everything; everyone else can only see an ad that's currently eligible to run), the `record_ad_view()` function, and a new `ad-media` Storage bucket (public read since ads need to be visible to everyone; admin-only upload/delete). `supabase/migrations/20260831200000_add_ad_clicks.sql` adds the `click_count` column and `record_ad_click()` function for the click/CTR stats above. Apply both the same way as any other migration, in order: Supabase Dashboard → **SQL Editor** → **New query** → paste the file's contents → **Run**. No Edge Function or extra secret is involved.

## Notifications

The bell icon on the Home feed banner opens a **Notifications** screen and carries an unread-count badge. A notification is created for someone when another user follows them, likes their recipe, comments on their recipe, or posts "I made this!" on their recipe — self-notifications are skipped (liking your own recipe doesn't notify you). Tapping a notification opens the follower's profile or the relevant recipe (jumping straight to comments for a comment notification), and opening the list at all clears the unread badge, the same way most apps treat "seen" — you don't have to tap each one individually.

These are in-app only, not OS push notifications (see Next steps below for that) — the badge and list update live while the app is open, via Supabase Realtime, the same mechanism the Circle group chat uses.

Rather than trust the client to insert "so-and-so liked your recipe" rows directly — which would let any signed-in user forge a notification claiming to be anyone — a notification is only ever created by a database trigger reacting to the real event (a row landing in `follows`, `likes`, `comments`, or `made_this_posts`), computed and inserted server-side. `supabase/migrations/20260901000000_add_notifications.sql` creates the `notifications` table, its RLS (everyone can only see and mark-read their own; nothing can insert into it directly, only the triggers), the four trigger functions, and adds the table to Realtime. Apply it the same way as any other migration: Supabase Dashboard → **SQL Editor** → **New query** → paste the file's contents → **Run**.

## Feed ranking

The Home feed isn't strict newest-first anymore — it's a Reddit-style "hot" ranking that blends popularity with recency, so a recipe that's getting real engagement can surface above something posted a few minutes later, but nothing stale camps at the top forever. Every recipe card also shows how long ago it was posted (top-right of the author row: "5 min ago", "3 hours ago", "2 days ago", ...) so the ordering isn't a mystery.

The score for each recipe is `log10(popularity + 1) - ageInHours / 48`, where popularity is a weighted count of likes (×1), comments (×2), and "I made this!" posts (×3) — comments and made-this posts count for more since they take real effort and are harder to fake than a like. Using the *log* of popularity (rather than dividing by age, the way Hacker News does it) matters for a recipe app specifically: it keeps one viral recipe from permanently burying everything else, since going from 10 likes to 100 counts for as much as going from 100 to 1,000. The `/ 48` means a recipe needs roughly 10× the popularity to outrank something posted 2 days (48 hours) earlier — generous enough that a genuinely good recipe stays visible for days, but not so generous that the feed ever stops feeling current. This runs entirely client-side in `src/lib/feedRanking.ts` over whatever recipes are already loaded — no migration or schema change needed.

## Next steps

The brief's remaining [open questions](#) (private/family sharing, remix attribution, feed algorithm balance, and voice control in Cook Mode) are still open — worth resolving before the following:

1. **Check the initial schema into the repo too** — everything through the social/collections tables was applied straight to the live project before `supabase/migrations/` existed; worth backfilling as a migration file so the full schema history is reproducible from git, not just changes made since.
2. **Onboarding carousel** — the brief's 3-screen skippable welcome + guided first-post walkthrough (section 8.3) isn't built; today sign-up goes straight from Welcome to the app.
3. **"I made this!" posting UI** — the data model and detail-screen display exist, but there's no button yet for a viewer to actually submit their own attempt photo.
4. **Push notifications** — the notification types exist in Settings as toggles but don't fire real notifications yet.
5. **Direct messaging** — planned next: 1:1 messages between users, separate from comments/follows. Needs its own database table + security rules, a conversation list, and a chat screen.
6. **Phase 2 features** (brief section 5) — video steps, voice-guided Cook Mode, family/private groups, ratings, meal planning, unit conversion, PDF export — intentionally out of scope for this MVP pass.
