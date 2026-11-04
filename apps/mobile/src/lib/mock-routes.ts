import type { Href } from "expo-router";

/** Mock only: placeholder screen for modules that don't have a screen yet. */
export function comingSoonHref(title: string): Href {
	return { pathname: "/mock/coming-soon", params: { title } };
}
