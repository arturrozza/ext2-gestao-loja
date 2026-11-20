import { ListCard, ListRow } from "@/components/list-card";
import { StatusPill } from "@/components/status-pill";
import { daysUntilExpiry, formatExpiry } from "@/lib/dates";
import { days, times } from "@/lib/labels";
import type {
	ExpiryBalance,
	LotBalance,
} from "@/queries/products/products.types";

function ExpiryPill({ balance }: { balance: ExpiryBalance }) {
	if (balance.expired) return <StatusPill label="Vencido" tone="danger" />;
	if (balance.nearExpiry && balance.expiry) {
		const left = daysUntilExpiry(balance.expiry);
		return (
			<StatusPill
				label={left === 0 ? "Vence hoje" : `Vence em ${days(left)}`}
				tone="highlight"
			/>
		);
	}
	return null;
}

/** Lots are listed when there's more than one, or when the lot says something (estoque.md, RN-EST-27). */
function showsLots(balance: ExpiryBalance) {
	return (
		balance.lots.length > 1 ||
		balance.lots.some((lot) => lot.lotCode || lot.manufacturedOn)
	);
}

function lotSubtitle(lot: LotBalance) {
	return [
		lot.manufacturedOn
			? `fabricação ${formatExpiry(lot.manufacturedOn)}`
			: null,
		times(lot.quantity),
	]
		.filter(Boolean)
		.join(" · ");
}

/** Stock split by expiry, each with its lots in the order a sale takes them (estoque.md, RF-EST-03). */
export function ExpiryList({ expiries }: { expiries: ExpiryBalance[] }) {
	// Products without expiry have nothing to split.
	if (!expiries.some((balance) => balance.expiry)) return null;
	return (
		<ListCard title="Validades">
			{expiries.flatMap((balance) => [
				<ListRow
					key={balance.expiry ?? "none"}
					title={
						balance.expiry
							? `Validade ${formatExpiry(balance.expiry)}`
							: "Sem validade"
					}
					subtitle={times(balance.quantity)}
					right={<ExpiryPill balance={balance} />}
				/>,
				...(showsLots(balance)
					? balance.lots.map((lot) => (
							<ListRow
								key={lot.id}
								dense
								title={`Lote ${lot.lotCode ?? "sem número"}`}
								subtitle={lotSubtitle(lot)}
							/>
						))
					: []),
			])}
		</ListCard>
	);
}
