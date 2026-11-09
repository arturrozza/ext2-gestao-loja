# Estoque

## Objetivo

Mostrar o que há na loja, quanto vale e onde está, com histórico de toda mudança e correções justificadas. Não tem tela
própria: fica na lista e na tela de [Produtos](produtos.md).

## Funcionalidades

- **Na lista:** valor total em estoque e, em cada produto, quantidade, preço e localização. Custo e valor ficam na tela do
  produto.
- **Filtros:** estoque baixo, sem estoque, perto de vencer e vencido.
- **Na tela do produto:** quantidade por validade e histórico de movimentações, com acesso à compra ou venda de origem.
- Ajustar o estoque.
- Corrigir o custo.

## Regras

- Toda mudança de quantidade ou custo gera uma movimentação, que nunca é alterada e guarda tipo, quantidade, custo, custo
  médio resultante, data, origem, motivo e autor.
- O saldo do produto é a soma de seus lotes.
- Valor em estoque = quantidade × custo médio. O custo médio é guardado sem arredondar; só aparece arredondado ao
  centavo.
- Estoque baixo: quantidade igual ou abaixo do mínimo, com alguma unidade. Sem nenhuma, é "sem estoque". Sem mínimo
  definido, o produto nunca fica com estoque baixo.
- As unidades vencidas contam na quantidade e no valor até serem descartadas, mas não no que está disponível para
  venda.
- Perto de vencer: unidades ainda não vencidas cujo mês de validade termina dentro da antecedência de vencimento das
  configurações da loja (30 dias por padrão).
- O valor total em estoque é o da loja inteira, sem depender da busca ou do filtro, e inclui os produtos arquivados que
  ainda têm unidades.
- Saída na venda: primeiro a validade mais próxima; sem validade, o lote mais antigo.
- Unidades vencidas não entram na venda. Saem por ajuste, com o motivo "vencido descartado".

## Ajuste

Corrige a quantidade quando o app não bate com a prateleira. A pessoa informa a quantidade certa e o motivo: contagem,
avaria, perda, vencido descartado, brinde ou uso interno, ou outro.

- Antes de confirmar, o app mostra o efeito, como **"10 → 8 (−2) · −R$ 184 em estoque. Motivo: perda."**
- "Outro" exige explicar o motivo. Só "contagem" e "outro" aumentam a quantidade; os demais só tiram unidades.
- Reduzindo, com mais de uma validade, a pessoa escolhe de qual saiu, e a redução não passa do que essa validade tem.
  Para tirar de duas validades, faz dois ajustes. Zerando o estoque, não precisa escolher.
- "Vencido descartado" só tira unidades vencidas. Para zerar um produto que ainda tem unidades boas, escolha outro
  motivo ou descarte só a validade vencida.
- Aumentando, as unidades entram com o custo médio atual, sem alterá-lo. Se o produto tem validade, o app pede a data,
  que pode ser de um mês que já passou: as unidades entram já vencidas.
- Sem estoque não há ajuste: as unidades entram por uma compra, que traz o custo.
- Um ajuste soma até 100.000 unidades de uma vez.
- O estoque não fica negativo.
- Produtos arquivados também podem ser ajustados: as unidades deles continuam na loja.

## Corrigir custo

Serve para quando o custo foi lançado errado e já houve venda, o que impede cancelar a compra.

- A pessoa informa o custo médio certo e o motivo, e isso fica registrado. Vale para todas as unidades em estoque.
- Antes de confirmar, o app mostra o efeito, como **"R$ 92,00 → R$ 88,00 · −R$ 40,00 em estoque"**.
- Sem estoque não há custo para corrigir. O custo pode ser corrigido para zero.
- As vendas seguintes usam o custo corrigido.
- As vendas antigas não mudam. Para corrigir uma, cancela e lança de novo.

## Fora do escopo

Inventário completo de uma vez e transferência entre depósitos.
