import { WarningCircleIcon } from "phosphor-react-native/src/icons/WarningCircle";
import type { ReactNode } from "react";
import { View } from "react-native";
import { RowsSkeleton } from "@/components/skeleton";
import { Button } from "@/components/ui/button";
import { Icon, type IconType } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { errorMessage } from "@/lib/errors";

/** Loose on the page, no card: an icon, a title, a line of text and an optional action, centered. */
export function EmptyState({
	icon,
	title,
	description,
	action,
}: {
	icon: IconType;
	title: string;
	description?: string;
	action?: ReactNode;
}) {
	return (
		<View className="items-center gap-2 px-8 py-16">
			<Icon as={icon} size={36} className="text-foreground/35" />
			<Text className="mt-1 text-center font-sans-semibold text-base">
				{title}
			</Text>
			{description ? (
				<Text className="text-center text-muted-foreground text-sm">
					{description}
				</Text>
			) : null}
			{action ? <View className="mt-4 self-stretch px-4">{action}</View> : null}
		</View>
	);
}

/** A query failed: the message from the API and a retry button. */
export function ErrorState({
	error,
	onRetry,
}: {
	error: unknown;
	onRetry: () => void;
}) {
	return (
		<EmptyState
			icon={WarningCircleIcon}
			title="Não deu para carregar"
			description={errorMessage(error)}
			action={
				<Button variant="outline" onPress={onRetry}>
					<Text>Tentar de novo</Text>
				</Button>
			}
		/>
	);
}

export type QueryLike<T> = {
	data: T | undefined;
	error: unknown;
	isPending: boolean;
	refetch: () => unknown;
};

/**
 * Renders the loading and error states of a query and calls `children` with the data once it's there, so every
 * screen handles the three states the same way. `skeleton` is what shows while loading: rows, unless it says otherwise.
 */
export function QueryView<T>({
	query,
	skeleton = <RowsSkeleton />,
	children,
}: {
	query: QueryLike<T>;
	skeleton?: ReactNode;
	children: (data: T) => ReactNode;
}) {
	if (query.isPending) return skeleton;
	if (query.data === undefined) {
		return <ErrorState error={query.error} onRetry={() => query.refetch()} />;
	}
	return children(query.data);
}
