import { TabList, TabSlot, Tabs, TabTrigger } from "expo-router/ui";
import { TABS, TabBar } from "@/components/tab-bar";

export default function TabsLayout() {
	return (
		<Tabs>
			<TabSlot />
			<TabBar />
			<TabList style={{ display: "none" }}>
				{TABS.map((tab) => (
					<TabTrigger key={tab.name} name={tab.name} href={tab.href} />
				))}
			</TabList>
		</Tabs>
	);
}
