/** Postgres keeps `numeric(5,2)` as "12.50"; the API answers "12.5", like the app sends it. */
export function percentOut(stored: string): string {
	return String(Number(stored));
}
