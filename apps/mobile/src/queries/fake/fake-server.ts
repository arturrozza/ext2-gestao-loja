/**
 * FAKE BACKEND (MUN-21). Stands in for the API until each feature task (MUN-20) swaps a module's `*.fake.ts` calls for
 * the real `api` (Eden) ones. Hooks keep the same shape, so screens don't change.
 *
 * Every fake call goes through `fakeRequest`: it waits like a network round trip, can simulate the API being down
 * (to preview error states), and returns a JSON copy so screens can never mutate the fake database by accident.
 */
import { ApiError } from "@/lib/api-error";
import { bootFakeDb } from "./fake-boot";
import { db } from "./fake-db";
import { syncFakeSettings } from "./fake-settings";

const LATENCY_MS = 350;

/** Demo switches, shown in the store screen while the app runs on fake data. */
export const fakeControls = {
	/** Every request fails as if the API were unreachable. */
	offline: false,
	/** Every request hangs until it's turned off, to look at the loading states. */
	loading: false,
};

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function fakeRequest<T>(handler: () => T): Promise<T> {
	bootFakeDb();
	await syncFakeSettings();
	await wait(LATENCY_MS);
	while (fakeControls.loading) await wait(LATENCY_MS);
	if (fakeControls.offline) {
		throw new ApiError(
			"network",
			"Não foi possível falar com o servidor. Confira a internet e tente de novo.",
		);
	}
	// All or nothing (docs/product/README.md): a request that fails halfway leaves the data as it was.
	const snapshot = JSON.stringify(db.current);
	let result: T;
	try {
		result = handler();
	} catch (error) {
		db.current = JSON.parse(snapshot);
		throw error;
	}
	return result === undefined
		? result
		: (JSON.parse(JSON.stringify(result)) as T);
}

export function notFound(what: string): never {
	throw new ApiError("not_found", `${what} não encontrado.`);
}
