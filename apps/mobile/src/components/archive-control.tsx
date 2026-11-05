import type { UseMutationResult } from "@tanstack/react-query";
import { useState } from "react";
import { View } from "react-native";
import { ConfirmSheet } from "@/components/confirm-sheet";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { errorMessage } from "@/lib/errors";

/**
 * Archive or reactivate a record: nothing is deleted (docs/product/README.md). Archived records stay in the history
 * and reports. `noun` is the record with its article ("produto", "revendedora", "cliente").
 */
export function ArchiveControl<T>({
	noun,
	archived,
	archivedText,
	confirmText,
	mutation,
}: {
	noun: string;
	archived: boolean;
	/** Shown while archived. */
	archivedText: string;
	/** What archiving does, in the confirmation. */
	confirmText: string;
	mutation: UseMutationResult<T, Error, boolean>;
}) {
	const [confirming, setConfirming] = useState(false);
	const close = () => {
		mutation.reset();
		setConfirming(false);
	};
	if (archived) {
		return (
			<View className="gap-3 rounded-2xl bg-background p-4">
				<Text className="text-muted-foreground text-sm">{archivedText}</Text>
				{mutation.error ? (
					<Text className="text-destructive text-sm">
						{errorMessage(mutation.error)}
					</Text>
				) : null}
				<Button
					variant="outline"
					onPress={() => mutation.mutate(false)}
					loading={mutation.isPending}
				>
					<Text>Reativar {noun}</Text>
				</Button>
			</View>
		);
	}

	return (
		<>
			<Button variant="ghost" onPress={() => setConfirming(true)}>
				<Text className="text-destructive">Arquivar {noun}</Text>
			</Button>
			<ConfirmSheet
				open={confirming}
				onClose={close}
				title={`Arquivar ${noun}?`}
				description={confirmText}
				confirmLabel="Arquivar"
				pending={mutation.isPending}
				error={mutation.error}
				onConfirm={() => mutation.mutate(true, { onSuccess: close })}
			/>
		</>
	);
}
