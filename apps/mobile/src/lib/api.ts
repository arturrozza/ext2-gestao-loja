import { treaty } from "@elysia/eden";
import type { App } from "@ext2/server";
import { env } from "./env";

export const api = treaty<App>(env.EXPO_PUBLIC_API_URL);
