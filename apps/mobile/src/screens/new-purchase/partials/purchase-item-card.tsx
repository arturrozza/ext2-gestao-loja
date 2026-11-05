import { CopyIcon } from "phosphor-react-native/src/icons/Copy";
import { TrashIcon } from "phosphor-react-native/src/icons/Trash";
import { Pressable, View } from "react-native";
import { DateField } from "@/components/date-field";
import { FormField } from "@/components/form-field";
import { ProductThumb } from "@/components/product-thumb";
import { QuantityStepper } from "@/components/quantity-stepper";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { hapticTap, withHaptic } from "@/lib/haptics";
import { formatMoney, parseMoneyInput } from "@/lib/money";
import type { PurchaseItemDraft } from "../new-purchase.schema";

function ItemAction({
	icon,
	label,
	onPress,
	destructive = false,
}: {
	icon: typeof TrashIcon;
	label: string;
	onPress: () => void;
	destructive?: boolean;
}) {
	return (
		<Pressable
			onPress={withHaptic(hapticTap, onPress)}
			accessibilityRole="button"
			accessibilityLabel={label}
			hitSlop={8}
			className="p-1"
		>
			<Icon
				as={icon}
				size={18}
				className={destructive ? "text-destructive" : "text-foreground/50"}
			/>
		</Pressable>
	);
}

/** One purchase line: quantity, unit cost and (when the product has one) expiry month/year. */
export function PurchaseItemCard({
	item,
	errors,
	onChange,
	onRemove,
	onDuplicate,
}: {
	item: PurchaseItemDraft;
	errors: { quantity?: string; unitCost?: string; expiry?: string };
	onChange: (patch: Partial<PurchaseItemDraft>) => void;
	onRemove: () => void;
	onDuplicate: () => void;
}) {
	const cost = parseMoneyInput(item.unitCost);

	return (
		<View className="gap-4 border-border border-b pb-5">
			<View className="flex-row items-center gap-3">
				<ProductThumb uri={item.product.photoUri} name={item.product.name} />
				<Text className="flex-1 font-sans-semibold text-sm" numberOfLines={2}>
					{item.product.name}
				</Text>
				{item.product.hasExpiry ? (
					<ItemAction
						icon={CopyIcon}
						label="Adicionar outra validade deste produto"
						onPress={onDuplicate}
					/>
				) : null}
				<ItemAction
					icon={TrashIcon}
					label="Remover"
					onPress={onRemove}
					destructive
				/>
			</View>
			<View className="flex-row items-end gap-3">
				<View className="gap-2">
					<Text className="px-1 font-sans-medium text-sm">Quantidade</Text>
					<QuantityStepper
						value={item.quantity}
						onChange={(quantity) => onChange({ quantity })}
						invalid={Boolean(errors.quantity)}
					/>
				</View>
				<View className="flex-1">
					<FormField
						label="Custo un. (R$)"
						value={item.unitCost}
						onChangeText={(unitCost) => onChange({ unitCost })}
						keyboardType="decimal-pad"
						placeholder="0,00"
						className={errors.unitCost ? "border-destructive" : undefined}
					/>
				</View>
			</View>
			{item.product.hasExpiry ? (
				<DateField
					label="Validade (mês/ano)"
					mode="month"
					value={item.expiry}
					onChange={(expiry) => onChange({ expiry })}
					error={errors.expiry}
					placeholder="Escolher mês e ano"
				/>
			) : null}
			{errors.quantity || errors.unitCost ? (
				<Text className="px-1 text-destructive text-sm">
					{errors.quantity ?? errors.unitCost}
				</Text>
			) : null}
			<View className="flex-row justify-between px-1">
				<Text className="text-muted-foreground text-sm">Total do item</Text>
				<Text className="font-sans-semibold text-sm">
					{cost === null ? "—" : formatMoney(cost * item.quantity)}
				</Text>
			</View>
		</View>
	);
}
