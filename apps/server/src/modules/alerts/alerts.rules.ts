import type { AlertsModel } from "./alerts.model";

/** The number on the home's Alerts shortcut: every alert, a product in two of them counting twice. */
export function alertsTotal(counts: AlertsModel["counts"]): number {
	return (
		counts.lowStock + counts.outOfStock + counts.nearExpiry + counts.expired
	);
}
