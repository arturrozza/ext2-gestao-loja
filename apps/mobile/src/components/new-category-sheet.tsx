import { useState } from "react";
import { View } from "react-native";
import { BottomSheet } from "@/components/bottom-sheet";
import { FormField } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { errorMessage } from "@/lib/errors";
import { useCreateCategory } from "@/queries/products/use-products";

/** Creates a category (just a name, produtos.md). Used by the categories screen and the product form. */
export function NewCategorySheet({
	open,
	onClose,
	onCreated,
}: {
	open: boolean;
	onClose: () => void;
	onCreated?: (id: string) => void;
}) {
	const [name, setName] = useState("");
	const create = useCreateCategory();
	const close = () => {
		create.reset();
		setName("");
		onClose();
	};
	const submit = () => {
		if (!name.trim() || create.isPending) return;
		create.mutate(name, {
			onSuccess: (category) => {
				onCreated?.(category.id);
				close();
			},
		});
	};

	return (
		<BottomSheet open={open} onClose={close} title="Nova categoria">
			<View className="gap-3 px-3 pt-1">
				<FormField
					label="Nome"
					placeholder="Ex.: Perfumes"
					value={name}
					onChangeText={setName}
					error={create.error ? errorMessage(create.error) : undefined}
					autoFocus
					returnKeyType="done"
					onSubmitEditing={submit}
				/>
				<Button
					onPress={submit}
					disabled={!name.trim()}
					loading={create.isPending}
				>
					<Text>Criar categoria</Text>
				</Button>
			</View>
		</BottomSheet>
	);
}
