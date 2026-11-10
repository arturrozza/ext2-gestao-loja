import { useEffect, useState } from "react";
import { ConfirmSheet } from "@/components/confirm-sheet";
import { useRouteSheet } from "@/components/route-sheet";

/**
 * Asks before leaving a form with work in it, whichever way the user goes back. Forms are route sheets: the sheet holds
 * the navigation and asks here first; discarding lets it slide down and leave. Turn `dirty` off while the form submits,
 * or its own navigation after saving would be asked about too.
 */
export function DiscardGuard({
	dirty,
	title,
	description,
}: {
	dirty: boolean;
	title: string;
	description: string;
}) {
	const sheet = useRouteSheet();
	const [proceed, setProceed] = useState<(() => void) | null>(null);
	useEffect(() => {
		if (!dirty) return;
		sheet.setGuard((go) => setProceed(() => go));
		return () => sheet.setGuard(null);
	}, [sheet, dirty]);

	return (
		<ConfirmSheet
			open={proceed !== null}
			onClose={() => setProceed(null)}
			title={title}
			description={description}
			confirmLabel="Descartar"
			onConfirm={() => {
				setProceed(null);
				proceed?.();
			}}
		/>
	);
}
