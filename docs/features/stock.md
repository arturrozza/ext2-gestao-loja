# Estoque

- **Status:** rascunho
- **Responsável:**
- **Última atualização:** 2026-10-17
- **Casos de uso:** UC10, UC11

## Objetivo

Mostrar o que há na loja, quanto vale e onde está, com histórico rastreável de toda mudança de quantidade, e permitir
correções manuais justificadas.

## Requisitos funcionais

- [ ] RF028 — Visualizar a quantidade atual de cada produto.
- [ ] RF029 — Visualizar o custo médio atual de cada produto.
- [ ] RF030 — Visualizar o valor total em estoque.
- [ ] RF031 — Consultar a localização física do produto.
- [ ] RF032 — Manter histórico de movimentações.
- [ ] RF033 — Consultar as movimentações de um produto.
- [ ] RF034 — Cadastrar ajustes de estoque.
- [ ] RF035 — Identificar produtos com estoque baixo.
- [ ] RF036 — Identificar produtos próximos do vencimento.
- [ ] RF037 — Identificar produtos vencidos.
- [ ] RF098 *(proposto)* — Controlar estoque por lote nos produtos com validade, priorizando a validade mais próxima.

## Regras de negócio

- RN018 — Toda alteração de quantidade gera uma movimentação.
- RN019 — A movimentação indica tipo, quantidade, data e origem.
- RN020 — Uma venda não pode deixar o estoque negativo.
- RN021 — Ajuste manual exige motivo.
- RN022 — Estoque baixo: quantidade ≤ quantidade mínima.
- RN023 — Valor em estoque = quantidade × custo médio.
- RN024 — Produtos com validade controlam quantidade por lote. *(D06: todos os produtos têm lote)*
- RN025 — Com vários lotes, sai primeiro a validade mais próxima (FEFO).
- RN026 — Lote vencido: validade anterior a hoje.
- RN027 — Lote próximo do vencimento: dentro da antecedência configurada.
- RN028 — Produto sem controle de validade não gera alerta de vencimento.
- RN046 — Correções de estoque são feitas por ajuste ou estorno.

Cálculos em [`domain.md`](../domain.md).

## Fora do escopo

- Inventário completo (contagem de todos os produtos de uma vez).
- Transferência entre locais/depósitos.

## Fluxos / telas

**UC10 — Consultar estoque e movimentações.**
- Visão geral: valor total em estoque (RF030), número de produtos com estoque baixo/vencimento, lista de produtos com
  quantidade, custo médio, valor e localização. Filtros: estoque baixo, próximo do vencimento, vencido, sem estoque.
- Detalhe do produto: lotes com saldo (código, quantidade disponível/inicial, validade, situação) e movimentações em
  ordem cronológica inversa (tipo, quantidade com sinal, data, origem com link para a compra/venda, motivo).

**UC11 — Ajustar estoque.**
1. No detalhe do produto, "Ajustar" → informa quantidade (positiva ou negativa) e motivo (obrigatório, RN021).
2. Confirma → o sistema registra a movimentação de ajuste e atualiza o saldo.

Alternativos: motivo vazio → rejeitado; ajuste negativo maior que o saldo → rejeitado (estoque não fica negativo).

Motivos sugeridos (lista + texto livre): avaria, perda/roubo, vencido descartado, brinde/uso interno, contagem.

## Dados

Lote e movimentação estão em [`domain.md`](../domain.md#lote). O saldo do produto é sempre a soma dos seus lotes.

| Campo do ajuste | Tipo | Obrigatório | Validação |
| --- | --- | --- | --- |
| produto | ref. | sim | |
| quantidade | inteiro | sim | ≠ 0; saldo resultante ≥ 0 |
| lote | ref. | ver dúvidas | |
| motivo | texto | sim | 3–200 caracteres (RN021) |

## API

A definir na implementação.

## Critérios de aceite

- [ ] Dado produto com 20 un. e custo médio R$ 25,00, então o valor em estoque é R$ 500,00, e o total soma todos os
      produtos.
- [ ] Dado produto com mínimo 5 e saldo 5, então aparece como estoque baixo.
- [ ] Dado ajuste sem motivo, então é rejeitado.
- [ ] Dado saldo 3 e ajuste −4, então é rejeitado com "Estoque insuficiente: disponível 3 un.".
- [ ] Dado um ajuste, então o custo médio não muda.
- [ ] Dados lotes com validade 10/12 e 01/12, então uma venda retira primeiro do lote de 01/12.
- [ ] Dado lote com validade ontem, então aparece como vencido; com validade daqui a 10 dias e antecedência 30,
      como próximo do vencimento.
- [ ] Dado produto sem controle de validade, então nunca aparece como vencido ou próximo do vencimento.

## Dúvidas em aberto

- D06 (lote para todos), D09 (antecedência configurável), em
  [`product.md`](../product.md#decisões-pendentes-transversais).
- **Em qual lote cai o ajuste?** O usuário escolhe o lote (mais preciso, ex.: "descartei o lote vencido"), ou o
  sistema decide (protótipo: negativo no lote com mais saldo, positivo no lote mais recente)? Proposta: o usuário
  escolhe; padrão FEFO para negativo.
- **Ajuste positivo** (achou unidades): entra com qual custo? Proposta: custo médio atual, sem recalcular (RN017 só
  fala de vendas; RN014 só de entradas).
- **Lote vencido na venda:** FEFO pega o vencido primeiro. Pode vender vencido, ou o lote vencido é ignorado na baixa
  (e só sai por ajuste/descarte)?
