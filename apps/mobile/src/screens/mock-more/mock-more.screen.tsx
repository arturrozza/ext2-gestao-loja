import { type Href, Link } from "expo-router";
import {
	Bell,
	ChartColumn,
	ChevronRight,
	type LucideIcon,
	Palette,
	ShoppingBag,
	Truck,
	Users,
} from "lucide-react-native";
import { Pressable, View } from "react-native";
import { ScreenHeader } from "@/components/screen-header";
import { ScreenLayout } from "@/components/screen-layout";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { MOCK_ALERTS, MOCK_RESELLERS } from "@/lib/mock-erp-data";

type Item = {
	href: Href;
	icon: LucideIcon;
	title: string;
	subtitle: string;
	badge?: number;
};

const SECTIONS: { title: string; items: Item[] }[] = [
	{
		title: "Gestão",
		items: [
			{
				href: "/mock/reports",
				icon: ChartColumn,
				title: "Relatórios",
				subtitle: "Lucro, custos, canais e produtos",
			},
			{
				href: "/mock/alerts",
				icon: Bell,
				title: "Alertas",
				subtitle: "Estoque, validade e margem",
				badge: MOCK_ALERTS.length,
			},
			{
				href: "/mock/resellers",
				icon: Users,
				title: "Revendedoras",
				subtitle: `${MOCK_RESELLERS.length} ativas · comissões e acertos`,
			},
			{
				href: "/mock/purchases",
				icon: Truck,
				title: "Compras",
				subtitle: "Entradas de estoque e custo médio",
			},
		],
	},
	{
		title: "Integrações",
		items: [
			{
				href: "/mock/mercado-livre",
				icon: ShoppingBag,
				title: "Mercado Livre",
				subtitle: "Conta conectada · 2 pedidos pendentes",
			},
		],
	},
	{
		title: "App",
		items: [
			{
				href: "/design-system",
				icon: Palette,
				title: "Design system",
				subtitle: "Componentes e estilos",
			},
		],
	},
];

function MenuRow({ item }: { item: Item }) {
	return (
		<Link href={item.href} asChild>
			<Pressable className="flex-row items-center gap-3 rounded-3xl border border-border bg-background p-3 active:bg-card">
				<View className="h-12 w-12 items-center justify-center rounded-2xl bg-card">
					<Icon as={item.icon} size={20} />
				</View>
				<View className="flex-1 gap-0.5">
					<Text className="font-sans-medium">{item.title}</Text>
					<Text className="text-muted-foreground text-xs" numberOfLines={1}>
						{item.subtitle}
					</Text>
				</View>
				{item.badge ? (
					<View className="h-6 min-w-6 items-center justify-center rounded-full bg-primary px-2">
						<Text className="font-sans-semibold text-primary-foreground text-xs">
							{item.badge}
						</Text>
					</View>
				) : null}
				<Icon as={ChevronRight} size={18} className="text-muted-foreground" />
			</Pressable>
		</Link>
	);
}

export function MockMoreScreen() {
	return (
		<ScreenLayout
			bottom="tabs"
			header={<ScreenHeader variant="large" title="Mais" />}
		>
			<View className="flex-row items-center gap-3 rounded-3xl bg-card p-4">
				<View className="h-14 w-14 items-center justify-center rounded-full bg-secondary">
					<Text className="font-sans-semibold text-secondary-foreground">
						MM
					</Text>
				</View>
				<View className="flex-1">
					<Text className="font-sans-semibold">Mundo Madam Cosméticos</Text>
					<Text className="text-muted-foreground text-sm">
						gugel@loja · Plano único
					</Text>
				</View>
			</View>
			{SECTIONS.map((section) => (
				<View key={section.title} className="gap-3">
					<Text className="px-1 font-sans-medium text-muted-foreground text-sm">
						{section.title}
					</Text>
					{section.items.map((item) => (
						<MenuRow key={item.title} item={item} />
					))}
				</View>
			))}
		</ScreenLayout>
	);
}
