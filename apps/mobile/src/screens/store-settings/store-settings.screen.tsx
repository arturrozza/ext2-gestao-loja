import { router } from "expo-router";
import { ClockIcon } from "phosphor-react-native/src/icons/Clock";
import { PercentIcon } from "phosphor-react-native/src/icons/Percent";
import { FormField } from "@/components/form-field";
import { FormScreen } from "@/components/form-screen";
import { FormSection } from "@/components/form-section";
import { ScreenQuery } from "@/components/screen-query";
import { FormSkeleton } from "@/components/skeleton";
import { showToast } from "@/components/toast";
import { percentToInput } from "@/lib/money";
import { useZodForm } from "@/lib/use-zod-form";
import type { StoreSettings } from "@/queries/store/store.types";
import {
	useStoreSettings,
	useUpdateStoreSettings,
} from "@/queries/store/use-store";
import { storeSettingsSchema } from "./store-settings.schema";

function SettingsForm({ settings }: { settings: StoreSettings }) {
	const update = useUpdateStoreSettings();
	const form = useZodForm(storeSettingsSchema, {
		defaultTaxPercent: percentToInput(settings.defaultTaxPercent),
		mercadoLivreFeePercent: percentToInput(settings.mercadoLivreFeePercent),
		expiryWarningDays: String(settings.expiryWarningDays),
	});

	const submit = form.handleSubmit((data) =>
		// The margin and stale product thresholds aren't used for now (docs/decisions.md): they go back as they are.
		update.mutate(
			{
				...data,
				staleProductDays: settings.staleProductDays,
				lowMarginPercent: settings.lowMarginPercent,
			},
			{
				onSuccess: () => {
					showToast("Configurações salvas");
					router.back();
				},
				onError: form.applyApiError,
			},
		),
	);

	return (
		<FormScreen
			title="Configurações"
			error={form.footerError(update.error)}
			pending={update.isPending}
			submitLabel="Salvar"
			onSubmit={submit}
		>
			<FormSection
				title="Vendas"
				description="Sugeridos em cada venda, onde dá para mudar só naquela venda."
			>
				<FormField
					label="Imposto padrão (%)"
					icon={PercentIcon}
					placeholder="Ex.: 6"
					value={form.values.defaultTaxPercent}
					onChangeText={(text) => form.set("defaultTaxPercent", text)}
					error={form.errors.defaultTaxPercent}
					keyboardType="decimal-pad"
				/>
				<FormField
					label="Taxa do Mercado Livre (%)"
					icon={PercentIcon}
					placeholder="Ex.: 16"
					value={form.values.mercadoLivreFeePercent}
					onChangeText={(text) => form.set("mercadoLivreFeePercent", text)}
					error={form.errors.mercadoLivreFeePercent}
					keyboardType="decimal-pad"
				/>
			</FormSection>
			<FormSection title="Alertas">
				<FormField
					label="Avisar vencimento com quantos dias"
					icon={ClockIcon}
					placeholder="Ex.: 30"
					value={form.values.expiryWarningDays}
					onChangeText={(text) => form.set("expiryWarningDays", text)}
					error={form.errors.expiryWarningDays}
					keyboardType="number-pad"
				/>
			</FormSection>
		</FormScreen>
	);
}

/** Sale defaults (tax, Mercado Livre fee) and alert thresholds. */
export function StoreSettingsScreen() {
	const query = useStoreSettings();
	return (
		<ScreenQuery
			title="Configurações"
			query={query}
			skeleton={<FormSkeleton />}
			sheet
		>
			{(settings) => <SettingsForm settings={settings} />}
		</ScreenQuery>
	);
}
