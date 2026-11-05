import type { ReactNode } from "react";
import { FormFooter } from "@/components/form-footer";
import { ScreenLayout } from "@/components/screen-layout";
import { SheetHeader } from "@/components/sheet-header";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";

/** Shell of a form screen, shown as a sheet: header, the fields, and a fixed footer with the failed-request message and the submit. */
export function FormScreen({
	title,
	error,
	pending,
	submitLabel,
	onSubmit,
	children,
}: {
	title: string;
	error: string | null;
	pending: boolean;
	submitLabel: string;
	onSubmit: () => void;
	children: ReactNode;
}) {
	return (
		<ScreenLayout
			sheet
			header={<SheetHeader title={title} />}
			footer={
				<FormFooter error={error}>
					<Button size="lg" onPress={onSubmit} loading={pending}>
						<Text>{submitLabel}</Text>
					</Button>
				</FormFooter>
			}
		>
			{children}
		</ScreenLayout>
	);
}
