import DateTimePicker, {
	DateTimePickerAndroid,
} from "@react-native-community/datetimepicker";
import { CalendarBlankIcon } from "phosphor-react-native/src/icons/CalendarBlank";
import { useEffect, useMemo, useState } from "react";
import { Platform, View } from "react-native";
import { BottomSheet } from "@/components/bottom-sheet";
import { PickerTrigger } from "@/components/picker-trigger";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import {
	formatDate,
	fromISODate,
	parseDateInput,
	parseExpiryInput,
	toISODate,
} from "@/lib/dates";
import { THEME } from "@/lib/theme";

/** `day`: "dd/mm/aaaa". `month`: "mm/aaaa" (expiry: month and year only, compras.md). */
type DateMode = "day" | "month";

function toDate(value: string, mode: DateMode): Date | null {
	if (mode === "day") {
		const iso = parseDateInput(value);
		return iso ? fromISODate(iso) : null;
	}
	const month = parseExpiryInput(value);
	return month ? fromISODate(`${month}-01`) : null;
}

function toText(date: Date, mode: DateMode): string {
	const day = formatDate(toISODate(date));
	return mode === "day" ? day : day.slice(3);
}

/** iOS: the picker in a sheet, confirmed with a button (it changes as the wheel turns). */
function IosPickerSheet({
	open,
	title,
	initial,
	mode,
	minimumDate,
	maximumDate,
	onClose,
	onPick,
}: {
	open: boolean;
	title: string;
	initial: Date;
	mode: DateMode;
	minimumDate?: Date;
	maximumDate?: Date;
	onClose: () => void;
	onPick: (date: Date) => void;
}) {
	const [draft, setDraft] = useState(initial);
	// Each opening starts from the field's current date.
	useEffect(() => {
		if (open) setDraft(initial);
	}, [open, initial]);
	return (
		<BottomSheet open={open} onClose={onClose} title={title}>
			<View className="items-center px-3">
				<DateTimePicker
					value={draft}
					mode="date"
					display={mode === "day" ? "inline" : "spinner"}
					locale="pt-BR"
					themeVariant="light"
					accentColor={THEME.primary}
					minimumDate={minimumDate}
					maximumDate={maximumDate}
					onChange={(_, date) => {
						if (date) setDraft(date);
					}}
				/>
			</View>
			<View className="px-3 pt-2">
				<Button
					onPress={() => {
						onPick(draft);
						onClose();
					}}
				>
					<Text>Confirmar</Text>
				</Button>
			</View>
		</BottomSheet>
	);
}

/**
 * Date field that opens the system calendar instead of taking typed digits: the dialog on Android, a sheet with the
 * calendar (or month wheel) on iOS. Keeps the form's text value ("dd/mm/aaaa" or "mm/aaaa").
 */
export function DateField({
	label,
	value,
	onChange,
	mode = "day",
	placeholder,
	error,
	minimumDate,
	maximumDate,
}: {
	label: string;
	value: string;
	onChange: (value: string) => void;
	mode?: DateMode;
	placeholder?: string;
	error?: string;
	minimumDate?: Date;
	maximumDate?: Date;
}) {
	const [open, setOpen] = useState(false);
	// Stable while the value doesn't change: the iOS sheet resets its draft from it each time it opens.
	const current = useMemo(
		() => toDate(value, mode) ?? new Date(),
		[value, mode],
	);

	const show = () => {
		if (Platform.OS === "android") {
			DateTimePickerAndroid.open({
				value: current,
				mode: "date",
				minimumDate,
				maximumDate,
				onChange: (event, date) => {
					if (event.type === "set" && date) onChange(toText(date, mode));
				},
			});
			return;
		}
		setOpen(true);
	};

	return (
		<View>
			<PickerTrigger
				label={label}
				icon={CalendarBlankIcon}
				value={value || null}
				placeholder={placeholder ?? "Escolher"}
				error={error}
				onPress={show}
			/>
			{/* Always mounted on iOS, so the sheet slides down when it closes. */}
			{Platform.OS === "ios" ? (
				<IosPickerSheet
					open={open}
					title={label}
					initial={current}
					mode={mode}
					minimumDate={minimumDate}
					maximumDate={maximumDate}
					onClose={() => setOpen(false)}
					onPick={(date) => onChange(toText(date, mode))}
				/>
			) : null}
		</View>
	);
}
