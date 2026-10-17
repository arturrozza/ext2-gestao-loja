# Entradas de estoque (compras)

- **Status:** rascunho
- **Responsável:**
- **Última atualização:** 2026-10-17
- **Casos de uso:** UC09 (expandido)

## Objetivo

Registrar as compras de mercadoria para manter a quantidade em estoque e o **custo médio** corretos, que são a base do
lucro real.

## Requisitos funcionais

- [ ] RF020 — Cadastrar entradas de produtos no estoque.
- [ ] RF021 — Selecionar o produto da entrada.
- [ ] RF022 — Informar os dados básicos da entrada.
- [ ] RF023 — Registrar cada entrada como movimentação no histórico do produto.
- [ ] RF024 — Atualizar automaticamente a quantidade após a entrada.
- [ ] RF025 — Recalcular automaticamente o custo médio após a entrada.
- [ ] RF026 — Consultar o histórico de entradas.
- [ ] RF027 — Visualizar os detalhes de uma entrada.
- [ ] RF091 *(proposto)* — Corrigir entradas por movimentações de ajuste ou estorno.

## Regras de negócio

- RN009 — A entrada é vinculada a um produto ativo.
- RN010 — Quantidade > 0; custo unitário ≥ 0.
- RN011 — A entrada aumenta a quantidade disponível do produto.
- RN012 — Cada entrada gera uma movimentação no histórico.
- RN013 — Quando houver validade, ela é registrada no lote da entrada.
- RN014 — O custo médio é recalculado após cada entrada.
- RN015 — Fórmula do custo médio (ver [`domain.md`](../domain.md#custo-médio-rn014rn017)).
- RN016 — Sem estoque anterior, custo médio = custo unitário da primeira entrada.
- RN017 — Saídas por venda não recalculam o custo médio.
- RN042 / RN045 / RN046 — Entrada não é excluída; correção é por ajuste ou estorno, preservando os dados originais.

Não funcionais: RNF007 (atomicidade), RNF008, RNF009.

## Fora do escopo

- Fornecedores, pedidos de compra, contas a pagar.
- Rateio de frete da compra no custo unitário (o usuário informa o custo unitário já com frete, se quiser).

## Fluxos / telas

Pela decisão D03 (proposta), a entrada é uma **compra** com um ou mais itens.

**UC09 — Registrar entrada (fluxo principal).**

1. Usuário abre "Nova compra" → app mostra data (padrão hoje) e observações.
2. Seleciona um produto ativo → app mostra quantidade atual e custo médio atual.
3. Informa quantidade, custo unitário e, se o produto controla validade, a validade do lote → app valida RN010.
4. Repete 2–3 para outros produtos.
5. Confirma → o sistema registra a compra, gera um lote e uma movimentação de entrada por item e recalcula o custo
   médio de cada produto. Ou grava tudo, ou nada.
6. App mostra a nova quantidade e o novo custo médio de cada produto.

**Alternativos.**
- 2a. Produto inativo: não aparece no seletor (RN008, RN009).
- 3a. Quantidade ≤ 0 ou custo negativo: rejeitado com mensagem de correção (RN010).
- 3b. Produto controla validade e a validade não foi informada: rejeitado (ver dúvidas).
- 5a. Produto sem estoque: custo médio = custo unitário (RN016).
- 5b. Falha na gravação: nada é gravado (RNF007).
- O mesmo produto duas vezes na compra (ex.: validades diferentes) gera dois lotes; o custo médio é aplicado item a
  item, na ordem.

**Histórico (RF026, RF027).** Lista de compras por data (mais recente primeiro) com total e número de itens; detalhe
com itens, lotes gerados e situação.

## Dados

| Entidade | Campo | Tipo | Obrigatório | Validação |
| --- | --- | --- | --- | --- |
| Compra | data | data | sim | não futura |
| Compra | observações | texto | não | |
| Compra | situação | concluída/cancelada | sim | |
| Item | produto | ref. | sim | ativo (RN009) |
| Item | quantidade | inteiro | sim | > 0 (RN010) |
| Item | custo unitário | dinheiro | sim | ≥ 0 (RN010) |
| Item | validade | data | se o produto controla validade | |

Cada item gera um **lote** (quantidade inicial = disponível = quantidade do item) e uma **movimentação** de entrada
(origem: compra). Ver [`domain.md`](../domain.md).

## API

A definir na implementação.

## Critérios de aceite

- [ ] Dado produto com 10 un. a R$ 20,00, quando entram 10 un. a R$ 30,00, então fica com 20 un. e custo médio
      R$ 25,00.
- [ ] Dado produto sem estoque, quando entram 5 un. a R$ 12,00, então o custo médio é R$ 12,00.
- [ ] Dada uma entrada, então existe um lote e uma movimentação de entrada com quantidade, data e origem "compra".
- [ ] Dada quantidade 0 ou custo −1, então a entrada é rejeitada com mensagem em pt-BR.
- [ ] Dado produto inativo, então a entrada é rejeitada.
- [ ] Dada falha ao gravar o segundo item, então nem a compra nem o primeiro item ficam gravados.

## Dúvidas em aberto

- D03 (compra com itens) e D06 (lote para todos), em
  [`product.md`](../product.md#decisões-pendentes-transversais).
- **Cancelar uma compra:** o modelo conceitual tem situação e data de cancelamento na compra. Se os lotes já tiveram
  saída, pode cancelar? Proposta: só cancela se todos os lotes da compra estão intactos (disponível = inicial); senão,
  corrige com ajuste. E o custo médio volta ao anterior? (Proposta: recalcular removendo a entrada, só nesse caso.)
- **Corrigir** custo unitário digitado errado: cancelar e lançar de novo, ou permitir edição com estorno?
- Validade obrigatória quando o produto controla validade?
- Data da compra pode ser retroativa? Se sim, o custo médio considera a ordem de registro, não a data (proposta).
