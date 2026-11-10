import { PageTitle } from "@/components/page-title";
import { sheetRoute } from "@/components/route-sheet";
import { ScreenHeader } from "@/components/screen-header";
import { ScreenLayout } from "@/components/screen-layout";
import { SheetHeader } from "@/components/sheet-header";
import { UnderConstruction } from "@/components/under-construction";

/** How the route is presented: a tab, a screen pushed on the stack, or a sheet (`SHEETS` in `(app)/_layout.tsx`). */
type Presentation = "tab" | "stack" | "sheet";

/**
 * Stands in for every screen of a module that isn't built yet (docs/decisions.md). Its real screen is already in
 * `screens/` and comes back to the route when the module gets its API.
 */
export function UnderConstructionScreen({
	title,
	presentation,
}: {
	title: string;
	presentation: Presentation;
}) {
	if (presentation === "tab") {
		return (
			<ScreenLayout bottom="tabs" compactTitle={title} contentClassName="gap-5">
				<PageTitle title={title} />
				<UnderConstruction />
			</ScreenLayout>
		);
	}
	if (presentation === "sheet") {
		return (
			<ScreenLayout sheet header={<SheetHeader title={title} />}>
				<UnderConstruction />
			</ScreenLayout>
		);
	}
	return (
		<ScreenLayout header={<ScreenHeader title={title} />}>
			<UnderConstruction />
		</ScreenLayout>
	);
}

/** The route component of a screen under construction: `export default underConstructionRoute("Vendas", "tab")`. */
export function underConstructionRoute(
	title: string,
	presentation: Presentation = "stack",
) {
	function UnderConstructionRoute() {
		return (
			<UnderConstructionScreen title={title} presentation={presentation} />
		);
	}
	return presentation === "sheet"
		? sheetRoute(UnderConstructionRoute)
		: UnderConstructionRoute;
}
