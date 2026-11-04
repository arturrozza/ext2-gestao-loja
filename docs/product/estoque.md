# Estoque

## Objetivo

Mostrar o que há na loja, quanto vale e onde está, com histórico de toda mudança e correções justificadas. Não tem tela
própria: fica na lista e na tela de [Produtos](produtos.md).

## Funcionalidades

- **Na lista:** valor total em estoque e, em cada produto, quantidade, custo, valor e localização.
- **Filtros:** estoque baixo, sem estoque, perto de vencer e vencido.
- **Na tela do produto:** quantidade por validade e histórico de movimentações, com acesso à compra ou venda de origem.
- Ajustar o estoque.
- Corrigir o custo.

## Regras

- Toda mudança de quantidade ou custo gera uma movimentação, que nunca é alterada e guarda tipo, quantidade, custo, custo
  médio resultante, data, origem, motivo e autor.
- O saldo do produto é a soma de seus lotes.
- Valor em estoque = quantidade × custo médio.
- Estoque baixo: quantidade igual ou abaixo do mínimo.
- Saída na venda: primeiro a validade mais próxima; sem validade, o lote mais antigo.
- Unidades vencidas não entram na venda. Saem por ajuste, com o motivo "vencido descartado".

## Ajuste

Corrige a quantidade quando o app não bate com a prateleira. A pessoa informa a quantidade certa e o motivo: contagem,
avaria, perda, vencido descartado, brinde ou uso interno, ou outro.

- Antes de confirmar, o app mostra o efeito, como **"10 → 8 (−2) · −R$ 184 em estoque. Motivo: perda."**
- Reduzindo, com mais de uma validade, a pessoa escolhe de qual saiu.
- Aumentando, as unidades entram com o custo médio atual, sem alterá-lo. Se o produto tem validade, o app pede a data.
- O estoque não fica negativo.

## Corrigir custo

Serve para quando o custo foi lançado errado e já houve venda, o que impede cancelar a compra.

- A pessoa informa o custo certo e o motivo, e isso fica registrado.
- As vendas seguintes usam o custo corrigido.
- As vendas antigas não mudam. Para corrigir uma, cancela e lança de novo.

## Fora do escopo

Inventário completo de uma vez e transferência entre depósitos.

## Em aberto

- Unidades vencidas continuam contando no valor em estoque até serem descartadas?
