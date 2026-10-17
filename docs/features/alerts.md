# Alertas

- **Status:** rascunho
- **Responsável:**
- **Última atualização:** 2026-10-17
- **Casos de uso:** UC18

## Objetivo

Avisar o lojista antes do prejuízo: falta de produto, vencimento, venda com margem ruim e produto encalhado.

## Requisitos funcionais

- [ ] RF084 — Alerta de estoque baixo.
- [ ] RF085 — Alerta de produto próximo do vencimento.
- [ ] RF086 — Alerta de produto vencido.
- [ ] RF087 — Alerta de baixa margem.
- [ ] RF088 — Alerta de produto parado há muito tempo sem venda.
- [ ] RF089 — Alerta de margem negativa.
- [ ] RF099 *(proposto)* — Configurar quantidade mínima, antecedência de vencimento e período de produto parado.

## Regras de negócio

- RN022 — Estoque baixo: quantidade ≤ mínima.
- RN026 — Lote vencido: validade anterior a hoje.
- RN027 — Próximo do vencimento: dentro da antecedência configurada.
- RN028 — Produto sem controle de validade não gera alerta de vencimento.
- RN041 — Margem negativa: lucro real < 0.
- RN050 — Só dados da loja do usuário autenticado.
- RN053 — Produto parado: sem vendas no período configurado.
- RN054 — Um produto pode ter vários alertas ao mesmo tempo.
- RN055 — Resolvida a condição, o alerta deixa de aparecer como ativo.

## Fora do escopo

- Push notification e e-mail (os alertas aparecem dentro do app).
- Marcar alerta como lido/dispensado (ver dúvidas).

## Fluxos / telas

**UC18 — Visualizar alertas.** Central de alertas (sino com contador no topo do app), agrupada por tipo, cada alerta
com o produto, o motivo e um atalho (ex.: estoque baixo → nova compra; vencido → ajuste). Os mesmos alertas aparecem
como selos na lista de produtos e no estoque.

Alertas são **calculados na hora** a partir dos dados (não há entidade Alerta), o que garante RN055 sem esforço: se a
condição sumiu, o alerta sumiu.

| Alerta | Condição | Parâmetro |
| --- | --- | --- |
| Estoque baixo | produto ativo com quantidade ≤ mínima | mínima por produto |
| Próximo do vencimento | lote com saldo e hoje ≤ validade ≤ hoje + antecedência | antecedência (padrão 30 dias) |
| Vencido | lote com saldo e validade < hoje | — |
| Baixa margem | produto ativo com 0 ≤ margem < limite nas vendas da janela | limite (padrão 10%), janela (ver dúvidas) |
| Margem negativa | produto com margem < 0 na janela; e cada venda com lucro < 0 | — |
| Produto parado | produto ativo, com saldo, sem venda concluída há mais de N dias | N (padrão 60 dias) |

Margem do produto: [`domain.md`](../domain.md#margem-de-um-produto-relatórios-e-alertas).

Configurações (D09) ficam na tela da loja: antecedência de vencimento, dias para produto parado, limite de baixa
margem. A quantidade mínima fica no cadastro do produto.

## Dados

| Configuração | Tipo | Padrão | Validação |
| --- | --- | --- | --- |
| antecedência de vencimento | inteiro (dias) | 30 | 1–365 |
| período de produto parado | inteiro (dias) | 60 | 1–365 |
| limite de baixa margem | percentual | 10 | 0–100 |

## API

A definir na implementação.

## Critérios de aceite

- [ ] Dado produto com mínimo 5 e saldo 5, então há alerta de estoque baixo; após entrada de 1 un., o alerta some.
- [ ] Dado lote com saldo e validade ontem, então há alerta de vencido; após ajuste zerando o lote, o alerta some.
- [ ] Dado lote vencido com saldo 0, então não há alerta.
- [ ] Dado produto sem controle de validade, então nunca há alerta de vencimento.
- [ ] Dado produto com estoque baixo e lote vencido, então aparecem os dois alertas (RN054).
- [ ] Dada antecedência alterada de 30 para 7 dias, então lotes a 10 dias do vencimento deixam de alertar.
- [ ] Dada venda com lucro negativo, então aparece alerta de margem negativa ligado à venda.

## Dúvidas em aberto

- D09 (parâmetros configuráveis), em [`product.md`](../product.md#decisões-pendentes-transversais).
- **Janela da margem:** baixa margem/margem negativa por produto considera quais vendas? Todas, ou os últimos N dias
  (proposta: mesmo período de "produto parado")?
- **Alerta de margem negativa é por venda ou por produto?** RF089 fala em produto; o UC12 (9a) gera alerta ao
  registrar uma venda com lucro negativo. Proposta: os dois.
- **Produto parado que nunca vendeu:** contar a partir da primeira entrada (proposta) ou da data de cadastro? Produto
  sem saldo não deve ser "parado" (proposta).
- Precisa dispensar/silenciar um alerta, ou ele só some quando a condição muda?
