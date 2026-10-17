# Vendas, custos e comissões

- **Status:** rascunho
- **Responsável:**
- **Última atualização:** 2026-10-17
- **Casos de uso:** UC12 (expandido), UC13, UC14 (expandido)

## Objetivo

Registrar cada venda (Loja, Mercado Livre ou Revendedora) com seus custos reais, dar baixa no estoque e mostrar o
**lucro real** da operação. Os módulos "Vendas" e "Custos e Comissões" dos documentos originais ficam juntos aqui,
porque um não existe sem o outro.

## Requisitos funcionais

Vendas:

- [ ] RF038 — Cadastrar vendas.
- [ ] RF039 — Selecionar os produtos vendidos.
- [ ] RF040 — Informar a quantidade de cada produto.
- [ ] RF041 — Informar o valor real da venda.
- [ ] RF042 — Informar a data da venda.
- [ ] RF043 — Selecionar o canal.
- [ ] RF044 — Cadastrar ou identificar vendas do Mercado Livre. *(importação: [`mercado-livre.md`](mercado-livre.md);
      aqui, o canal "Mercado Livre" no registro manual)*
- [ ] RF045 — Aplicar desconto ou acréscimo.
- [ ] RF046 — Informar custos adicionais.
- [ ] RF047 — Vincular a venda a uma revendedora.
- [ ] RF048 — Dar baixa automática no estoque.
- [ ] RF049 — Registrar a saída como movimentação.
- [ ] RF050 — Calcular automaticamente o lucro real.
- [ ] RF051 — Consultar as vendas.
- [ ] RF052 — Visualizar os detalhes de uma venda.
- [ ] RF090 *(proposto)* — Cancelar uma venda, gerando estorno no estoque.

Custos e comissões:

- [ ] RF063 — Informar custos variáveis da venda.
- [ ] RF064 — Frete.
- [ ] RF065 — Imposto.
- [ ] RF066 — Taxa de plataforma.
- [ ] RF067 — Comissão.
- [ ] RF068 — Outros custos.
- [ ] RF069 — Custo como valor fixo.
- [ ] RF070 — Custo como percentual sobre o valor da venda.
- [ ] RF071 — Considerar os custos no lucro real.
- [ ] RF072 — Visualizar a composição dos custos da venda.

## Regras de negócio

- RN029 — A venda tem ao menos um item com quantidade > 0.
- RN030 — Só produtos ativos entram em novas vendas.
- RN031 — Quantidade vendida ≤ quantidade disponível.
- RN032 — A venda reduz o estoque e gera uma movimentação de saída por item (uma por lote tocado).
- RN033 — O custo de cada item é o custo médio do produto no momento da venda.
- RN034 — Esse custo fica gravado na venda, mesmo que o custo médio mude depois.
- RN035 — Desconto reduz a receita; acréscimo aumenta.
- RN036 — Custos podem ser valor fixo ou percentual.
- RN037 — Percentuais incidem sobre o valor da venda. *(D05: receita)*
- RN038 — Ao vincular revendedora, aplica a comissão padrão, alterável só para aquela venda.
- RN039 — A comissão calculada fica gravada na venda.
- RN040 — Lucro real = receita − custo dos produtos − custos. *(D04: desconto não é subtraído de novo)*
- RN041 — Margem negativa quando lucro real < 0.
- RN042 — Vendas com movimentações não são excluídas.
- RN043 — Cancelar gera estorno que devolve os produtos ao estoque.
- RN044 — Vendas canceladas não entram em totais de vendas, lucro ou comissões.
- RN045 — Cancelamento preserva os dados originais.
- RN047 — Só revendedoras ativas em novas vendas.
- RN049 — A comissão é custo no lucro real.

Fórmulas e exemplo numérico: [`domain.md`](../domain.md#cálculos). Não funcionais: RNF007, RNF009, RNF015, RNF016.

## Fora do escopo

- Pagamento, troco, parcelamento, nota fiscal.
- Cadastro de clientes.
- Edição de venda concluída (correção = cancelar e registrar de novo; ver dúvidas).
- Devolução parcial.

## Fluxos / telas

**UC12 — Registrar venda (fluxo principal).**

1. "Nova venda" → formulário com canais Loja, Mercado Livre, Revendedora.
2. Informa a data (padrão hoje) e o canal.
3. Seleciona um produto ativo (busca ou código de barras) → app mostra saldo e preço base.
4. Informa quantidade e valor unitário (pré-preenchido com o preço base) → valida quantidade > 0 e ≤ saldo.
5. Repete 3–4 → app atualiza a lista e o total.
6. Informa desconto ou acréscimo, se houver → app recalcula a receita.
7. Informa custos (frete, imposto, taxa, outros), cada um fixo ou percentual → app mostra o valor em R$.
8. Se o canal for Revendedora, escolhe uma revendedora ativa → app aplica a comissão padrão, editável nesta venda.
9. Revisa o resumo (receita, custo dos produtos, custos por tipo, lucro real, margem) e confirma → o sistema registra a
   venda, os itens com o custo médio vigente e os custos calculados, dá baixa nos lotes (validade mais próxima
   primeiro) e gera as movimentações de saída. Ou grava tudo, ou nada.
10. App mostra a venda registrada com a composição dos custos e o lucro.

**Alternativos.**
- 3a. Produto inativo: não aparece (RN030).
- 4a. Quantidade > saldo: rejeita e mostra o saldo (RN020, RN031).
- 4b. Nenhum item com quantidade > 0: não deixa confirmar (RN029).
- 8a. Revendedora inativa: não aparece (RN047).
- 9a. Lucro negativo: grava, marca "margem negativa" e gera alerta (RN041, RF089). O app avisa antes de confirmar.
- 9b. Falha na gravação: nada é gravado (RNF007).
- 9c. Desistência: nada é gravado.
- 9d. O estoque mudou entre abrir e confirmar (ex.: outra venda): o sistema confere de novo e rejeita
  informando o saldo atual.

**UC13 — Consultar vendas.** Lista por data (mais recente primeiro), paginada, com filtros por período, canal,
revendedora e situação. Cada linha: data, canal, itens, receita, lucro, selo de cancelada/margem negativa. O detalhe
mostra itens, desconto/acréscimo, composição dos custos (RF072), lucro, margem, origem (manual/importada) e código
externo.

**UC14 — Cancelar venda.**
1. No detalhe, "Cancelar venda" → app pede confirmação e avisa que os produtos voltam ao estoque.
2. Confirma → o sistema marca a venda como cancelada (com data), mantém os dados originais, gera uma movimentação de
   estorno para cada movimentação de saída (mesmo lote, mesma quantidade) e a venda sai dos totais.

Alternativos: venda já cancelada → ação indisponível; venda importada cancelada no Mercado Livre → mesmo efeito, sem
ação do usuário (RN060); desistência → nada muda. O estorno **não** recalcula o custo médio (ponto em aberto do UC14,
proposta aceita em [`domain.md`](../domain.md#custo-médio-rn014rn017)).

## Dados

| Entidade | Campo | Tipo | Obrigatório | Validação |
| --- | --- | --- | --- | --- |
| Venda | data | data | sim | não futura |
| Venda | canal | Loja / Mercado Livre / Revendedora | sim | |
| Venda | origem | manual / importada | sim | manual no registro pelo app |
| Venda | revendedora | ref. | se canal = revendedora | ativa (RN047) |
| Venda | desconto | dinheiro | não (0) | ≥ 0 |
| Venda | acréscimo | dinheiro | não (0) | ≥ 0 |
| Venda | situação | concluída / cancelada | sim | |
| Venda | receita, custo dos produtos, total de custos, lucro real | dinheiro | calculado | gravados na confirmação |
| Item | produto | ref. | sim | ativo (RN030) |
| Item | quantidade | inteiro | sim | > 0, ≤ saldo |
| Item | valor unitário | dinheiro | sim | ≥ 0 |
| Item | custo unitário considerado | decimal | calculado | custo médio no momento (RN033) |
| Custo | tipo | frete / imposto / taxa da plataforma / comissão / outro | sim | |
| Custo | tipo de cálculo | fixo / percentual | sim | percentual entre 0 e 100 |
| Custo | valor base | decimal | sim | ≥ 0 |
| Custo | valor calculado | dinheiro | calculado | gravado (RN039) |

Receita, custos e lucro são sempre calculados pelo sistema, nunca digitados.

## API

A definir na implementação.

## Critérios de aceite

- [ ] Dado o exemplo de [`domain.md`](../domain.md#lucro-real-e-margem-rn040-rn041) (2 × R$ 100, desconto R$ 20,
      custo médio R$ 40, frete R$ 15, taxa 10%), então receita = R$ 180,00 e lucro real = R$ 67,00.
- [ ] Dado saldo 3, quando vendo 4, então a venda é rejeitada e nada é gravado.
- [ ] Dada uma venda, então o saldo cai e há movimentações de saída somando a quantidade vendida, tiradas por FEFO.
- [ ] Dada uma venda e uma entrada posterior que muda o custo médio, então o lucro da venda não muda.
- [ ] Dada revendedora com comissão padrão 10% alterada para 8% na venda, então a venda grava 8%, e a padrão continua
      10%.
- [ ] Dado lucro negativo, então a venda é gravada e marcada com margem negativa.
- [ ] Dada uma venda cancelada, então o saldo volta, há movimentações de estorno, o custo médio não muda e a venda
      some dos totais.
- [ ] Dada uma venda já cancelada, então não é possível cancelar de novo.

## Dúvidas em aberto

- D04 (desconto) e D05 (base dos percentuais), em [`product.md`](../product.md#decisões-pendentes-transversais).
- **Canal × revendedora:** revendedora é obrigatória no canal Revendedora; pode haver revendedora em venda do canal
  Loja?
- **Custos padrão por canal:** preencher automaticamente imposto (% fixo da loja) ou taxa do canal? Agiliza o
  RNF015, mas não está nos requisitos.
- **Desconto/acréscimo:** só em R$, ou também em %?
- **Editar venda:** é necessário, ou cancelar e registrar de novo basta?
- **Data retroativa:** venda com data passada usa o custo médio **atual** (proposta) ou o da data?
- Itens com o mesmo produto repetido na venda: juntar numa linha?
