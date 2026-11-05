import { PlusIcon } from "phosphor-react-native/src/icons/Plus";
import { useState } from "react";
import { Pressable, View } from "react-native";
import { NewCategorySheet } from "@/components/new-category-sheet";
import { SelectField } from "@/components/select-field";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { hapticTap, withHaptic } from "@/lib/haptics";
import { useCategories } from "@/queries/products/use-products";

const NONE = "none";

/** Category of the product (at most one, produtos.md), with a shortcut to create one right here. Active ones only. */
export function CategoryField({
	value,
	onChange,
}: {
	value: string | null;
	onChange: (categoryId: string | null) => void;
}) {
	const categories = useCategories();
	const [creating, setCreating] = useState(false);
	// An archived category can't be picked, but a product already in one may keep it (produtos.md).
	const [initial] = useState(value);
	const options = [
		{ value: NONE, label: "Sem categoria" },
		...(categories.data ?? [])
			.filter((c) => !c.archived || c.id === initial)
			.map((c) => ({
				value: c.id,
				label: c.archived ? `${c.name} (arquivada)` : c.name,
			})),
	];

	return (
		<View>
			<SelectField
				label="Categoria (opcional)"
				options={options}
				value={value ?? NONE}
				onChange={(id) => onChange(id === NONE ? null : id)}
				action={
					<Pressable
						onPress={withHaptic(hapticTap, () => setCreating(true))}
						hitSlop={8}
						accessibilityRole="button"
						accessibilityLabel="Nova categoria"
						className="flex-row items-center gap-1"
					>
						<Icon as={PlusIcon} size={14} className="text-primary" />
						<Text className="font-sans-medium text-primary text-sm">Nova</Text>
					</Pressable>
				}
			/>
			<NewCategorySheet
				open={creating}
				onClose={() => setCreating(false)}
				onCreated={onChange}
			/>
		</View>
	);
}
