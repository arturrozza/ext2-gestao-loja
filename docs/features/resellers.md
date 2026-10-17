# Revendedoras

- **Status:** rascunho
- **Responsável:**
- **Última atualização:** 2026-10-17
- **Casos de uso:** UC15, UC16

## Objetivo

Controlar as vendas feitas por revendedoras e calcular as comissões automaticamente, sem conta manual.

## Requisitos funcionais

- [ ] RF053 — Cadastrar revendedoras.
- [ ] RF054 — Consultar revendedoras.
- [ ] RF055 — Visualizar os detalhes de uma revendedora.
- [ ] RF056 — Editar uma revendedora.
- [ ] RF057 — Definir a comissão padrão.
- [ ] RF058 — Inativar uma revendedora.
- [ ] RF059 — Reativar uma revendedora.
- [ ] RF060 — Consultar as vendas de uma revendedora.
- [ ] RF061 — Calcular automaticamente a comissão nas vendas vinculadas. *(na venda: [`sales.md`](sales.md))*
- [ ] RF062 — Gerar relatório de comissões por revendedora.

## Regras de negócio

- RN038 — Ao vincular a revendedora a uma venda, aplica a comissão padrão, alterável só para aquela venda.
- RN039 — A comissão calculada fica gravada na venda, mesmo que a padrão mude depois.
- RN047 — Só revendedoras ativas em novas vendas.
- RN048 — Revendedoras inativas continuam nas vendas e relatórios históricos.
- RN049 — A comissão é custo no lucro real.
- RN044 — Vendas canceladas não entram no total de comissões.

Não funcionais: RNF006 (só nome, telefone e observações).

## Fora do escopo

- Acesso da revendedora ao app.
- Pagamento/baixa de comissão (marcar como paga). Ver dúvidas.
- Estoque consignado (produtos que ficam com a revendedora).

## Fluxos / telas

**UC15 — Gerenciar revendedoras.** Lista com abas Ativas / Inativas, busca por nome. Cadastro/edição: nome, telefone,
comissão padrão (%), observações. Inativar/reativar no detalhe, com confirmação.

**UC16 — Consultar comissões.** Detalhe da revendedora: dados, período (padrão: mês atual), total vendido, total de
comissão e lista das vendas concluídas no período (data, receita, % e valor da comissão). O relatório de comissões
(RF062) mostra todas as revendedoras no período; ver [`reports.md`](reports.md) (RF083).

## Dados

| Campo | Tipo | Obrigatório | Validação |
| --- | --- | --- | --- |
| nome | texto | sim | 1–120 caracteres |
| telefone | texto | não | |
| comissão padrão | percentual | sim | 0–100, duas casas |
| observações | texto | não | até 500 caracteres |
| situação | ativa / inativa | sim | |
| data de inativação | data | calculado | |

A comissão de uma venda é um custo do tipo "comissão" (percentual sobre a receita), registrado na venda.

## API

A definir na implementação.

## Critérios de aceite

- [ ] Dada revendedora com comissão 10% e venda de R$ 200,00, então a venda grava comissão de R$ 20,00 e o lucro a
      considera.
- [ ] Dada mudança da comissão padrão para 15%, então vendas antigas continuam com 10%.
- [ ] Dada revendedora inativa, então ela não aparece no seletor da venda, mas aparece nas vendas antigas e nos
      relatórios.
- [ ] Dada uma venda cancelada, então ela não entra no total de comissões.

## Dúvidas em aberto

- Comissão sempre percentual, ou pode ser valor fixo por venda?
- A loja precisa marcar comissões como **pagas** (acerto mensal)? Não está nos requisitos, mas é comum.
- A comissão incide sobre a receita (com desconto) ou sobre o valor bruto? Proposta: receita (D05).
