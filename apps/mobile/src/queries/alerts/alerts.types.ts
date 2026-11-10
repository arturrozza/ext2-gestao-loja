/** How many active products are in each alert (alertas.md); each matches a stock filter of the product list. */
export type AlertCounts = {
	lowStock: number;
	outOfStock: number;
	nearExpiry: number;
	expired: number;
};
