import { PlusIcon } from "phosphor-react-native/src/icons/Plus";
import { View } from "react-native";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { nextDraftKey } from "@/lib/draft-key";
import type { PurchaseItemDraft } from "../new-purchase.schema";
import { PurchaseItemCard } from "./purchase-item-card";

type Update = (
	change: (items: PurchaseItemDraft[]) => PurchaseItemDraft[],
) => void;

/** The lines of the purchase and the button that opens the product picker. */
export function PurchaseItemList({
	items,
	errors,
	update,
	onAdd,
}: {
	items: PurchaseItemDraft[];
	errors: Record<string, string>;
	update: Update;
	onAdd: () => void;
}) {
	return (
		<View className="gap-3">
			<Text className="px-1 font-sans-semibold text-base">Produtos</Text>
			{items.map((item, index) => (
				<PurchaseItemCard
					key={item.key}
					item={item}
					errors={{
						quantity: errors[`items.${index}.quantity`],
						unitCost: errors[`items.${index}.unitCost`],
						expiry: errors[`items.${index}.expiry`],
					}}
					onChange={(patch) =>
						update((all) =>
							all.map((i) => (i.key === item.key ? { ...i, ...patch } : i)),
						)
					}
					onRemove={() =>
						update((all) => all.filter((i) => i.key !== item.key))
					}
					onDuplicate={() =>
						update((all) => [
							...all,
							{ ...item, key: nextDraftKey(), quantity: 1, expiry: "" },
						])
					}
				/>
			))}
			{errors.items ? (
				<Text className="px-1 text-destructive text-sm">{errors.items}</Text>
			) : null}
			<Button variant="outline" className="bg-background" onPress={onAdd}>
				<Icon as={PlusIcon} size={16} />
				<Text>Adicionar produtos</Text>
			</Button>
		</View>
	);
}
