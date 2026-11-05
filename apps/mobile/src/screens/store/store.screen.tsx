import { Link } from "expo-router";
import { KeyIcon } from "phosphor-react-native/src/icons/Key";
import { SignOutIcon } from "phosphor-react-native/src/icons/SignOut";
import { UsersIcon } from "phosphor-react-native/src/icons/Users";
import { useState } from "react";
import { Pressable } from "react-native";
import { InfoRow } from "@/components/info-row";
import { ListCard, ListRow } from "@/components/list-card";
import { QueryView } from "@/components/query-states";
import { ScreenHeader } from "@/components/screen-header";
import { ScreenLayout } from "@/components/screen-layout";
import { RowsSkeleton } from "@/components/skeleton";
import { Text } from "@/components/ui/text";
import { hapticTap } from "@/lib/haptics";
import { formatPercent } from "@/lib/money";
import { useSession } from "@/queries/auth/use-auth";
import { useStoreProfile, useStoreSettings } from "@/queries/store/use-store";
import { SignOutSheet } from "./partials/sign-out-sheet";

function EditLink({ href }: { href: "/store/edit" | "/store/settings" }) {
	return (
		<Link href={href} asChild>
			<Pressable onPress={hapticTap} hitSlop={8} accessibilityRole="button">
				<Text className="font-sans-medium text-primary text-sm">Editar</Text>
			</Pressable>
		</Link>
	);
}

function StoreData() {
	const query = useStoreProfile();
	return (
		<QueryView query={query} skeleton={<RowsSkeleton rows={4} />}>
			{(store) => (
				<ListCard
					title="Dados da loja"
					action={<EditLink href="/store/edit" />}
				>
					<InfoRow label="Nome" value={store.name} />
					<InfoRow label="Documento" value={store.document} />
					<InfoRow label="Telefone" value={store.phone} />
					<InfoRow label="Endereço" value={store.address} />
				</ListCard>
			)}
		</QueryView>
	);
}

function StoreSettingsCard() {
	const query = useStoreSettings();
	return (
		<QueryView query={query} skeleton={<RowsSkeleton rows={5} />}>
			{(settings) => (
				<ListCard
					title="Configurações"
					action={<EditLink href="/store/settings" />}
				>
					<InfoRow
						label="Imposto padrão"
						value={formatPercent(settings.defaultTaxPercent)}
					/>
					<InfoRow
						label="Taxa do Mercado Livre"
						value={formatPercent(settings.mercadoLivreFeePercent)}
					/>
					<InfoRow
						label="Avisar vencimento"
						value={`${settings.expiryWarningDays} dias antes`}
					/>
					<InfoRow
						label="Período de análise"
						value={`últimos ${settings.staleProductDays} dias`}
					/>
					<InfoRow
						label="Margem baixa"
						value={`abaixo de ${formatPercent(settings.lowMarginPercent)}`}
					/>
				</ListCard>
			)}
		</QueryView>
	);
}

/** Store data, settings and the account (password, sign out). docs/product/acesso-e-loja.md. */
export function StoreScreen() {
	const session = useSession();
	const [signingOut, setSigningOut] = useState(false);

	return (
		<ScreenLayout header={<ScreenHeader title="Loja" />}>
			<StoreData />
			<StoreSettingsCard />
			<ListCard title="Conta">
				<InfoRow label="Usuário" value={session.data?.user.name} />
				<InfoRow label="E-mail" value={session.data?.user.email} />
				<ListRow title="Usuários" icon={UsersIcon} href="/store/users" />
				<ListRow title="Trocar senha" icon={KeyIcon} href="/store/password" />
				<ListRow
					title="Sair"
					icon={SignOutIcon}
					onPress={() => setSigningOut(true)}
				/>
			</ListCard>
			<SignOutSheet open={signingOut} onClose={() => setSigningOut(false)} />
		</ScreenLayout>
	);
}
