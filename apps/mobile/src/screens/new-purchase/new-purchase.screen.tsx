import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { DateField } from "@/components/date-field";
import { DiscardGuard } from "@/components/discard-guard";
import { FormField } from "@/components/form-field";
import { FormFooter } from "@/components/form-footer";
import { FormSection } from "@/components/form-section";
import { ProductPicker } from "@/components/product-picker";
import { ScreenLayout } from "@/components/screen-layout";
import { SheetHeader } from "@/components/sheet-header";
import { showToast } from "@/components/toast";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { formatDate, todayISODate } from "@/lib/dates";
import { nextDraftKey } from "@/lib/draft-key";
import { units } from "@/lib/labels";
import { formatMoney, moneyToInput, parseMoneyInput } from "@/lib/money";
import { useZodForm } from "@/lib/use-zod-form";
import type { ProductListItem } from "@/queries/products/products.types";
import { useStockProduct } from "@/queries/products/use-products";
import { useCreatePurchase } from "@/queries/purchases/use-purchases";
import {
	type NewPurchaseValues,
	newPurchaseSchema,
	type PurchaseItemDraft,
} from "./new-purchase.schema";
import { PurchaseItemList } from "./partials/purchase-item-list";

/** A new line for a product, with its current average cost as the starting unit cost. */
function draftFor(
	product: Pick<
		ProductListItem,
		"id" | "name" | "hasExpiry" | "photoUri" | "averageCost"
	>,
	quantity = 1,
): PurchaseItemDraft {
	return {
		key: nextDraftKey(),
		product: {
			id: product.id,
			name: product.name,
			hasExpiry: product.hasExpiry,
			photoUri: product.photoUri,
		},
		quantity,
		unitCost: product.averageCost > 0 ? moneyToInput(product.averageCost) : "",
		expiry: "",
	};
}

function totals(items: PurchaseItemDraft[]) {
	let cents = 0;
	let unitCount = 0;
	for (const item of items) {
		cents += (parseMoneyInput(item.unitCost) ?? 0) * item.quantity;
		unitCount += item.quantity;
	}
	return { cents, unitCount };
}

/**
 * Prefills the product passed as `?productId=` ("Lançar compra" from a product, "Cadastrar primeira entrada", or the
 * insufficient-stock shortcut of a sale, which also sends the missing `?quantity=`). Runs once, when the product
 * arrives.
 */
function usePrefill(add: (item: PurchaseItemDraft) => void) {
	const params = useLocalSearchParams<{
		productId?: string;
		quantity?: string;
	}>();
	const product = useStockProduct(params.productId);
	const done = useRef(false);
	useEffect(() => {
		if (done.current || !product.data) return;
		done.current = true;
		if (!product.data.archived) {
			add(draftFor(product.data, Number(params.quantity) || 1));
		}
	}, [product.data, params.quantity, add]);
}

/**
 * New purchase (compras.md): date (today by default, editable), one or more items with quantity, unit cost and
 * expiry when the product has one, and an optional note. Stock and average cost update when it's saved.
 */
export function NewPurchaseScreen() {
	const create = useCreatePurchase();
	const [picking, setPicking] = useState(false);
	const form = useZodForm(newPurchaseSchema, {
		date: formatDate(todayISODate()),
		note: "",
		items: [],
	} satisfies NewPurchaseValues);
	const { values, errors, set } = form;
	const updateItems = (
		change: (items: PurchaseItemDraft[]) => PurchaseItemDraft[],
	) =>
		form.setValues((current) => ({ ...current, items: change(current.items) }));
	usePrefill((item) => updateItems((all) => [...all, item]));
	const summary = totals(values.items);

	const submit = form.handleSubmit((data) => {
		if (!create.isPending)
			create.mutate(data, {
				onSuccess: () => {
					showToast("Compra lançada");
					router.back();
				},
				onError: form.applyApiError,
			});
	});

	return (
		<ScreenLayout
			sheet
			header={<SheetHeader title="Nova compra" />}
			footer={
				<FormFooter error={form.footerError(create.error)}>
					<View className="flex-row justify-between">
						<Text className="text-muted-foreground text-sm">
							{values.items.length}{" "}
							{values.items.length === 1 ? "item" : "itens"} ·{" "}
							{units(summary.unitCount)}
						</Text>
						<Text className="font-sans-semibold">
							{formatMoney(summary.cents)}
						</Text>
					</View>
					<Button size="lg" onPress={submit} loading={create.isPending}>
						<Text>Lançar compra</Text>
					</Button>
				</FormFooter>
			}
		>
			<FormSection>
				<DateField
					label="Data da compra"
					value={values.date}
					onChange={(date) => set("date", date)}
					error={errors.date}
					maximumDate={new Date()}
				/>
			</FormSection>
			<PurchaseItemList
				items={values.items}
				errors={errors}
				update={updateItems}
				onAdd={() => setPicking(true)}
			/>
			<FormSection>
				<FormField
					label="Observação (opcional)"
					value={values.note}
					onChangeText={(text) => set("note", text)}
					placeholder="Ex.: nota 1234"
				/>
			</FormSection>
			<DiscardGuard
				dirty={
					values.items.length > 0 && !create.isPending && !create.isSuccess
				}
				title="Descartar compra?"
				description="Os produtos e dados preenchidos vão se perder."
			/>
			<ProductPicker
				open={picking}
				mode="purchase"
				addedIds={values.items.map((item) => item.product.id)}
				onClose={() => setPicking(false)}
				onConfirm={(products) =>
					updateItems((all) => [
						...all,
						...products.map((product) => draftFor(product)),
					])
				}
			/>
		</ScreenLayout>
	);
}
