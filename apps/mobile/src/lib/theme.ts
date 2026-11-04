import { DefaultTheme, type Theme } from "expo-router";

// Mirrors the CSS variables in src/global.css for APIs that don't take classNames (navigation, native props).
export const THEME = {
	background: "hsl(0 0% 100%)",
	foreground: "hsl(0 0% 10%)",
	card: "hsl(0 0% 96%)",
	cardForeground: "hsl(0 0% 10%)",
	popover: "hsl(0 0% 100%)",
	popoverForeground: "hsl(0 0% 10%)",
	primary: "hsl(20.5 90.2% 48.2%)",
	primaryForeground: "hsl(0 0% 100%)",
	secondary: "hsl(0 0% 11%)",
	secondaryForeground: "hsl(0 0% 100%)",
	muted: "hsl(0 0% 92%)",
	mutedForeground: "hsl(0 0% 50%)",
	accent: "hsl(0 0% 92%)",
	accentForeground: "hsl(0 0% 10%)",
	destructive: "hsl(0 72.2% 50.6%)",
	destructiveForeground: "hsl(0 0% 100%)",
	border: "hsl(0 0% 91%)",
	input: "hsl(0 0% 91%)",
	ring: "hsl(20.5 90.2% 48.2%)",
	radius: "1rem",
} as const;

/** Background color with full and zero opacity, for scroll fade gradients (gradients need rgba, not CSS vars). */
export const FADE = {
	solid: "rgba(255, 255, 255, 1)",
	half: "rgba(255, 255, 255, 0.6)",
	clear: "rgba(255, 255, 255, 0)",
} as const;

/** Same fade over the light-gray page (`tone="muted"`, hsl 0 0% 96%). */
export const FADE_MUTED = {
	solid: "rgba(245, 245, 245, 1)",
	half: "rgba(245, 245, 245, 0.6)",
	clear: "rgba(245, 245, 245, 0)",
} as const;

/** Milky white over the blur of the compact header (frosted glass). */
export const GLASS = "rgba(255, 255, 255, 0.45)";

/** Bottom border of the compact glass header: stronger than `DIVIDER` so it reads over the blur. */
export const HEADER_BORDER = "rgba(0, 0, 0, 0.16)";

/**
 * Warm wash over the whole home page (primary #EA580C): stronger at the top, a faint warmth down the page, fading out
 * at the very end so it meets the gray fade behind the tab bar.
 */
export const HOME_GLOW = [
	"rgba(234, 88, 12, 0.12)",
	"rgba(234, 88, 12, 0.04)",
	"rgba(234, 88, 12, 0.02)",
	"rgba(234, 88, 12, 0)",
] as const;

/** Dim layer behind sheets and dialogs (the black token at 40%). */
export const BACKDROP = "rgba(28, 28, 28, 0.4)";

/** Very light hairline under the header when content scrolls beneath it. */
export const DIVIDER = "rgba(0, 0, 0, 0.06)";

export const NAV_THEME: Theme = {
	...DefaultTheme,
	colors: {
		...DefaultTheme.colors,
		background: THEME.background,
		border: THEME.border,
		card: THEME.card,
		notification: THEME.destructive,
		primary: THEME.primary,
		text: THEME.foreground,
	},
};
