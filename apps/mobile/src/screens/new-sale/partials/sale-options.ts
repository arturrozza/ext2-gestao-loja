import { CalendarDotsIcon } from "phosphor-react-native/src/icons/CalendarDots";
import { CardholderIcon } from "phosphor-react-native/src/icons/Cardholder";
import { CreditCardIcon } from "phosphor-react-native/src/icons/CreditCard";
import { HandshakeIcon } from "phosphor-react-native/src/icons/Handshake";
import { LightningIcon } from "phosphor-react-native/src/icons/Lightning";
import { MoneyIcon } from "phosphor-react-native/src/icons/Money";
import { PixLogoIcon } from "phosphor-react-native/src/icons/PixLogo";
import { PlusCircleIcon } from "phosphor-react-native/src/icons/PlusCircle";
import { ProhibitIcon } from "phosphor-react-native/src/icons/Prohibit";
import { ShoppingBagIcon } from "phosphor-react-native/src/icons/ShoppingBag";
import { StorefrontIcon } from "phosphor-react-native/src/icons/Storefront";
import { TagIcon } from "phosphor-react-native/src/icons/Tag";
import type { SelectOption } from "@/components/select-field";
import {
	PAYMENT_CONDITIONS,
	PAYMENT_METHODS,
	SALE_CHANNELS,
} from "@/lib/labels";
import type {
	PaymentCondition,
	PaymentMethod,
	SaleChannel,
} from "@/queries/sales/sales.types";
import type { SaleAdjustment } from "../new-sale.schema";

/** The choices of a new sale, each with an icon so the list reads at a glance. */
export const CHANNEL_OPTIONS: SelectOption<SaleChannel>[] = [
	{ value: "store", label: SALE_CHANNELS.store, icon: StorefrontIcon },
	{
		value: "mercado_livre",
		label: SALE_CHANNELS.mercado_livre,
		icon: ShoppingBagIcon,
	},
	{ value: "reseller", label: SALE_CHANNELS.reseller, icon: HandshakeIcon },
];

export const CONDITION_OPTIONS: SelectOption<PaymentCondition>[] = [
	{ value: "cash", label: PAYMENT_CONDITIONS.cash, icon: LightningIcon },
	{ value: "term", label: PAYMENT_CONDITIONS.term, icon: CalendarDotsIcon },
];

export const METHOD_OPTIONS: SelectOption<PaymentMethod>[] = [
	{ value: "pix", label: PAYMENT_METHODS.pix, icon: PixLogoIcon },
	{ value: "cash", label: PAYMENT_METHODS.cash, icon: MoneyIcon },
	{ value: "credit", label: PAYMENT_METHODS.credit, icon: CreditCardIcon },
	{ value: "debit", label: PAYMENT_METHODS.debit, icon: CardholderIcon },
];

export const ADJUSTMENT_OPTIONS: SelectOption<SaleAdjustment>[] = [
	{ value: "none", label: "Nenhum", icon: ProhibitIcon },
	{ value: "discount", label: "Desconto", icon: TagIcon },
	{ value: "surcharge", label: "Acréscimo", icon: PlusCircleIcon },
];
