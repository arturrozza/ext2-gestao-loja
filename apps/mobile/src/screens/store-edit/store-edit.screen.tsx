import { router } from "expo-router";
import { IdentificationCardIcon } from "phosphor-react-native/src/icons/IdentificationCard";
import { PhoneIcon } from "phosphor-react-native/src/icons/Phone";
import { StorefrontIcon } from "phosphor-react-native/src/icons/Storefront";
import { AddressField } from "@/components/address-field";
import { FormField } from "@/components/form-field";
import { FormScreen } from "@/components/form-screen";
import { FormSection } from "@/components/form-section";
import { ScreenQuery } from "@/components/screen-query";
import { FormSkeleton } from "@/components/skeleton";
import { showToast } from "@/components/toast";
import { maskDocument, maskPhone } from "@/lib/masks";
import { useZodForm } from "@/lib/use-zod-form";
import type { StoreProfile } from "@/queries/store/store.types";
import {
	useStoreProfile,
	useUpdateStoreProfile,
} from "@/queries/store/use-store";
import { storeEditSchema } from "./store-edit.schema";

function StoreForm({ store }: { store: StoreProfile }) {
	const update = useUpdateStoreProfile();
	const form = useZodForm(storeEditSchema, {
		name: store.name,
		document: store.document ?? "",
		phone: store.phone ?? "",
		address: store.address ?? "",
	});

	const submit = form.handleSubmit((data) =>
		update.mutate(data, {
			onSuccess: () => {
				showToast("Dados da loja salvos");
				router.back();
			},
			onError: form.applyApiError,
		}),
	);

	return (
		<FormScreen
			title="Dados da loja"
			error={form.footerError(update.error)}
			pending={update.isPending}
			submitLabel="Salvar"
			onSubmit={submit}
		>
			<FormSection>
				<FormField
					label="Nome"
					icon={StorefrontIcon}
					placeholder="Ex.: Mundo Madam Cosméticos"
					value={form.values.name}
					onChangeText={(text) => form.set("name", text)}
					error={form.errors.name}
				/>
				<FormField
					label="CPF ou CNPJ (opcional)"
					icon={IdentificationCardIcon}
					placeholder="00.000.000/0000-00"
					value={form.values.document}
					onChangeText={(text) => form.set("document", maskDocument(text))}
					error={form.errors.document}
					keyboardType="number-pad"
				/>
				<FormField
					label="Telefone (opcional)"
					icon={PhoneIcon}
					placeholder="(11) 90000-0000"
					value={form.values.phone}
					onChangeText={(text) => form.set("phone", maskPhone(text))}
					error={form.errors.phone}
					keyboardType="phone-pad"
				/>
				<AddressField
					value={form.values.address}
					onChangeText={(text) => form.set("address", text)}
					error={form.errors.address}
				/>
			</FormSection>
		</FormScreen>
	);
}

export function StoreEditScreen() {
	const query = useStoreProfile();
	return (
		<ScreenQuery
			title="Dados da loja"
			query={query}
			skeleton={<FormSkeleton />}
			sheet
		>
			{(store) => <StoreForm store={store} />}
		</ScreenQuery>
	);
}
