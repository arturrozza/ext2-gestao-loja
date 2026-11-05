/**
 * FAKE BACKEND (MUN-21): demo switches shown in the store screen, to preview a store that just started and the
 * error states. Removed with the rest of the fake data (MUN-20).
 */
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { authKeys } from "@/queries/auth/use-auth";
import { markFakeDbBooted } from "./fake-boot";
import { db, emptyDb } from "./fake-db";
import { seededDb } from "./fake-seed";
import { fakeControls } from "./fake-server";

export type DemoScenario = "in_use" | "starting";

let scenario: DemoScenario = "in_use";

export function useFakeDemo() {
	const queryClient = useQueryClient();
	const [current, setCurrent] = useState(scenario);
	const [offline, setOfflineState] = useState(fakeControls.offline);
	const [loading, setLoadingState] = useState(fakeControls.loading);

	/** Everything but the session is refetched from the new fake data. */
	const refetchAll = () =>
		queryClient.invalidateQueries({
			predicate: (query) => query.queryKey[0] !== authKeys.all[0],
		});

	return {
		scenario: current,
		setScenario(next: DemoScenario) {
			scenario = next;
			markFakeDbBooted();
			db.current = next === "in_use" ? seededDb() : emptyDb();
			setCurrent(next);
			refetchAll();
		},
		offline,
		setOffline(next: boolean) {
			fakeControls.offline = next;
			setOfflineState(next);
			refetchAll();
		},
		loading,
		/**
		 * Requests hang while it's on. Turning it on clears the data, so every screen, open or not, shows its skeleton; turning
		 * it off lets the waiting requests finish.
		 */
		setLoading(next: boolean) {
			fakeControls.loading = next;
			setLoadingState(next);
			if (next) {
				// Reset, not remove: screens already open (the tabs stay mounted) drop their data too and fetch again.
				queryClient.resetQueries({
					predicate: (query) => query.queryKey[0] !== authKeys.all[0],
				});
			}
		},
	};
}
