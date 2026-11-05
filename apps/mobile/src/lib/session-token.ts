import * as SecureStore from "expo-secure-store";

const KEY = "session-token";

/** In memory too, so every request reads it without touching the keychain. `undefined`: not loaded yet. */
let cached: string | null | undefined;

/** Keychain writes run one after the other, so a late delete from a sign-out can't erase the next sign-in's token. */
let writes: Promise<unknown> = Promise.resolve();

function enqueue(write: () => Promise<void>): Promise<void> {
	const run = writes.then(write);
	writes = run.catch(() => undefined);
	return run;
}

/** The bearer token from sign-in, kept in the device's keychain/keystore (never in plain storage). */
export const sessionToken = {
	async load(): Promise<string | null> {
		if (cached === undefined) {
			await writes;
			cached = await SecureStore.getItemAsync(KEY);
		}
		return cached;
	},
	current(): string | null {
		return cached ?? null;
	},
	save(token: string): Promise<void> {
		cached = token;
		return enqueue(() => SecureStore.setItemAsync(KEY, token));
	},
	clear(): Promise<void> {
		cached = null;
		return enqueue(() => SecureStore.deleteItemAsync(KEY));
	},
};
