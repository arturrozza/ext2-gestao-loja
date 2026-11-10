# Relatórios

## Objetivo

Mostrar o desempenho da loja por período: quanto vendeu, quanto lucrou, para onde foram os custos e quais produtos e canais
compensam.

## Funcionalidades

Uma tela com seletor de período (hoje, 7 dias, mês atual, mês anterior ou personalizado), mostrando:

- **Resumo:** vendas, lucro, margem, número de vendas e valor médio por venda.
- **Evolução:** vendas e lucro ao longo do período.
- **Custos:** produtos, frete, imposto, taxas, comissões e outros.
- **Canais:** vendas e lucro de Loja, Mercado Livre e Revendedora.
- **Produtos:** mais vendidos, menos vendidos, melhor margem e pior margem.
- **Categorias:** vendas e lucro de cada categoria.
- **Revendedoras:** total vendido e comissão de cada uma.

## Regras

- Vendas canceladas não entram em nada.
- Produtos, categorias e revendedoras arquivados aparecem nos períodos em que tiveram vendas.
- O período usa a data da venda.
- **Períodos:** "7 dias" é hoje e os 6 dias antes; "mês atual" vai do dia 1º até hoje; "mês anterior" é o mês fechado.
  No personalizado, as duas datas entram no período, não podem ser futuras, a inicial não vem depois da final e o
  período vai até 5 anos.
- **A conta fecha:** custos dos produtos + frete + imposto + taxas + comissões + outros + lucro = vendas do período. As
  vendas e o lucro dos canais, das categorias e dos produtos somam o mesmo total do resumo.
- **Evolução:** uma barra por dia em períodos de até 31 dias, uma por semana (blocos de 7 dias a partir do início do
  período) até cerca de 6 meses, e uma por mês acima disso. Dia sem venda aparece como barra zerada.
- **Valor médio por venda:** vendas ÷ número de vendas, arredondado ao centavo.
- **Canais:** os três aparecem sempre, mesmo sem venda. **Revendedoras:** só as que venderam no período, a que mais
  vendeu primeiro; a comissão é a das vendas do período.

### Margem de cada produto

Uma venda tem custos da venda inteira (frete, imposto, taxas, comissão) e um desconto ou acréscimo. Para dar a cada
produto a sua margem, esses valores são **divididos entre os itens pelo valor de cada um** (quantidade × preço):

Exemplo: venda de R$ 100 com uma blusa de R$ 80 e um colar de R$ 20, e R$ 10 de custos da venda. A blusa leva R$ 8 e o
colar R$ 2. Se a blusa custou R$ 30 e o colar R$ 5, o lucro é R$ 42 na blusa e R$ 13 no colar, R$ 55 ao todo, o mesmo
da venda.

- O desconto ou acréscimo também se divide pelo valor, então a venda do produto já vem com o desconto descontado.
- A divisão é em centavos exatos: a soma dos itens fecha sempre com a venda.
- Brinde (preço zero) não leva parte da venda nem dos custos: fica só com o custo do próprio produto, então dá
  prejuízo e a margem dele aparece como "—". Numa venda só de brindes, a divisão é por unidades.
- Margem é o lucro do produto ÷ a venda dele no período.

### Rankings de produtos

- Mostram **5** produtos cada, e só os que tiveram venda no período. Produto parado, sem venda, não aparece.
- **Mais e menos vendidos** são por unidades (brinde conta como unidade); no empate, vale quem vendeu mais (ou menos)
  dinheiro e depois a ordem alfabética.
- **Melhor e pior margem** deixam de fora o produto sem venda em dinheiro (só saiu como brinde), porque não há margem
  para comparar.

## Fora do escopo

Exportar para PDF ou planilha.
