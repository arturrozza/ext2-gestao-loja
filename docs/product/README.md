# Produto

Descrição do que o sistema faz hoje: módulos, regras funcionais, regras de negócio e modelo de dados. É a fonte da
verdade para implementar e testar. Quando uma regra muda, o módulo correspondente é atualizado na mesma mudança.

Rotas, tabelas e bibliotecas ficam nos documentos técnicos ([`architecture.md`](../architecture.md),
[`conventions.md`](../conventions.md)).

## O sistema

App mobile para uma loja de perfumaria e cosméticos controlar produtos, compras, estoque e vendas e acompanhar o
**lucro real** de cada venda: a receita menos o custo dos produtos e os custos da venda (frete, imposto, taxas,
comissão e outros).

## Módulos

| Módulo | Prefixo | O que cobre |
| --- | --- | --- |
| [Acesso](acesso.md) | ACE | Entrar, sair, sessão, troca de senha e senha mestra |
| [Usuários](usuarios.md) | USU | Criar, desativar e reativar os usuários da loja |
| [Loja](loja.md) | LOJ | Dados e configurações da loja |
| [Início](inicio.md) | INI | Resumo do mês, atalhos e navegação |
| [Produtos](produtos.md) | PRO | Produtos, categorias, foto e leitura de código de barras |
| [Compras](compras.md) | COM | Entrada de mercadoria, custo médio e cancelamento de compra |
| [Estoque](estoque.md) | EST | Saldo, valor, validades, movimentações, ajuste e correção de custo |
| [Vendas](vendas.md) | VEN | Registro, lista, lucro real e cancelamento de venda |
| [Clientes](clientes.md) | CLI | Cadastro de clientes e histórico de compras |
| [Revendedoras](revendedoras.md) | REV | Cadastro de revendedoras, vendas e comissões |
| [Relatórios](relatorios.md) | REL | Desempenho da loja por período |
| [Alertas](alertas.md) | ALE | Falta de estoque e validade |
| [Modelo de dados](modelo-de-dados.md) | | Entidades, campos e relações |

## Como ler os módulos

Cada módulo tem as seções abaixo, nesta ordem, e omite as que não se aplicam:

- **Regras funcionais (RF):** o que o usuário pode fazer e como o app se comporta.
- **Regras de negócio (RN):** condições, limites e consequências que valem em qualquer tela.
- **Cálculos:** fórmulas, com exemplo.
- **Fora do escopo:** o que o módulo não faz.

Cada regra tem um código fixo, no formato `RF-VEN-03` ou `RN-VEN-03` (tipo, módulo, número). O código não é
reaproveitado: uma regra removida deixa o número vago, e uma regra nova recebe o próximo número livre do módulo.

## Regras gerais

- **RN-GER-01.** O app depende da internet para ler e gravar dados. Não há uso offline.
- **RN-GER-02.** Todo dado pertence a uma loja. O usuário só lê e altera os dados da própria loja.
- **RN-GER-03.** O sistema atende uma loja. Uma loja tem vários usuários.
- **RN-GER-04.** Nenhum registro é apagado. Cadastros (produto, categoria, cliente, revendedora, usuário) são
  arquivados ou desativados. Lançamentos (compra, venda, movimentação de estoque) não são editados: a correção é um
  registro novo, como cancelamento, ajuste ou correção de custo.
- **RN-GER-05.** Toda criação, alteração e arquivamento fica registrado com autor, data e hora, valores anteriores e
  valores novos. Senhas não entram nesse registro.
- **RN-GER-06.** Uma operação é gravada por inteiro ou não é gravada. Se uma parte falha, nenhuma parte fica salva.
- **RN-GER-07.** O estoque de um produto nunca fica negativo.
- **RN-GER-08.** "Hoje" é o dia no horário de Brasília, independentemente do relógio do celular ou do servidor.
- **RN-GER-09.** Valores em dinheiro são exatos ao centavo. Percentuais aceitam até duas casas decimais, de 0% a 100%.
- **RN-GER-10.** Busca por texto ignora maiúsculas, minúsculas e acentos, e exige que todas as palavras digitadas
  apareçam no registro.
- **RN-GER-11.** Telefone, quando informado, tem DDD (10 ou 11 dígitos) e pode ser digitado com ou sem máscara.
- **RN-GER-12.** Listas longas carregam 30 registros por vez e trazem mais ao rolar até o fim.

## Glossário

| Termo | Significado |
| --- | --- |
| Produto | O tipo de mercadoria, como "Perfume Floral 100ml", e não cada unidade |
| Compra | Uma entrada de mercadoria, com um ou mais itens |
| Lote | As unidades de um item de compra, com a mesma validade. O sistema cria e controla os lotes; o usuário vê só a validade |
| Validade | Mês e ano em que as unidades vencem. A unidade conta como vencida a partir do primeiro dia do mês seguinte |
| Movimentação | Registro de qualquer mudança de quantidade ou de custo de um produto. Nunca é alterada |
| Custo médio | Custo ponderado das unidades em estoque de um produto |
| Valor em estoque | Quantidade em estoque vezes o custo médio |
| Unidade vendável | Unidade em estoque que não está vencida |
| Receita | Valor da venda: soma dos produtos, menos o desconto, mais o acréscimo |
| Custos da venda | Frete, imposto, taxa de plataforma, comissão e outros custos lançados na venda |
| Lucro real | Receita menos o custo dos produtos e os custos da venda |
| Margem | Lucro real dividido pela receita |
| Canal | Onde a venda aconteceu: Loja, Mercado Livre ou Revendedora |
| Arquivar | Tirar um cadastro de uso sem apagá-lo. O cadastro continua no histórico e pode ser reativado |

## Fora do escopo do sistema

- Integração com o Mercado Livre. Mercado Livre é só um canal escolhido na venda.
- Parcelas, juros, cobrança e pagamento parcial das vendas a prazo.
- Consignado e acerto com revendedora.
- Uso offline.
- Várias lojas no app, cadastro de loja pelo app e cobrança.
- Fornecedores.
- Nota fiscal, frente de caixa e pagamentos.
- Notificações push.
- Recuperação de senha por e-mail.
- Exportação de relatórios.
- Permissões diferentes por usuário.
