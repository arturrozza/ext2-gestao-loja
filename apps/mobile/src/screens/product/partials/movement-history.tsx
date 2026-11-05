import { ListCard } from "@/components/list-card";
import { QueryView } from "@/components/query-states";
import { RowsSkeleton } from "@/components/skeleton";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { flattenPages } from "@/queries/pagination";
import { useProductMovements } from "@/queries/products/use-products";
import { MovementRow } from "./movement-row";

/** Ledger of the product, newest first (estoque.md). Paginated: it only grows. Back on the product screen with MUN-13. */
export function MovementHistory({ productId }: { productId: string }) {
	const query = useProductMovements(productId);

	return (
		<QueryView query={query} skeleton={<RowsSkeleton rows={4} />}>
			{(data) => {
				const movements = flattenPages(data.pages);
				if (movements.length === 0) {
					return (
						<ListCard title="Movimentações">
							<Text className="px-4 py-3.5 text-muted-foreground text-sm">
								Nenhuma ainda. O estoque entra pelas compras.
							</Text>
						</ListCard>
					);
				}
				return (
					<>
						<ListCard title="Movimentações">
							{movements.map((movement) => (
								<MovementRow key={movement.id} movement={movement} />
							))}
						</ListCard>
						{query.hasNextPage ? (
							<Button
								variant="outline"
								className="bg-background"
								loading={query.isFetchingNextPage}
								onPress={() => query.fetchNextPage()}
							>
								<Text>Ver mais</Text>
							</Button>
						) : null}
					</>
				);
			}}
		</QueryView>
	);
}
