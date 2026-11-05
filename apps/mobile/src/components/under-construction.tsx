import { BarricadeIcon } from "phosphor-react-native/src/icons/Barricade";
import { View } from "react-native";
import { EmptyState } from "@/components/query-states";
import { StatusPill } from "@/components/status-pill";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";

const LABEL = "Em construção";

/**
 * A part of the app whose module isn't built yet (docs/decisions.md): shows up where its content will be, with no
 * actions. Loose on the page like an empty state.
 */
export function UnderConstruction({ description }: { description?: string }) {
	return (
		<EmptyState
			icon={BarricadeIcon}
			title={LABEL}
			description={
				description ?? "Esta parte do app ainda está sendo feita. Logo chega."
			}
		/>
	);
}

/** The same, as a card inside a screen that works (e.g. the stock block of the product screen). */
export function UnderConstructionCard({
	title,
	description,
}: {
	title: string;
	description: string;
}) {
	return (
		<View className="flex-row gap-3 rounded-2xl bg-background p-5">
			<Icon as={BarricadeIcon} size={22} className="text-foreground/35" />
			<View className="flex-1 gap-1">
				<View className="flex-row flex-wrap items-center gap-2">
					<Text className="font-sans-semibold text-base">{title}</Text>
					<UnderConstructionTag />
				</View>
				<Text className="text-muted-foreground text-sm">{description}</Text>
			</View>
		</View>
	);
}

/** Marks a shortcut or action that leads to a module under construction. */
export function UnderConstructionTag() {
	return <StatusPill label={LABEL} />;
}
