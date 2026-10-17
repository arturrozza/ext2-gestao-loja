# AGENTS.md — mobile (`@ext2/mobile`)

Expo app (SDK 57) + Expo Router + NativeWind 4 + TanStack Query 5 + Zod. Read the [root `AGENTS.md`](../../AGENTS.md) too.
Prioritize mobile-first patterns, performance and cross-platform compatibility.

## Expo has changed: don't trust your memory

Expo ships breaking changes every SDK. Before writing code that touches Expo, EAS or React Native APIs:

1. Check the major version of `expo` in `package.json` (currently **57**).
2. Read the versioned docs: `https://docs.expo.dev/versions/v57.0.0/`
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
  components/                  components shared by more than one screen
  queries/<module>/            TanStack Query hooks + query keys per API module (mirrors server modules)
  lib/                         api (Eden), query-client, env and utilities
  providers/                   global providers (QueryClient, SafeArea...)
  global.css                   Tailwind directives (imported in the root _layout)
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
- Design tokens (colors, fonts, spacing) live in `tailwind.config.js` (`theme.extend`); no ad-hoc colors scattered
  around the code.
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
