import { usePreventRemove, useRouter } from "expo-router";
import {
	type ComponentType,
	createContext,
	type ReactNode,
	useContext,
	useMemo,
	useRef,
	useState,
} from "react";
import { SheetFrame } from "@/components/sheet-frame";
import { useSheetMotion } from "@/components/sheet-motion";
import { leaveScreen } from "@/lib/navigation";

/** Asked before the sheet leaves; calls `proceed` to let it go (a form with unsaved work, `DiscardGuard`). */
type LeaveGuard = (proceed: () => void) => void;

const RouteSheetContext = createContext<{
	setGuard: (guard: LeaveGuard | null) => void;
} | null>(null);

/** The route sheet the screen is in, to put a question before it leaves. Only inside a `sheetRoute`. */
export function useRouteSheet() {
	const sheet = useContext(RouteSheetContext);
	if (!sheet) throw new Error("Not inside a route sheet (`sheetRoute`).");
	return sheet;
}

/**
 * A route shown as a sheet (`SHEETS` in `(app)/_layout.tsx`). The navigator shows and removes it with no animation of
 * its own (`SHEET`), and the slide is ours, the same as every other sheet. Leaving, whichever way (close, drag, the
 * system's back, `router.back()` or `replace` after saving), is held here, the one place that holds it: the guard is
 * asked first if there is one, the sheet slides down, and only then the navigation is repeated.
 */
function RouteSheet({ children }: { children: ReactNode }) {
	const router = useRouter();
	const [phase, setPhase] = useState<"open" | "leaving" | "gone">("open");
	const guard = useRef<LeaveGuard | null>(null);
	const after = useRef<(() => void) | null>(null);

	// Held until the sheet is down. While it slides the first navigation stands and later ones are dropped (the system's
	// back on top of a save); the sheet itself takes no touches by then (`SheetFrame`).
	usePreventRemove(phase !== "gone", ({ repeat }) => {
		if (phase !== "open") return;
		const leave = () => {
			after.current = repeat;
			setPhase("leaving");
		};
		if (guard.current) guard.current(leave);
		else leave();
	});
	const motion = useSheetMotion(phase === "open", () => {
		setPhase("gone");
		after.current?.();
	});
	const sheet = useMemo(
		() => ({
			setGuard: (next: LeaveGuard | null) => {
				guard.current = next;
			},
		}),
		[],
	);

	return (
		<RouteSheetContext.Provider value={sheet}>
			<SheetFrame motion={motion} onClose={() => leaveScreen(router)}>
				{children}
			</SheetFrame>
		</RouteSheetContext.Provider>
	);
}

/**
 * The route component of a screen shown as a sheet: `export default sheetRoute(NewSaleScreen)`. The sheet wraps the
 * route, not the screen's layout, so it opens once even when the screen swaps a loading layout for the form.
 */
export function sheetRoute(Screen: ComponentType) {
	function SheetRoute() {
		return (
			<RouteSheet>
				<Screen />
			</RouteSheet>
		);
	}
	SheetRoute.displayName = `sheetRoute(${Screen.displayName ?? Screen.name})`;
	return SheetRoute;
}
