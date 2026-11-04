import { useRouter } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { ChoiceChips } from "@/components/choice-chips";
import { FormField } from "@/components/form-field";
import { FormFooter } from "@/components/form-footer";
import { FormSection } from "@/components/form-section";
import { Price } from "@/components/price";
import { ScreenHeader } from "@/components/screen-header";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { formErrors } from "@/lib/form-errors";
import {
	formatBRL,
	MOCK_PRODUCTS,
	MOCK_RESELLERS,
	parseBRNumber,
} from "@/lib/mock-erp-data";
import {
	type CartItem,
	newSaleSchema,
	PAYMENTS,
	type Payment,
} from "./mock-new-sale.schema";
import { SaleItems } from "./partials/sale-items";

const CHANNELS = [
	{ value: "store", label: "Loja" },
	{ value: "reseller", label: "Revendedora" },
	{ value: "ml", label: "Mercado Livre" },
] as const;

type SaleChannel = (typeof CHANNELS)[number]["value"];

const RESELLERS = MOCK_RESELLERS.map((r) => ({ value: r.id, label: r.name }));

function subtotalOf(items: CartItem[]) {
	return items.reduce((sum, item) => {
		const product = MOCK_PRODUCTS.find((p) => p.sku === item.sku);
		return sum + (product ? product.price * item.quantity : 0);
	}, 0);
}

export function MockNewSaleScreen() {
	const router = useRouter();
	const [customer, setCustomer] = useState("");
	const [channel, setChannel] = useState<SaleChannel>("store");
	const [reseller, setReseller] = useState(RESELLERS[0]?.value);
	const [payment, setPayment] = useState<Payment>();
	const [items, setItems] = useState<CartItem[]>([]);
	const [discount, setDiscount] = useState("");
	const [notes, setNotes] = useState("");
	const [submitted, setSubmitted] = useState(false);

	const values = {
		customer,
		payment,
		items,
		discount: discount ? parseBRNumber(discount) : undefined,
	};
	const result = newSaleSchema.safeParse(values);
	const errors = submitted && !result.success ? formErrors(result.error) : {};
	const subtotal = subtotalOf(items);
	const total = Math.max(
		0,
		subtotalOf(items) - (result.success ? (result.data.discount ?? 0) : 0),
	);

	function submit() {
		setSubmitted(true);
		if (result.success) router.back();
	}

	return (
		<KeyboardAvoidingView
			className="flex-1 bg-background"
			behavior={Platform.OS === "ios" ? "padding" : undefined}
		>
			<ScreenHeader title="Nova venda" />
			<ScrollView
				contentContainerClassName="gap-6 px-5 pb-8"
				keyboardShouldPersistTaps="handled"
			>
				<FormField
					label="Cliente"
					placeholder="Nome da cliente"
					value={customer}
					onChangeText={setCustomer}
					error={errors.customer}
					autoCapitalize="words"
				/>
				<FormSection title="Canal">
					<ChoiceChips
						options={CHANNELS}
						value={channel}
						onChange={setChannel}
					/>
				</FormSection>
				{channel === "reseller" ? (
					<Animated.View
						entering={FadeIn.duration(200)}
						exiting={FadeOut.duration(140)}
					>
						<FormSection title="Revendedora">
							<ChoiceChips
								options={RESELLERS}
								value={reseller}
								onChange={setReseller}
							/>
						</FormSection>
					</Animated.View>
				) : null}
				<FormSection title="Produtos" error={errors.items}>
					<SaleItems items={items} onChange={setItems} />
				</FormSection>
				<FormSection title="Pagamento" error={errors.payment}>
					<ChoiceChips
						options={PAYMENTS}
						value={payment}
						onChange={setPayment}
					/>
				</FormSection>
				<FormField
					label="Desconto (R$)"
					placeholder="0,00"
					keyboardType="decimal-pad"
					value={discount}
					onChangeText={setDiscount}
					error={errors.discount}
				/>
				<FormField
					label="Observação"
					placeholder="Opcional"
					value={notes}
					onChangeText={setNotes}
					multiline
					className="h-24 rounded-3xl py-3"
					textAlignVertical="top"
				/>
			</ScrollView>
			<FormFooter>
				<View className="gap-2 rounded-3xl bg-card p-4">
					<View className="flex-row justify-between">
						<Text className="text-muted-foreground text-sm">Subtotal</Text>
						<Text className="font-sans-medium text-sm">
							{formatBRL(subtotal)}
						</Text>
					</View>
					<View className="flex-row justify-between">
						<Text className="text-muted-foreground text-sm">Desconto</Text>
						<Text className="font-sans-medium text-sm">
							− {formatBRL(subtotal - total)}
						</Text>
					</View>
					<View className="h-px bg-border" />
					<View className="flex-row items-center justify-between">
						<Text className="font-sans-semibold">Total</Text>
						<Price value={total} className="text-xl" />
					</View>
				</View>
				<Button size="lg" onPress={submit}>
					<Text>Finalizar venda</Text>
				</Button>
			</FormFooter>
		</KeyboardAvoidingView>
	);
}
