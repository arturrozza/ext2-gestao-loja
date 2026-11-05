import type { ReactNode } from "react";
import { type QueryLike, QueryView } from "@/components/query-states";
import { ScreenHeader } from "@/components/screen-header";
import { ScreenLayout } from "@/components/screen-layout";
import { SheetHeader } from "@/components/sheet-header";
import { DetailSkeleton } from "@/components/skeleton";

/**
 * Whole-screen version of `QueryView`, for screens that can't render anything before the data arrives (detail and
 * edit screens): shows the header with a skeleton or the error state, then hands the data to `children`.
 */
export function ScreenQuery<T>({
	title,
	query,
	skeleton = <DetailSkeleton />,
	sheet = false,
	children,
}: {
	title: string;
	query: QueryLike<T>;
	/** Shape of the screen while loading. Forms pass `FormSkeleton`. */
	skeleton?: ReactNode;
	/** The screen is a sheet (a form): its loading and error states are too. */
	sheet?: boolean;
	children: (data: T) => ReactNode;
}) {
	if (query.data !== undefined) return children(query.data);
	return (
		<ScreenLayout
			sheet={sheet}
			header={
				sheet ? <SheetHeader title={title} /> : <ScreenHeader title={title} />
			}
		>
			<QueryView query={query} skeleton={skeleton}>
				{() => null}
			</QueryView>
		</ScreenLayout>
	);
}
