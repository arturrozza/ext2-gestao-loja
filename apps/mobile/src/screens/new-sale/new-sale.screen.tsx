import { useState } from "react";
import { View } from "react-native";
import { CollapsibleSection } from "@/components/collapsible-section";
import { DateField } from "@/components/date-field";
import { DiscardGuard } from "@/components/discard-guard";
import { ProductPicker } from "@/components/product-picker";
import { SaleBreakdown } from "@/components/sale-breakdown";
import { ScreenLayout } from "@/components/screen-layout";
import { ScreenQuery } from "@/components/screen-query";
import { SheetHeader } from "@/components/sheet-header";
import { FormSkeleton } from "@/components/skeleton";
import { formatMoney } from "@/lib/money";
import type { StoreSettings } from "@/queries/store/store.types";
import { useStoreSettings } from "@/queries/store/use-store";
import { CustomerField } from "./partials/customer-field";
import { SaleCostsSection } from "./partials/sale-costs-section";
import {
	AdjustmentSection,
	ItemsSection,
	PaymentSection,
	SaleFooter,
} from "./partials/sale-sections";
import { useNewSaleForm } from "./use-new-sale-form";

function NewSaleForm({ settings }: { settings: StoreSettings }) {
	const sale = useNewSaleForm(settings);
	const { values, errors, set } = sale.form;
	const [picking, setPicking] = useState(false);

	return (
		<ScreenLayout
			sheet
			header={<SheetHeader title="Nova venda" />}
			footer={<SaleFooter sale={sale} />}
		>
			<ItemsSection sale={sale} onAdd={() => setPicking(true)} />
			<PaymentSection sale={sale} />
			<View className="border-border border-t">
				<AdjustmentSection sale={sale} />
				<CollapsibleSection
					title="Custos"
					summary={formatMoney(
						sale.breakdown.costAmountsCents.reduce((a, b) => a + b, 0),
					)}
					forceOpen={Object.keys(errors).some((key) =>
						key.startsWith("costs."),
					)}
				>
					<SaleCostsSection
						costs={values.costs}
						amountsCents={sale.breakdown.costAmountsCents}
						errors={errors}
						update={sale.updateCosts}
					/>
				</CollapsibleSection>
				<CollapsibleSection
					title="Cliente e data"
					summary={`${values.customer?.name ?? "Sem cliente"} · ${values.date}`}
					forceOpen={Boolean(errors.date)}
				>
					<CustomerField
						value={values.customer}
						onChange={(customer) => set("customer", customer)}
					/>
					<DateField
						label="Data da venda"
						value={values.date}
						onChange={(date) => set("date", date)}
						error={errors.date}
						maximumDate={new Date()}
					/>
				</CollapsibleSection>
			</View>
			{values.items.length > 0 ? (
				<SaleBreakdown title="Resultado" data={sale.breakdown} warnLoss />
			) : null}
			<DiscardGuard
				dirty={
					values.items.length > 0 &&
					!sale.create.isPending &&
					!sale.create.isSuccess
				}
				title="Descartar venda?"
				description="Os produtos e dados preenchidos vão se perder."
			/>
			<ProductPicker
				open={picking}
				mode="sale"
				addedIds={values.items.map((item) => item.product.id)}
				onClose={() => setPicking(false)}
				onConfirm={sale.addProducts}
			/>
		</ScreenLayout>
	);
}

/** Discount, costs, customer and date sit one tap away: they usually keep their defaults. */
export function NewSaleScreen() {
	const query = useStoreSettings();
	return (
		<ScreenQuery
			title="Nova venda"
			query={query}
			skeleton={<FormSkeleton />}
			sheet
		>
			{(settings) => <NewSaleForm settings={settings} />}
		</ScreenQuery>
	);
}
