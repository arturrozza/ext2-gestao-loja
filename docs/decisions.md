# Decisões

> Registro curto do que foi decidido e por quê, a mais recente no topo. Vale para produto (regras de negócio) e para
> decisões técnicas que não ficam óbvias lendo o código. Quando uma decisão mudar, edite a entrada e diga o que mudou.

Formato:

```md
## AAAA-MM-DD: <título curto>

**Decisão:** o que foi decidido.
**Por quê:** o motivo, e as alternativas descartadas quando ajudar.
```

## 2026-11-04: Regras do produto revisadas com base na EXT1

**Decisão:** os nove módulos, as funcionalidades e as regras foram revisados um a um e estão em
[`product/`](product/README.md), que é a fonte da verdade. Os principais pontos que mudaram em relação à EXT1:

- Mercado Livre sem integração, só como canal manual, com taxa sugerida.
- Novo módulo Clientes, a confirmar com o cliente.
- Estoque sem tela própria, dentro de Produtos.
- Estoque e custo só entram pela compra, nunca no cadastro.
- Unidades vencidas não entram na venda.
- O desconto conta uma vez só no lucro real.
- Códigos RF/RN abandonados.

**Por quê:**

- **Mercado Livre:** a importação não compensa agora, e a venda manual já cobre o canal.
- **Clientes:** é central no Pedido OK, que o cliente usa hoje.
- **Estoque em Produtos:** duas telas mostrariam a mesma lista.
- **Estoque e custo pela compra:** o Pedido OK deixa editar estoque e custo no produto, e isso foi descartado para toda
  unidade ter origem registrada e o custo médio ficar correto.
- **Vencidos:** a saída pela validade mais próxima (RN025) entregaria justamente o produto vencido.
- **Desconto:** o RN040 subtraía de novo o que o RN035 já tirava da receita.
- **Códigos:** muita regra mudou e eles ficariam confusos.

## 2026-11-04: Auditoria e integridade como regra geral

**Decisão:** nada se apaga nem se reescreve, todo registro guarda autor e data, operações são atômicas, o banco também
recusa estoque negativo, e as movimentações de estoque são um ledger imutável com quantidade, custo e custo médio
resultante.
**Por quê:** erros de estoque e custo contaminam o lucro de tudo o que vem depois, então precisam ser rastreáveis e
recalculáveis.

## 2026-11-04: Continuar online-first, com uma loja e dados separados por loja

**Decisão:** sem offline no MVP. Toda tabela de negócio tem `store_id`, e o banco permite vários usuários por loja, mas o
app começa com uma loja, sem troca de loja nem cadastro.
**Por quê:** a internet quase não cai e há dados móveis, e offline exigiria banco local e sincronização. Se a falta de
internet virar problema real, dá para acrescentar uma fila de vendas sem reescrever o app. Separar os dados por loja custa
pouco agora; o caro é a parte de produto, que fica para depois.

## 2026-11-04: Subir para o Expo SDK 58 sem suporte oficial do NativeWind

**Decisão:** o app foi para o SDK 58 (RN 0.88, React 19.3), mantendo o NativeWind 4.2.7, que só declara suporte até o
SDK 57.
**Por quê:** o Expo Go novo só roda o SDK 58, e o ciclo de vida por cenas do iOS 27 vem nele, então a subida viria de
qualquer jeito. Migrar para o NativeWind 5 foi descartado: ainda é RC e exige Tailwind 4. As telas foram conferidas no
Expo Go e funcionaram. Builds nativos do SDK 58 (EAS, com R8 ligado por padrão no Android) ainda não foram testados.

## 2026-11-04: Design system do app com React Native Reusables

**Decisão:** os componentes base do app vêm do React Native Reusables (estilo shadcn/ui, variante NativeWind), copiados
para `src/components/ui`. O visual segue uma referência enviada pelo mantenedor: fundo branco, superfícies cinza claro
preenchidas, ações em laranja (`#EA580C`), destaques em preto, sem sombras, controles totalmente arredondados, header
e navbar customizados, animações suaves sem bounce, só tema claro, fonte Plus Jakarta Sans.
**Por quê:** o Reusables é a única opção que encaixa no NativeWind 4 + Tailwind 3 sem migração, e os componentes ficam
no repo, sem lib em runtime. O gluestack-ui v5 exige Tailwind 4 (NativeWind 5, ainda pre-release, ou Uniwind). O
`@expo/ui` usa componentes nativos (SwiftUI/Compose), que quase não aceitam estilo com Tailwind: fica para casos
pontuais. No visual, as tentativas sem referência não agradaram: paleta toda neutra (sem vida), violeta (não pegou bem),
laranja com sombras e pílulas (cara de "AI slop"). O terracota da referência foi testado, mas o mantenedor
preferiu manter o laranja e o arredondado total: as cores principais são branco, laranja e preto. Dark mode fica para depois.

## 2026-11-03: Regras de negócio entram aos poucos

**Decisão:** os docs de produto antigos saíram do repo. As regras passam a vir do mantenedor. **Mudou em 2026-11-04:** os
docs de produto voltaram, reescritos e enxutos, em [`product/`](product/README.md), para um agente sem contexto entender o
sistema. As regras não óbvias continuam sendo confirmadas com o mantenedor.
**Por quê:** os docs antigos estavam poluídos, com conflitos e lacunas em aberto.
