import { FunnelSimpleIcon } from "phosphor-react-native/src/icons/FunnelSimple";
import { XIcon } from "phosphor-react-native/src/icons/X";
import { type ReactNode, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { BottomSheet } from "@/components/bottom-sheet";
import { IconButton } from "@/components/icon-button";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { hapticSelect, hapticTap, withHaptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";

/** One filter of a list: its options, what's selected and what's selected when not filtering. */
export type FilterGroup = {
	key: string;
	title: string;
	options: readonly { value: string; label: string }[];
	multiple: boolean;
	values: readonly string[];
	defaultValues: readonly string[];
	onChange: (values: string[]) => void;
	/** Text of the active pill, when the option's label isn't enough (a custom date range). */
	activeLabel?: string;
};

type GroupOptions<T extends string> = {
	key: string;
	title: string;
	options: readonly { value: T; label: string }[];
};

/** One choice at a time (a period). Clearing it goes back to `defaultValue`. */
export function filterGroup<T extends string>(
	group: GroupOptions<T> & {
		value: T;
		defaultValue: T;
		onChange: (value: T) => void;
		activeLabel?: string;
	},
): FilterGroup {
	return {
		...group,
		multiple: false,
		values: [group.value],
		defaultValues: [group.defaultValue],
		// The sheet only ever hands back values from `options` or the default.
		onChange: (values) =>
			group.onChange((values[0] ?? group.defaultValue) as T),
	};
}

/** Any number of choices (categories); none selected means no filter. */
export function multiFilterGroup<T extends string>(
	group: GroupOptions<T> & {
		values: readonly T[];
		onChange: (values: T[]) => void;
	},
): FilterGroup {
	return {
		...group,
		multiple: true,
		defaultValues: [],
		// The sheet only ever hands back values from `options`.
		onChange: (values) => group.onChange(values as T[]),
	};
}

const activeValues = (group: FilterGroup) =>
	group.values.filter((value) => !group.defaultValues.includes(value));

function toggled(
	group: FilterGroup,
	current: readonly string[],
	value: string,
) {
	if (current.includes(value)) {
		const rest = current.filter((other) => other !== value);
		return rest.length > 0 ? rest : [...group.defaultValues];
	}
	return group.multiple ? [...current, value] : [value];
}

function sameValues(a: readonly string[], b: readonly string[]) {
	return a.length === b.length && a.every((value) => b.includes(value));
}

type Draft = Record<string, readonly string[]>;

const valuesOf = (groups: FilterGroup[]): Draft =>
	Object.fromEntries(groups.map((group) => [group.key, group.values]));

function FilterChips({
	group,
	selected,
	onToggle,
}: {
	group: FilterGroup;
	selected: readonly string[];
	onToggle: (value: string) => void;
}) {
	return (
		<View className="flex-row flex-wrap gap-2">
			{group.options.map((option) => {
				const on = selected.includes(option.value);
				return (
					<Pressable
						key={option.value}
						onPress={withHaptic(hapticSelect, () => onToggle(option.value))}
						accessibilityRole={group.multiple ? "checkbox" : "radio"}
						accessibilityState={{ checked: on }}
						className={cn(
							"h-9 justify-center rounded-full px-3.5",
							on ? "bg-primary" : "bg-field active:bg-accent",
						)}
					>
						<Text
							className={cn("text-[13px]", on && "text-primary-foreground")}
						>
							{option.label}
						</Text>
					</Pressable>
				);
			})}
		</View>
	);
}

/**
 * Filter button and its bottom sheet. Choices stay in a draft until "Ver resultados"; canceling or tapping outside drops
 * them. Tapping a selected option clears it. `field` sits beside a search field; `icon` goes in a header. `children` adds
 * controls under the groups: they get a way to close the sheet and the draft values.
 */
export function FilterControl({
	groups,
	variant = "field",
	children,
}: {
	groups: FilterGroup[];
	variant?: "field" | "icon";
	children?: (close: () => void, draft: Draft) => ReactNode;
}) {
	const [open, setOpen] = useState(false);
	const [draft, setDraft] = useState<Draft>({});
	const close = () => setOpen(false);
	const active = groups.some((group) => activeValues(group).length > 0);
	const show = () => {
		setDraft(valuesOf(groups));
		setOpen(true);
	};
	const apply = () => {
		for (const group of groups) {
			const values = draft[group.key];
			if (values && !sameValues(values, group.values)) {
				group.onChange([...values]);
			}
		}
		close();
	};

	return (
		<>
			{variant === "field" ? (
				<Pressable
					onPress={withHaptic(hapticTap, show)}
					accessibilityRole="button"
					accessibilityLabel="Filtros"
					className="h-12 w-12 items-center justify-center rounded-[8px] bg-background active:bg-accent"
				>
					<Icon as={FunnelSimpleIcon} size={20} />
					{active ? (
						<View className="absolute top-2.5 right-2.5 h-2 w-2 rounded-full bg-primary" />
					) : null}
				</Pressable>
			) : (
				<IconButton
					icon={FunnelSimpleIcon}
					label="Filtros"
					dot={active}
					onPress={show}
				/>
			)}
			<BottomSheet open={open} onClose={close} title="Filtros" dragFromTop>
				<ScrollView
					className="max-h-[420px]"
					keyboardShouldPersistTaps="handled"
					showsVerticalScrollIndicator={false}
					contentContainerClassName="gap-5 px-3 pt-2 pb-4"
				>
					{groups
						.filter((group) => group.options.length > 0)
						.map((group) => (
							<View key={group.key} className="gap-2.5">
								<Text className="font-sans-medium text-muted-foreground text-sm">
									{group.title}
								</Text>
								<FilterChips
									group={group}
									selected={draft[group.key] ?? group.values}
									onToggle={(value) =>
										setDraft((current) => ({
											...current,
											[group.key]: toggled(
												group,
												current[group.key] ?? group.values,
												value,
											),
										}))
									}
								/>
							</View>
						))}
					{children?.(close, draft)}
				</ScrollView>
				<View className="gap-2 px-3 pt-3 pb-1">
					<Button onPress={apply}>
						<Text>Ver resultados</Text>
					</Button>
					<Button variant="ghost" onPress={close}>
						<Text>Cancelar</Text>
					</Button>
				</View>
			</BottomSheet>
		</>
	);
}

function pillLabel(group: FilterGroup, value: string) {
	return (
		group.activeLabel ??
		group.options.find((option) => option.value === value)?.label ??
		""
	);
}

/** Small pills with only the filters in use. Tapping one removes that choice. Nothing shows while none is on. */
export function ActiveFilters({ groups }: { groups: FilterGroup[] }) {
	const pills = groups.flatMap((group) =>
		activeValues(group).map((value) => ({ group, value })),
	);
	if (pills.length === 0) return null;

	return (
		<ScrollView
			horizontal
			showsHorizontalScrollIndicator={false}
			className="-mx-5"
			contentContainerClassName="gap-1.5 px-5"
		>
			{pills.map(({ group, value }) => {
				const label = pillLabel(group, value);
				return (
					<Pressable
						key={`${group.key}-${value}`}
						onPress={withHaptic(hapticTap, () =>
							group.onChange(toggled(group, group.values, value)),
						)}
						accessibilityRole="button"
						accessibilityLabel={`Remover filtro ${label}`}
						hitSlop={6}
						className="h-7 flex-row items-center gap-1 rounded-full bg-primary/10 pr-2 pl-2.5 active:bg-primary/20"
					>
						<Text className="font-sans-medium text-primary text-xs">
							{label}
						</Text>
						<Icon as={XIcon} size={12} className="text-primary" />
					</Pressable>
				);
			})}
		</ScrollView>
	);
}
