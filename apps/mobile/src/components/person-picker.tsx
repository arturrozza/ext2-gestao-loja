import { PlusIcon } from "phosphor-react-native/src/icons/Plus";
import { type ReactNode, useEffect, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { PersonAvatar } from "@/components/person-avatar";
import { Radio } from "@/components/radio";
import { SearchField } from "@/components/search-field";
import { SheetModal } from "@/components/sheet-modal";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { hapticSelect, hapticTap, withHaptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";

export type PickablePerson = {
	id: string;
	name: string;
	detail?: string | null;
};

function PersonOption({
	person,
	selected,
	onPick,
}: {
	person: PickablePerson;
	selected: boolean;
	onPick: () => void;
}) {
	return (
		<Pressable
			onPress={withHaptic(hapticSelect, onPick)}
			accessibilityRole="radio"
			accessibilityState={{ selected }}
			accessibilityLabel={person.name}
			className={cn(
				"flex-row items-center gap-3.5 rounded-xl px-3 py-3",
				// In a sheet the surfaces swap: `bg-background` is the light gray tile on the white sheet.
				selected ? "bg-primary/10" : "bg-background active:bg-accent",
			)}
		>
			<PersonAvatar name={person.name} />
			<View className="flex-1 gap-1">
				<Text
					className={cn(
						"text-[15px]",
						selected ? "font-sans-semibold" : "font-sans-medium",
					)}
					numberOfLines={1}
				>
					{person.name}
				</Text>
				{person.detail ? (
					<Text className="text-muted-foreground text-xs" numberOfLines={1}>
						{person.detail}
					</Text>
				) : null}
			</View>
			<Radio on={selected} />
		</Pressable>
	);
}

/**
 * Full sheet to pick a customer or reseller: search, the list with avatars and a radio on the chosen one, and a way to
 * register someone new from the "+" in the header, in a sheet over it (`renderNew` draws that form).
 */
export function PersonPicker({
	open,
	onClose,
	title,
	searchPlaceholder,
	search,
	onSearchChange,
	people,
	hasMore = false,
	selectedId,
	onPick,
	newLabel,
	renderNew,
}: {
	open: boolean;
	onClose: () => void;
	title: string;
	searchPlaceholder: string;
	search: string;
	onSearchChange: (text: string) => void;
	people: PickablePerson[];
	hasMore?: boolean;
	selectedId: string | null;
	onPick: (person: PickablePerson) => void;
	newLabel: string;
	renderNew: (done: () => void) => ReactNode;
}) {
	const [adding, setAdding] = useState(false);
	// Picking (or registering) closes the picker: the new-person sheet goes with it.
	useEffect(() => {
		if (!open) setAdding(false);
	}, [open]);

	return (
		<SheetModal
			open={open}
			onClose={onClose}
			title={title}
			headerLeft={
				<Pressable
					onPress={withHaptic(hapticTap, () => setAdding(true))}
					accessibilityRole="button"
					accessibilityLabel={newLabel}
					hitSlop={8}
					className="h-12 w-12 items-center justify-center rounded-full bg-primary active:bg-primary/90"
				>
					<Icon as={PlusIcon} size={22} className="text-primary-foreground" />
				</Pressable>
			}
		>
			<ScrollView
				keyboardShouldPersistTaps="handled"
				keyboardDismissMode="on-drag"
				showsVerticalScrollIndicator={false}
				contentContainerClassName="gap-3 px-5 pb-10"
			>
				<SearchField
					value={search}
					onChangeText={onSearchChange}
					placeholder={searchPlaceholder}
				/>
				<View className="gap-2">
					{people.map((person) => (
						<PersonOption
							key={person.id}
							person={person}
							selected={person.id === selectedId}
							onPick={() => onPick(person)}
						/>
					))}
				</View>
				{hasMore ? (
					<Text className="px-1 text-muted-foreground text-xs">
						Tem mais: digite o nome para encontrar.
					</Text>
				) : null}
			</ScrollView>
			{/* The new person opens in a sheet of its own, over the picker. */}
			<SheetModal
				open={adding}
				onClose={() => setAdding(false)}
				title={newLabel}
			>
				<ScrollView
					keyboardShouldPersistTaps="handled"
					showsVerticalScrollIndicator={false}
					contentContainerClassName="px-5 pb-10"
				>
					<View className="gap-4">{renderNew(() => setAdding(false))}</View>
				</ScrollView>
			</SheetModal>
		</SheetModal>
	);
}
