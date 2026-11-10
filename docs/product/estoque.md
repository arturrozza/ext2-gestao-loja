# Estoque

Quantidade, valor e validades de cada produto, histórico de movimentações, ajuste de quantidade e correção de custo.
O estoque não tem tela própria: aparece na lista e na tela de [Produtos](produtos.md).

## Regras funcionais

- **RF-EST-01.** A lista de produtos mostra, no topo, o valor total em estoque da loja.
- **RF-EST-02.** A lista de produtos mostra a quantidade em estoque de cada produto e a situação de estoque mais
  urgente dele (sem estoque, estoque baixo, vencido ou perto de vencer).
- **RF-EST-03.** A tela do produto mostra quantidade, custo médio, valor em estoque e a quantidade por validade.
- **RF-EST-04.** A tela do produto mostra o histórico de movimentações, da mais recente para a mais antiga, com tipo,
  quantidade, custo, quantidade e custo médio depois da movimentação, data, motivo e autor. A movimentação de compra ou
  de venda leva à compra ou à venda de origem.
- **RF-EST-05.** O usuário pode ajustar a quantidade de um produto, informando a quantidade correta e o motivo.
- **RF-EST-06.** Antes de confirmar o ajuste, o app mostra o efeito, por exemplo: "10 → 8 (−2) · −R$ 184 em estoque.
  Motivo: perda."
- **RF-EST-07.** O usuário pode corrigir o custo médio de um produto, informando o custo correto e o motivo.
- **RF-EST-08.** Antes de confirmar a correção, o app mostra o efeito, por exemplo: "R$ 92,00 → R$ 88,00 · −R$ 40,00
  em estoque".

## Regras de negócio

### Saldo e valor

- **RN-EST-01.** Toda mudança de quantidade ou de custo gera uma movimentação. Movimentações nunca são alteradas nem
  apagadas.
- **RN-EST-02.** Os tipos de movimentação são: compra, compra cancelada, venda, venda cancelada, ajuste e correção de
  custo.
- **RN-EST-03.** A quantidade em estoque de um produto é a soma das unidades dos seus lotes.
- **RN-EST-04.** O valor em estoque é a quantidade vezes o custo médio. O custo médio é guardado sem arredondar e
  aparece arredondado ao centavo.
- **RN-EST-05.** O valor total em estoque é o da loja inteira, sem depender da busca nem dos filtros, e inclui os
  produtos arquivados que ainda têm unidades.
- **RN-EST-06.** Unidades vencidas contam na quantidade e no valor em estoque até serem descartadas por ajuste, mas
  não contam como unidades vendáveis.

### Situações de estoque

- **RN-EST-07.** **Sem estoque:** quantidade zero, em produto com estoque mínimo definido.
- **RN-EST-08.** **Estoque baixo:** quantidade maior que zero e igual ou menor que o estoque mínimo.
- **RN-EST-09.** Produto sem estoque mínimo nunca fica em "sem estoque" nem em "estoque baixo".
- **RN-EST-10.** **Vencido:** o produto tem unidades com validade de um mês que já terminou.
- **RN-EST-11.** **Perto de vencer:** o produto tem unidades ainda não vencidas cujo mês de validade termina dentro da
  antecedência de vencimento configurada na [Loja](loja.md).

### Saída

- **RN-EST-12.** Na venda, as unidades saem primeiro da validade mais próxima, depois dos lotes sem validade, e do
  lote mais antigo dentro da mesma validade.
- **RN-EST-13.** Unidades vencidas não saem na venda. Saem por ajuste, com o motivo "vencido descartado".

### Ajuste

- **RN-EST-14.** Motivos do ajuste: contagem, avaria, perda, vencido descartado, brinde ou uso interno, e outro.
- **RN-EST-15.** O motivo "outro" exige uma explicação (até 500 caracteres).
- **RN-EST-16.** Só "contagem" e "outro" aumentam a quantidade. Os demais motivos só diminuem.
- **RN-EST-17.** Ao diminuir, se o produto tem mais de uma validade, o usuário escolhe de qual validade as unidades
  saem, e a redução não passa do que essa validade tem. Para tirar de duas validades, o usuário faz dois ajustes. Ao
  zerar o estoque, não é preciso escolher.
- **RN-EST-18.** "Vencido descartado" só tira unidades vencidas.
- **RN-EST-19.** Ao diminuir, as unidades saem pelo custo médio. Ao zerar o estoque, o valor em estoque também zera.
- **RN-EST-20.** Ao aumentar, as unidades entram pelo custo médio atual, sem alterá-lo. Se o produto tem validade, o
  usuário informa a validade, que pode ser de um mês que já passou (as unidades entram vencidas).
- **RN-EST-21.** Produto sem estoque não pode ser ajustado para cima: as unidades entram por uma compra, que traz o
  custo.
- **RN-EST-22.** Um ajuste aumenta no máximo 100.000 unidades de uma vez.
- **RN-EST-23.** Produtos arquivados podem ser ajustados.

### Correção de custo

- **RN-EST-24.** A correção de custo define um novo custo médio para todas as unidades em estoque e exige um motivo
  (até 500 caracteres).
- **RN-EST-25.** Produto sem estoque não tem custo para corrigir. O novo custo deve ser diferente do atual e pode ser
  zero.
- **RN-EST-26.** As vendas seguintes usam o custo corrigido. As vendas já registradas não mudam.

## Fora do escopo

Inventário completo de uma vez, transferência entre depósitos e mais de um local de estoque.
