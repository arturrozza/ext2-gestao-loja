/**
 * FAKE BACKEND (MUN-21): fills the fake database with the demo store the first time the app asks for the session
 * (always the first request: every screen but login sits behind it).
 */
import { db } from "./fake-db";
import { seededDb } from "./fake-seed";

let booted = false;

export function bootFakeDb() {
	if (booted) return;
	db.current = seededDb();
	booted = true;
}

/** The demo switches replaced the data: don't seed over it. */
export function markFakeDbBooted() {
	booted = true;
}
