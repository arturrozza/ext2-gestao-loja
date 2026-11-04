import { ArrowsClockwiseIcon } from "phosphor-react-native/src/icons/ArrowsClockwise";
import { LinkSimpleIcon } from "phosphor-react-native/src/icons/LinkSimple";
import { ShoppingBagIcon } from "phosphor-react-native/src/icons/ShoppingBag";
import { View } from "react-native";
import { DetailLine } from "@/components/detail-line";
import { Price } from "@/components/price";
import { ScreenHeader } from "@/components/screen-header";
import { ScreenLayout } from "@/components/screen-layout";
import { SectionTitle } from "@/components/section-title";
import { StatusPill } from "@/components/status-pill";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { formatBRL, MOCK_ML } from "@/lib/mock-erp-data";

type PendingOrder = (typeof MOCK_ML.pending)[number];

function AccountCard() {
	return (
		<View className="gap-4 rounded-3xl bg-secondary p-5">
			<View className="flex-row items-center gap-3">
				<View className="h-12 w-12 items-center justify-center rounded-2xl bg-secondary-foreground/10">
					<Icon
						as={ShoppingBagIcon}
						size={22}
						className="text-secondary-foreground"
					/>
				</View>
				<View className="flex-1">
					<Text className="font-sans-semibold text-secondary-foreground">
						{MOCK_ML.nickname}
					</Text>
					<Text className="text-secondary-foreground/60 text-sm">
						Conectada · sincronizou {MOCK_ML.lastSync}
					</Text>
				</View>
			</View>
			<View className="flex-row gap-2">
				<Button className="flex-1 bg-primary">
					<Icon
						as={ArrowsClockwiseIcon}
						size={16}
						className="text-primary-foreground"
					/>
					<Text>Sincronizar</Text>
				</Button>
				<Button className="flex-1 bg-secondary-foreground/10 active:bg-secondary-foreground/20">
					<Text className="text-secondary-foreground">Desconectar</Text>
				</Button>
			</View>
		</View>
	);
}

function PendingCard({ order }: { order: PendingOrder }) {
	return (
		<View className="gap-3 rounded-3xl border border-border p-4">
			<View className="flex-row items-start justify-between gap-3">
				<View className="flex-1 gap-1">
					<Text className="font-sans-medium">{order.title}</Text>
					<Text className="text-muted-foreground text-xs">
						Pedido {order.id} · {order.buyer}
					</Text>
				</View>
				<StatusPill label="Sem produto" tone="highlight" />
			</View>
			<View className="gap-2 rounded-2xl bg-card p-3">
				<DetailLine
					label={`${order.quantity}× ${formatBRL(order.price)}`}
					value={formatBRL(order.quantity * order.price)}
				/>
				<DetailLine
					label="Tarifa do Mercado Livre"
					value={`− ${formatBRL(order.fee)}`}
				/>
			</View>
			<Button variant="outline" size="sm">
				<Icon as={LinkSimpleIcon} size={16} />
				<Text>Associar a um produto</Text>
			</Button>
		</View>
	);
}

export function MockMercadoLivreScreen() {
	return (
		<ScreenLayout header={<ScreenHeader title="Mercado Livre" />}>
			<AccountCard />
			<View className="flex-row gap-3">
				<View className="flex-1 gap-1 rounded-2xl bg-card p-4">
					<Text className="text-muted-foreground text-xs">
						Importadas no mês
					</Text>
					<Text className="font-sans-semibold">
						{MOCK_ML.importedThisMonth} vendas
					</Text>
				</View>
				<View className="flex-1 gap-1 rounded-2xl bg-card p-4">
					<Text className="text-muted-foreground text-xs">
						Lucro real no canal
					</Text>
					<Price value={695.4} className="text-base" />
				</View>
			</View>
			<View className="gap-3">
				<SectionTitle title="Pedidos esperando associação" />
				<Text className="-mt-1 text-muted-foreground text-sm">
					O estoque só baixa depois que o item do anúncio é ligado a um produto
					da loja.
				</Text>
				{MOCK_ML.pending.map((order) => (
					<PendingCard key={order.id} order={order} />
				))}
			</View>
		</ScreenLayout>
	);
}
