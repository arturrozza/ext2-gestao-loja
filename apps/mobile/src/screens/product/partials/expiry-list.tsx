import { ListCard, ListRow } from "@/components/list-card";
import { StatusPill } from "@/components/status-pill";
import { daysUntilExpiry, formatExpiry } from "@/lib/dates";
import { days, times } from "@/lib/labels";
import type { ExpiryBalance } from "@/queries/products/products.types";

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

/** Stock split by expiry (estoque.md, "quantidade por validade"). Lots stay hidden. Back with the stock screen (MUN-13). */
export function ExpiryList({ expiries }: { expiries: ExpiryBalance[] }) {
	// Products without expiry have nothing to split.
	if (!expiries.some((balance) => balance.expiry)) return null;
	return (
		<ListCard title="Validades">
			{expiries.map((balance) => (
				<ListRow
					key={balance.expiry ?? "none"}
					title={
						balance.expiry
							? `Validade ${formatExpiry(balance.expiry)}`
							: "Sem validade"
					}
					subtitle={times(balance.quantity)}
					right={<ExpiryPill balance={balance} />}
				/>
			))}
		</ListCard>
	);
}
