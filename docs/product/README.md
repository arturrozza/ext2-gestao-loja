# Produto

> Fonte da verdade do que o sistema faz e das regras de negócio. Leia o módulo antes de implementar. Mudou uma regra?
> Atualize o módulo na mesma mudança e registre o porquê em [`../decisions.md`](../decisions.md).
> Estes documentos ficam no nível de negócio: rotas, tabelas e bibliotecas ficam nos outros docs.

## O que é

App mobile para uma loja de perfumaria e cosméticos controlar estoque, compras e vendas e saber o **lucro real** de cada
venda. O preço de compra varia, o preço de venda muda e cada canal tem custos próprios, então o lojista não sabe quanto
lucra de verdade. O cliente usa hoje o app de vendas do Pedido OK.

A base são os documentos da EXT1 ([`gugeldev/ext.1`](https://github.com/gugeldev/ext.1)), revisados com o mantenedor em
2026-11-04. Em caso de divergência, vale o que está aqui.

## Módulos

| Módulo | O que permite fazer |
| --- | --- |
| [Acesso e loja](acesso-e-loja.md) | Entrar, sair, trocar a senha, editar dados e configurações da loja |
| [Produtos](produtos.md) | Cadastrar, buscar, editar, arquivar e reativar produtos e categorias |
| [Compras](compras.md) | Lançar e cancelar entradas de mercadoria, com custo e validade |
| [Estoque](estoque.md) | Ver saldo, valor, validades e movimentações; ajustar quantidade e corrigir custo |
| [Vendas](vendas.md) | Registrar e cancelar vendas, com canal, custos e lucro real |
| [Revendedoras](revendedoras.md) | Cadastrar, calcular comissão, ver vendas e comissões |
| [Clientes](clientes.md) | Cadastrar clientes fixos e ver o histórico de compras (a confirmar) |
| [Relatórios](relatorios.md) | Ver lucro, custos, canais, produtos e comissões por período |
| [Alertas](alertas.md) | Ser avisado sobre estoque, validade, margem e produto parado |

A tela inicial mostra o resumo do mês e dá acesso a todos os módulos, agrupados em três seções de três: Dia a dia
(vendas, compras, produtos), Pessoas (clientes, revendedoras, usuários) e Gestão (relatórios, alertas, dados da
loja). Os alertas ativos aparecem como um número no atalho de Alertas. Embaixo, uma barra com Início, Vendas e Estoque
e um botão "+" que abre as ações de cadastro: nova venda, nova compra, novo produto e novo cliente.

## Regras gerais

- **Online-first:** o app depende da internet, sem uso offline.
- **Dados por loja:** todo dado pertence a uma loja. O MVP atende uma só, mas o sistema já separa os dados por loja e
  permite vários usuários por loja.
- **Nada se apaga nem se reescreve:** correção é sempre um registro novo, como cancelamento, ajuste ou estorno. Cadastros
  são arquivados, não excluídos.
- **Auditoria:** todo registro guarda quem fez e quando, além da data do fato.
- **Tudo ou nada:** se uma operação falhar no meio, nada dela é gravado.
- **Estoque nunca fica negativo.**

## Glossário

| Termo | Significado |
| --- | --- |
| Produto | O tipo de mercadoria, como "Perfume Floral 100ml", não cada unidade |
| Compra | Uma entrada de mercadoria, com um ou mais itens |
| Lote | As unidades de um item de compra. O app cria e controla sozinho; a pessoa só vê a validade |
| Movimentação | Qualquer mudança de quantidade ou custo. Forma um histórico que nunca é alterado |
| Custo médio | Custo ponderado das unidades em estoque de um produto |
| Receita | Valor da venda, já com desconto e acréscimo |
| Lucro real | Receita menos custo dos produtos e custos da venda |
| Margem | Lucro real dividido pela receita |

## Fora do MVP

- Integração com o Mercado Livre: ele é só um canal escolhido na venda manual.
- Contas a receber, fiado e parcelas controladas.
- Consignado e acerto de revendedora.
- Uso offline.
- Várias lojas no app, cadastro de loja pelo app e cobrança.
- Fornecedores.
- Nota fiscal, frente de caixa e pagamentos.
- Push notifications.
- Onboarding guiado.
- Recuperação de senha por e-mail.
- Exportação de relatórios.
- Metas, equipes, agenda e impressão, presentes no Pedido OK.

## Validar com o cliente

O desenvolvimento segue com os padrões abaixo, que já estão nos módulos. Nada aqui bloqueia o trabalho: o cliente
confirma ao testar. Se algo mudar, atualize o módulo e registre o porquê em [`../decisions.md`](../decisions.md).

**Antes de ele começar a usar:**

- Quantos produtos a loja tem hoje, e ele sabe o custo deles? Com muitos produtos, vale uma importação por planilha em vez
  de cadastrar um por um.

**Nos testes:**

| Ponto | Padrão adotado |
| --- | --- |
| Usuários | O dono entra primeiro e cria os outros pelo app, todos com as mesmas permissões; permissões entram se ele pedir |
| Lojas | Uma loja |
| Revendedora | Só comissão, sem consignado nem acerto (o mantenedor acha que é assim) |
| Taxa do Mercado Livre e imposto | Percentuais configuráveis, editáveis em cada venda |
| Conta do lucro real | Como em [Vendas](vendas.md#lucro-real) |
| Fiado e parcelas | Fora do MVP; a condição de pagamento é só informativa |
| Clientes | Cadastro opcional na venda |
| Pedido OK | Ele compara ao usar; o mantenedor lembra, sem certeza, de reclamações sobre estoque editado na mão e custo calculado manualmente |
