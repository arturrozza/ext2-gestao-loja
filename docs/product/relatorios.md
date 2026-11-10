# Relatórios

Desempenho da loja por período: vendas, lucro, custos, canais, produtos, categorias e revendedoras.

## Regras funcionais

- **RF-REL-01.** O usuário escolhe o período: hoje, últimos 7 dias, mês atual, mês anterior ou personalizado (data
  inicial e data final).
- **RF-REL-02.** O relatório mostra, para o período escolhido:
  - **Resumo:** total vendido, lucro real, margem, número de vendas e valor médio por venda.
  - **Evolução:** vendas e lucro ao longo do período, em barras.
  - **Custos:** custo dos produtos, frete, imposto, taxas, comissões e outros.
  - **Canais:** vendas e lucro de Loja, Mercado Livre e Revendedora.
  - **Produtos:** os mais vendidos, os menos vendidos, os de melhor margem e os de pior margem.
  - **Categorias:** vendas e lucro de cada categoria.
  - **Revendedoras:** total vendido e comissão de cada revendedora.

## Regras de negócio

### Período

- **RN-REL-01.** O relatório usa a data da venda e não inclui vendas canceladas.
- **RN-REL-02.** "Últimos 7 dias" é hoje e os 6 dias anteriores. "Mês atual" vai do dia 1º até hoje. "Mês anterior" é
  o mês anterior inteiro.
- **RN-REL-03.** No período personalizado, as duas datas entram no período, nenhuma pode ser futura, a data inicial não
  pode ser posterior à final e o período tem no máximo 5 anos.

### Totais

- **RN-REL-04.** Custo dos produtos + frete + imposto + taxas + comissões + outros + lucro = total vendido no período.
- **RN-REL-05.** As vendas e o lucro dos canais, das categorias e dos produtos somam o mesmo total do resumo.
- **RN-REL-06.** O valor médio por venda é o total vendido dividido pelo número de vendas, arredondado ao centavo.
- **RN-REL-07.** Os três canais aparecem sempre, mesmo sem vendas no período.
- **RN-REL-08.** Produto sem categoria aparece em "Sem categoria".
- **RN-REL-09.** Revendedoras aparecem só se venderam no período, da que mais vendeu para a que menos vendeu. A
  comissão é a das vendas do período.
- **RN-REL-10.** Produtos, categorias e revendedoras arquivados aparecem nos períodos em que tiveram vendas.

### Evolução

- **RN-REL-11.** A evolução tem uma barra por dia em períodos de até 31 dias, uma barra por semana (blocos de 7 dias a
  partir do início do período) em períodos de até cerca de 6 meses, e uma barra por mês acima disso.
- **RN-REL-12.** Dia, semana ou mês sem venda aparece com a barra zerada.

### Rankings de produtos

- **RN-REL-13.** Cada ranking mostra até 5 produtos, só entre os que tiveram venda no período.
- **RN-REL-14.** "Mais vendidos" e "menos vendidos" ordenam por unidades vendidas, contando brindes. No empate, vale o
  valor vendido e depois a ordem alfabética.
- **RN-REL-15.** "Melhor margem" e "pior margem" não incluem produtos que só saíram como brinde no período.

## Cálculos

### Margem de cada produto

Os custos da venda (frete, imposto, taxas, comissão e outros) e o desconto ou acréscimo valem para a venda inteira.
Para calcular a margem de cada produto, esses valores são divididos entre os produtos da venda na proporção do valor de
cada um (quantidade × preço).

```
parte do produto = valor da venda inteira × (quantidade × preço do produto) ÷ soma de (quantidade × preço)
lucro do produto = venda do produto − custo do produto − parte dos custos da venda
margem do produto = lucro do produto no período ÷ venda do produto no período
```

Exemplo: venda de R$ 100 com uma blusa de R$ 80 e um colar de R$ 20, e R$ 10 de custos da venda. A blusa recebe R$ 8
dos custos e o colar R$ 2. Se a blusa custou R$ 30 e o colar R$ 5, o lucro é R$ 42 na blusa e R$ 13 no colar, R$ 55 no
total, o mesmo lucro da venda.

- A divisão é feita em centavos exatos, e a soma das partes é sempre igual ao valor da venda.
- Brinde (preço zero) não recebe parte da receita nem dos custos da venda: fica só com o próprio custo, tem prejuízo e
  aparece sem margem.
- Numa venda só com brindes, a divisão é feita por unidades.

## Fora do escopo

Exportação para PDF ou planilha.
