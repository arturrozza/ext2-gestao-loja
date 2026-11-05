import type { ReactNode } from "react";
import { View } from "react-native";
import { BottomSheet } from "@/components/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { errorMessage } from "@/lib/errors";

/** Asks before something with consequences: what happens, optional extra field, the failed request, confirm or back. */
export function ConfirmSheet({
	open,
	onClose,
	title,
	description,
	confirmLabel,
	pending = false,
	error,
	onConfirm,
	children,
}: {
	open: boolean;
	onClose: () => void;
	title: string;
	description: string;
	confirmLabel: string;
	pending?: boolean;
	error?: unknown;
	onConfirm: () => void;
	children?: ReactNode;
}) {
	return (
		<BottomSheet open={open} onClose={onClose} title={title}>
			<View className="gap-3 px-3 pt-1">
				<Text className="text-muted-foreground text-sm">{description}</Text>
				{children}
				{error ? (
					<Text className="text-destructive text-sm">
						{errorMessage(error)}
					</Text>
				) : null}
				<Button variant="destructive" loading={pending} onPress={onConfirm}>
					<Text>{confirmLabel}</Text>
				</Button>
				<Button variant="outline" onPress={onClose}>
					<Text>Voltar</Text>
				</Button>
			</View>
		</BottomSheet>
	);
}
