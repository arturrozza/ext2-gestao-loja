import { TabList, TabSlot, Tabs, TabTrigger } from "expo-router/ui";
import { MockTabBar } from "@/components/mock-tab-bar";

export default function MockTabsLayout() {
	return (
		<Tabs>
			<TabSlot />
			<MockTabBar />
			<TabList style={{ display: "none" }}>
				<TabTrigger name="dashboard" href="/mock/dashboard" />
				<TabTrigger name="sales" href="/mock/sales" />
				<TabTrigger name="stock" href="/mock/stock" />
				<TabTrigger name="more" href="/mock/more" />
			</TabList>
		</Tabs>
	);
}
