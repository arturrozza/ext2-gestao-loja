import { ReceiptIcon } from "phosphor-react-native/src/icons/Receipt";
import type { ReactNode } from "react";
import { View } from "react-native";
import { EmptyState } from "@/components/query-states";
import { SaleRow } from "@/components/sale-row";
import { ScreenHeader } from "@/components/screen-header";
import { ScreenLayout } from "@/components/screen-layout";
import { useInfiniteList } from "@/components/use-infinite-list";
import { formatDayHeading } from "@/lib/dates";
import { useSales } from "@/queries/sales/use-sales";

/**
 * Page of a reseller or customer: `children` on top (numbers, data, archive), then their sales, virtualized and
 * paginated. Canceled sales show up marked; they don't count in the totals.
 */
export function PersonSales({
	title,
	headerRight,
	filter,
	emptyDescription,
	children,
	bottom,
}: {
	title: string;
	headerRight: ReactNode;
	filter: { resellerId: string } | { customerId: string };
	emptyDescription: string;
	children: ReactNode;
	/** Under all the sales (archive). */
	bottom?: ReactNode;
}) {
	const query = useSales({ period: "all", channels: [], ...filter });
	const list = useInfiniteList(
		query,
		<EmptyState
			icon={ReceiptIcon}
			title="Nenhuma venda ainda"
			description={emptyDescription}
		/>,
		{ leading: "stack" },
	);

	return (
		<ScreenLayout
			header={<ScreenHeader title={title} right={headerRight} />}
			contentClassName="gap-7"
			list={{
				...list,
				footer: (
					<>
						{list.footer}
						{bottom ? <View className="px-5 pt-5">{bottom}</View> : null}
					</>
				),
				keyExtractor: (sale) => sale.id,
				sectionOf: (sale) => formatDayHeading(sale.date),
				renderItem: (sale) => (
					<SaleRow
						sale={sale}
						hide={"customerId" in filter ? "customer" : "reseller"}
						showDate={false}
					/>
				),
			}}
		>
			{children}
		</ScreenLayout>
	);
}
