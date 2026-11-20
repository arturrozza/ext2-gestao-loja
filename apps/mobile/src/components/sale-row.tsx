import { ItemRow } from "@/components/item-row";
import { StatusPill } from "@/components/status-pill";
import { ThumbStack } from "@/components/thumb-stack";
import { formatRelativeDate } from "@/lib/dates";
import { PAYMENT_STATUSES, productsLine, SALE_CHANNELS } from "@/lib/labels";
import { formatMoney } from "@/lib/money";
import type { PaymentStatus, SaleSummary } from "@/queries/sales/sales.types";

/** A term sale says where its payment stands; overdue needs attention, paid is quiet. */
const PAYMENT_TONES = {
	unpaid: "highlight",
	overdue: "danger",
	paid: "neutral",
} as const satisfies Record<PaymentStatus, "neutral" | "highlight" | "danger">;

/** On a person's own page their name would repeat in every row, so it's left out. */
export type SaleRowHide = "customer" | "reseller";

function subtitle(sale: SaleSummary, hide?: SaleRowHide, showDate = true) {
	return [
		showDate ? formatRelativeDate(sale.date) : null,
		hide === "reseller"
			? null
			: (sale.resellerName ?? SALE_CHANNELS[sale.channel]),
		hide === "customer" ? null : sale.customerName,
	]
		.filter(Boolean)
		.join(" · ");
}

/** A sale in a list (sales tab, customer and reseller history): what, when, channel; revenue and real profit. */
export function SaleRow({
	sale,
	hide,
	showDate = true,
}: {
	sale: SaleSummary;
	hide?: SaleRowHide;
	/** Off when the list already groups the sales by day. */
	showDate?: boolean;
}) {
	const loss = sale.profit < 0;
	const products = productsLine(sale.preview, sale.productCount);
	return (
		<ItemRow
			href={`/sales/${sale.id}`}
			label={`Venda ${sale.number}, ${products}`}
			leading={<ThumbStack items={sale.preview} total={sale.productCount} />}
			title={products}
			subtitle={`#${sale.number} · ${subtitle(sale, hide, showDate)}`}
			value={formatMoney(sale.revenue)}
			note={`lucro ${formatMoney(sale.profit)}`}
			noteTone={loss ? "danger" : "success"}
			struck={sale.status === "canceled"}
		>
			{sale.paymentStatus ? (
				<StatusPill
					label={PAYMENT_STATUSES[sale.paymentStatus]}
					tone={PAYMENT_TONES[sale.paymentStatus]}
				/>
			) : null}
		</ItemRow>
	);
}
