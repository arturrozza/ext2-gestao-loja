# Relatórios

- **Status:** rascunho
- **Responsável:**
- **Última atualização:** 2026-10-17
- **Casos de uso:** UC17

## Objetivo

Dar ao lojista uma visão clara do desempenho da loja por período: quanto vendeu, quanto lucrou, para onde foram os
custos, quais produtos e canais compensam.

## Requisitos funcionais

- [ ] RF073 — Consultar relatórios por período.
- [ ] RF074 — Valor total em estoque.
- [ ] RF075 — Vendas por período (inclui "vendas do mês").
- [ ] RF076 — Lucro por período (inclui "lucro do mês").
- [ ] RF077 — Custos por tipo (frete, impostos, taxas, comissões).
- [ ] RF078 — Produtos mais vendidos.
- [ ] RF079 — Produtos menos vendidos.
- [ ] RF080 — Produtos com melhor margem.
- [ ] RF081 — Produtos com margem ruim ou negativa.
- [ ] RF082 — Vendas por canal.
- [ ] RF083 — Comissões por revendedora.

## Regras de negócio

- RN044 — Vendas canceladas não entram nos totais.
- RN050 — Só dados da loja do usuário autenticado.
- RN051 — Relatórios por período usam as datas inicial e final informadas (inclusivas).
- RN052 — Produtos inativos aparecem nos períodos em que tiveram movimentação.

## Fora do escopo

- Exportar para PDF/planilha.
- Comparação com período anterior e metas (pode entrar depois).
- Dashboards personalizáveis.

## Fluxos / telas

Uma tela de relatórios com seletor de período (atalhos: hoje, 7 dias, mês atual, mês anterior, personalizado) e seções:

| Seção | Conteúdo | Base de cálculo |
| --- | --- | --- |
| Resumo | receita, lucro real, margem, número de vendas, ticket médio | vendas concluídas no período |
| Evolução | receita e lucro por dia/semana | idem |
| Custos por tipo | frete, imposto, taxa, comissão, outros, custo dos produtos | custos gravados nas vendas |
| Vendas por canal | receita, lucro e nº de vendas por canal | idem |
| Produtos mais / menos vendidos | ranking por quantidade (desempate por receita) | itens de venda |
| Melhor margem / margem ruim | ranking pela margem do produto | [`domain.md`](../domain.md#margem-de-um-produto-relatórios-e-alertas) |
| Comissões por revendedora | total vendido e comissão por revendedora | custos do tipo comissão |
| Estoque | valor total em estoque **agora** (não depende do período) | lotes × custo médio |

A tela inicial (dashboard) do protótipo reaproveita esses números para o mês atual: vendas e lucro do mês, valor em
estoque e alertas ativos.

O período usa a data da venda no fuso America/Sao_Paulo.

## Dados

Sem entidades novas: tudo é calculado de vendas, itens, custos, lotes e movimentações. Os relatórios devem
responder em até 3 s (RNF013).

## API

A definir na implementação.

## Critérios de aceite

- [ ] Dadas 3 vendas no período e 1 cancelada, então o resumo soma só as 3.
- [ ] Dado período 01/10–31/10, então vendas de 31/10 às 23:30 (horário de Brasília) entram.
- [ ] Dado produto inativo com vendas no período, então aparece nos rankings.
- [ ] A soma de "custos por tipo" + custo dos produtos + lucro = receita do período.
- [ ] Os relatórios de um mês com volume normal respondem em até 3 s.

## Dúvidas em aberto

- "Menos vendidos" inclui produtos ativos com **zero** vendas no período? (Proposta: sim, no fim da lista; útil para
  decidir reposição.)
- Ranking de margem: exigir um mínimo de vendas para entrar (evitar um produto com 1 venda no topo)?
- Valor em estoque histórico (em uma data passada) é necessário, ou só o atual?
