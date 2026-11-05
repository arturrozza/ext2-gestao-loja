import { usePreventRemove } from "expo-router";
import { useState } from "react";
import { ConfirmSheet } from "@/components/confirm-sheet";

/**
 * Asks before leaving a form with work in it, whichever way the user goes back. Turn `dirty` off while the form submits,
 * or its own navigation after saving would be blocked too.
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
	const [leave, setLeave] = useState<(() => void) | null>(null);
	const [allowed, setAllowed] = useState(false);
	usePreventRemove(dirty && !allowed, ({ repeat }) => setLeave(() => repeat));

	return (
		<ConfirmSheet
			open={leave !== null}
			onClose={() => setLeave(null)}
			title={title}
			description={description}
			confirmLabel="Descartar"
			onConfirm={() => {
				setAllowed(true);
				setLeave(null);
				leave?.();
			}}
		/>
	);
}
