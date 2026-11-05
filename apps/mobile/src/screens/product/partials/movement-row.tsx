import type { Href } from "expo-router";
import { View } from "react-native";
import { ListRow } from "@/components/list-card";
import { Text } from "@/components/ui/text";
import { formatDateTime } from "@/lib/dates";
import { ADJUSTMENT_REASONS, MOVEMENT_TYPES, signed } from "@/lib/labels";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { Movement } from "@/queries/products/products.types";

function title(movement: Movement) {
	const type = MOVEMENT_TYPES[movement.type];
	if (movement.origin) return `${type} #${movement.origin.number}`;
	if (movement.reason)
		return `${type} · ${ADJUSTMENT_REASONS[movement.reason]}`;
	return type;
}

function originHref(origin: Movement["origin"]): Href | undefined {
	if (!origin) return undefined;
	return origin.kind === "purchase"
		? `/purchases/${origin.id}`
		: `/sales/${origin.id}`;
}

/** Right side: the change in units, or the new cost for a cost correction. */
function Change({ movement }: { movement: Movement }) {
	if (movement.type === "cost_correction") {
		return (
			<View className="items-end gap-0.5">
				<Text className="font-sans-semibold text-sm">
					{formatMoney(movement.unitCost)}
				</Text>
				<Text className="text-[11px] text-muted-foreground">novo custo</Text>
			</View>
		);
	}
	return (
		<View className="items-end gap-0.5">
			<Text
				className={cn(
					"font-sans-semibold text-sm",
					movement.quantity < 0 && "text-destructive",
				)}
			>
				{signed(movement.quantity)}
			</Text>
			<Text className="text-[11px] text-muted-foreground">
				fica {movement.stockAfter}
			</Text>
		</View>
	);
}

/**
 * One ledger entry (estoque.md): what happened, when and who, the change and the balance after. Purchases and sales
 * open their origin, which shows the costs; entries without an origin show them here.
 */
export function MovementRow({ movement }: { movement: Movement }) {
	return (
		<ListRow
			title={title(movement)}
			subtitle={`${formatDateTime(movement.createdAt)} · ${movement.author}`}
			right={<Change movement={movement} />}
			href={originHref(movement.origin)}
		>
			{movement.origin ? null : (
				<Text className="text-muted-foreground text-xs">
					custo {formatMoney(movement.unitCost)} · médio{" "}
					{formatMoney(movement.averageCostAfter)}
				</Text>
			)}
			{movement.note ? (
				<Text className="text-muted-foreground text-xs">“{movement.note}”</Text>
			) : null}
		</ListRow>
	);
}
