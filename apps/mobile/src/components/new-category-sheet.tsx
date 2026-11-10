import { TagIcon } from "phosphor-react-native/src/icons/Tag";
import { type ComponentRef, useRef, useState } from "react";
import { Keyboard, ScrollView, type TextInput } from "react-native";
import { z } from "zod";
import { ConfirmSheet } from "@/components/confirm-sheet";
import { FormField } from "@/components/form-field";
import { FormFooter } from "@/components/form-footer";
import { SheetModal } from "@/components/sheet-modal";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { useZodForm } from "@/lib/use-zod-form";
import { useCreateCategory } from "@/queries/products/use-products";

const schema = z.object({
	name: z.string().trim().min(1, "Informe o nome da categoria."),
});

/**
 * Creates a category (just a name, produtos.md), looking like the other create forms: sheet header, the field, the
 * submit fixed at the bottom, and a question before throwing a typed name away. It's a sheet over the screen, not a
 * route, so the product form can open it and get the new category back. Used by the categories screen too.
 */
export function NewCategorySheet({
	open,
	onClose,
	onCreated,
}: {
	open: boolean;
	onClose: () => void;
	onCreated?: (id: string) => void;
}) {
	const form = useZodForm(schema, { name: "" });
	const create = useCreateCategory();
	const [discarding, setDiscarding] = useState(false);
	const nameRef = useRef<ComponentRef<typeof TextInput>>(null);

	const close = () => {
		form.reset();
		create.reset();
		setDiscarding(false);
		onClose();
	};
	// While the request runs the sheet stays open, so its result (or error) is never lost; the request's own timeout
	// bounds the wait.
	const requestClose = () => {
		if (create.isPending) return;
		if (!form.values.name.trim()) return close();
		// The question comes up from the bottom: the keyboard would be in its way.
		Keyboard.dismiss();
		setDiscarding(true);
	};
	const submit = form.handleSubmit(({ name }) => {
		if (create.isPending) return;
		create.mutate(name, {
			onSuccess: (category) => {
				onCreated?.(category.id);
				close();
			},
			onError: form.applyApiError,
		});
	});

	return (
		<SheetModal open={open} onClose={requestClose} title="Nova categoria">
			<ScrollView
				keyboardShouldPersistTaps="handled"
				showsVerticalScrollIndicator={false}
				contentContainerClassName="px-5 pt-2 pb-4"
			>
				<FormField
					ref={nameRef}
					label="Nome"
					icon={TagIcon}
					placeholder="Ex.: Perfumes"
					value={form.values.name}
					onChangeText={(text) => form.set("name", text)}
					error={form.errors.name}
					maxLength={60}
					autoFocus
					returnKeyType="done"
					onSubmitEditing={submit}
				/>
			</ScrollView>
			<FormFooter error={form.footerError(create.error)}>
				<Button size="lg" onPress={submit} loading={create.isPending}>
					<Text>Criar categoria</Text>
				</Button>
			</FormFooter>
			{/* Inside the sheet, so it opens over it: a modal can't open over one it isn't in. */}
			<ConfirmSheet
				open={discarding}
				// Back to typing: the keyboard left when the question came up.
				onClose={() => {
					setDiscarding(false);
					nameRef.current?.focus();
				}}
				title="Descartar a nova categoria?"
				description="O nome que você digitou vai ser perdido."
				confirmLabel="Descartar"
				onConfirm={close}
			/>
		</SheetModal>
	);
}
