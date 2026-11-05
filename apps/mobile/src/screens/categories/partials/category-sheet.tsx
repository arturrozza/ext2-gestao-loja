import { useState } from "react";
import { View } from "react-native";
import { BottomSheet } from "@/components/bottom-sheet";
import { FormField } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { errorMessage } from "@/lib/errors";
import type { Category } from "@/queries/products/products.types";
import {
	useRenameCategory,
	useSetCategoryArchived,
} from "@/queries/products/use-products";

/** What archiving does, said before it happens (produtos.md): nothing is lost, the category just can't be picked. */
const ARCHIVE_NOTE =
	"Ao arquivar, ela deixa de aparecer para escolher no cadastro de produto e no filtro da lista. Os produtos que já estão nela continuam com ela, inclusive nos relatórios. Dá para reativar depois.";

const ARCHIVED_NOTE =
	"Arquivada: não aparece para escolher no cadastro de produto nem no filtro da lista. Os produtos dela continuam com ela. Reative para voltar a escolher.";

/**
 * Rename a category, archive it or bring an archived one back; categories are never deleted. Archiving is one tap,
 * without the confirm step of products (`ArchiveControl`): nothing changes for the products in it and it's undone the
 * same way, and a confirm sheet can't open over this one. The screen remounts it per category (`key`), so the name
 * starts from the category tapped.
 */
export function CategorySheet({
	category,
	open,
	onClose,
}: {
	category: Category;
	open: boolean;
	onClose: () => void;
}) {
	const [name, setName] = useState(category.name);
	const rename = useRenameCategory();
	const setArchived = useSetCategoryArchived();
	const pending = rename.isPending || setArchived.isPending;
	const dirty = name.trim() !== "" && name.trim() !== category.name;

	// While a request runs the sheet stays open, so its result (or error) is never lost.
	const close = () => {
		if (pending) return;
		rename.reset();
		setArchived.reset();
		// Reopening the same category starts from its name, not from an edit that wasn't saved.
		setName(category.name);
		onClose();
	};
	const save = () => {
		if (!dirty || pending) return;
		setArchived.reset();
		rename.mutate({ id: category.id, name }, { onSuccess: onClose });
	};
	const toggleArchived = () => {
		if (pending) return;
		rename.reset();
		setArchived.mutate(
			{ id: category.id, archived: !category.archived },
			{ onSuccess: onClose },
		);
	};

	return (
		<BottomSheet open={open} onClose={close} title={category.name}>
			<View className="gap-3 px-3 pt-1">
				<FormField
					label="Nome"
					value={name}
					onChangeText={setName}
					error={rename.error ? errorMessage(rename.error) : undefined}
					maxLength={60}
					returnKeyType="done"
					onSubmitEditing={save}
				/>
				<Button
					onPress={save}
					disabled={!dirty || setArchived.isPending}
					loading={rename.isPending}
				>
					<Text>Salvar nome</Text>
				</Button>
				<Text className="pt-2 text-muted-foreground text-sm">
					{category.archived ? ARCHIVED_NOTE : ARCHIVE_NOTE}
				</Text>
				{setArchived.error ? (
					<Text className="text-destructive text-sm">
						{errorMessage(setArchived.error)}
					</Text>
				) : null}
				{category.archived ? (
					<Button
						variant="outline"
						onPress={toggleArchived}
						disabled={rename.isPending}
						loading={setArchived.isPending}
					>
						<Text>Reativar categoria</Text>
					</Button>
				) : (
					<Button
						variant="ghost"
						onPress={toggleArchived}
						disabled={rename.isPending}
						loading={setArchived.isPending}
					>
						<Text className="text-destructive">Arquivar categoria</Text>
					</Button>
				)}
			</View>
		</BottomSheet>
	);
}
