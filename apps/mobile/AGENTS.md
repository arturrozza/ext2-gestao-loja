# AGENTS.md — mobile (`@ext2/mobile`)

Expo app (SDK 58) + Expo Router + NativeWind 4 + TanStack Query 5 + Zod. Read the [root `AGENTS.md`](../../AGENTS.md) too.
Prioritize mobile-first patterns, performance and cross-platform compatibility.

## Expo has changed: don't trust your memory

Expo ships breaking changes every SDK. Before writing code that touches Expo, EAS or React Native APIs:

1. Check the major version of `expo` in `package.json` (currently **58**).
2. Read the versioned docs: `https://docs.expo.dev/versions/v58.0.0/`
3. For anything else, use https://docs.expo.dev/llms.txt (index with corrections to common LLM misconceptions) and
   follow it to the specific page. Never answer from memory.

Other official docs:
- NativeWind v4: https://www.nativewind.dev/docs (v4 uses **Tailwind 3**; don't use Tailwind 4 syntax or v5 docs)
- TanStack Query (React Native): https://tanstack.com/query/latest/docs/framework/react/react-native
- Eden Treaty: https://elysiajs.com/eden/overview.html

## Commands (from `apps/mobile`)

```bash
bunx expo install <pkg>      # ALWAYS use this to add deps (resolves the SDK-compatible version)
bunx expo install --check    # check for incompatible versions (--fix fixes them)
bun run start                # dev server (or `bun run dev:mobile` at the root)
bun run typecheck
bun run doctor               # expo-doctor: must pass with no issues
```

`start`/`android`/`ios`/`web`/`export` run Expo through `bun --env-file=../../.env`, so the root `.env` is used.
Don't create a `.env` inside this app.

Lint/format is the root Biome (`bun run check`). Don't use `expo lint`/ESLint.
`bunx expo install -- -D <pkg>` sometimes resolves the wrong SDK version for dev deps (it happened with
`babel-preset-expo`): double-check `package.json` and run `bunx expo install --check` afterwards.

## Structure

```
src/
  app/                         Expo Router routes: thin files that only re-export a screen (+ _layout.tsx)
  screens/<screen>/
    <screen>.screen.tsx        the screen component (`<Screen>Screen`), e.g. screens/home/home.screen.tsx
    partials/                  components used ONLY by this screen
  components/                  components shared by more than one screen (ui/: design system base components)
  queries/<module>/            TanStack Query hooks + query keys per API module (mirrors server modules)
  lib/                         api (Eden), query-client, env, fonts, theme and utilities (cn)
  providers/                   global providers (QueryClient, SafeArea...)
  global.css                   Tailwind directives + design tokens (imported in the root _layout)
```

Alias: `@/*` → `src/*`.

## Rules

### Navigation
- Use **Expo Router** for everything. Files in `src/app/` are routes; `_layout.tsx` files define navigators.
- Route files contain no UI: they import the screen and default-export it (the one place default exports are allowed):

  ```tsx
  // src/app/index.tsx
  import { HomeScreen } from "@/screens/home/home.screen";

  export default HomeScreen;
  ```

- Each screen lives in `src/screens/<screen>/<screen>.screen.tsx`. Components that belong only to that screen go in
  its `partials/` folder. A partial needed by a second screen moves to `src/components/`.
- Screens/partials import data hooks from `src/queries/`, never call `api` directly.
- Import `Link`, `router` and `useLocalSearchParams` from `expo-router`.

### Styling (NativeWind)
- Style with `className`. Use `StyleSheet`/`style` only when NativeWind can't do it (e.g. animated values).
- Design system rules (tokens, surfaces, radius, header, navbar, animations, forms) live in `docs/conventions.md`
  (Mobile: design system). Read it before building UI. In short (the home screen is the model): light-gray page
  (`tone="muted"`) with white borderless cards, orange `bg-primary` only for actions and details, **never black or
  solid-orange cards**, **no shadows**, cards `rounded-2xl` and controls `rounded-full` (no `rounded-3xl`), loose icons
  with no tile in a soft gray (`text-foreground/50`), no default navigator header (`ScreenHeader` or `compactTitle`),
  timing-based Reanimated animations, never `className` on `Animated.View`.
- Screens use `ScreenLayout` (header + content + hairline under the header on scroll + bottom gradient behind the tab
  bar; `compactTitle` adds the iOS-style frosted-glass compact bar, `CompactHeader`, that appears on scroll; no vertical
  scroll indicator). On Android, `expo-blur` only blurs inside a `BlurTargetView` passed as `blurTarget`. Every stack screen, forms included, slides
  in from the right (`ios_from_right` in `_layout.tsx`). No fade screen transitions and no fade-in of whole screens.
  Bottom sheets slide up with `withTiming` (`Modal animationType="none"`); only the backdrop fades.
- Font: Plus Jakarta Sans (`src/lib/fonts.ts`). Each weight is its own family: `font-sans`, `font-sans-medium`,
  `font-sans-semibold`, `font-sans-bold`; never `font-medium`/`font-bold`.
- Base components: React Native Reusables in `src/components/ui/` (ours to edit). Icons: Phosphor (`phosphor-react-native`) via
  `Icon`, one import per icon path (`import { HouseIcon } from "phosphor-react-native/src/icons/House"`), never the
  barrel (it pulls all 1500 icons into the bundle). Default weight `regular`; `fill` for the active tab. Never lucide.
- Haptics on every tap via `src/lib/haptics.ts` (`hapticTap`, `hapticSelect`, `hapticPress`), never `expo-haptics`
  directly. Inside scroll content use `onPress`, not `onPressIn` (starting a scroll must not buzz).
- Render text with `Text` from `@/components/ui/text`. Merge classes with `cn()` (`@/lib/utils`).
- New folders using `className` must be covered by `content` in `tailwind.config.js` (currently `./src/**/*`).

### Data (TanStack Query + Eden)
- Every API call goes through the `api` client (`src/lib/api.ts`), typed with the server's `type App`. No raw `fetch`.
- Server state lives **only** in TanStack Query. Don't copy API data into `useState`/context.
- Each module in `src/queries/<module>/` exposes hooks (`useProducts`, `useCreateSale`...) and a query key factory
  (`productsKeys.all`, `productsKeys.detail(id)`), like `src/queries/health/use-health.ts`.
- In `queryFn`, destructure `{ data, error }` from Eden and `throw error` so Query treats it as an error.
- After mutations, invalidate the affected keys.
- `onlineManager` (expo-network) and `focusManager` (AppState) are already wired in `src/lib/query-client.ts`.

### Validation
- Forms and user input: Zod. Env: `src/lib/env.ts`.
- API responses are already typed by Eden; don't re-validate them with Zod without a reason.

### Env
- Only `EXPO_PUBLIC_*` variables, read **with dot notation** (`process.env.EXPO_PUBLIC_X`) and registered in
  `src/lib/env.ts` and the root `.env.example`. They're visible in the compiled app: **never put secrets there**.
- On a physical device, `EXPO_PUBLIC_API_URL` must be the machine's LAN IP (not `localhost`).
- EAS cloud builds don't read the root `.env`: use EAS environment variables there.

### Native / EAS
- `ios/` and `android/` are generated (Continuous Native Generation): never create or edit them by hand. Configure
  native behavior through `app.json` and config plugins.
- Expo Go only ships its own native modules. Libraries with native code need a development build
  (`bunx expo run:android|ios` or `bunx eas-cli build --profile development`).
- Prefer Expo modules over third-party libraries.
- EAS CLI: `bunx eas-cli <command>`. Docs: https://docs.expo.dev/eas/index.md
