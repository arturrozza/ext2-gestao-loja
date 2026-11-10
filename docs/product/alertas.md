# Alertas

## Objetivo

Avisar o lojista antes do prejuízo, sem encher de avisos: falta de produto e validade.

## Funcionalidades

- Ver quantos produtos estão em cada alerta, num card por tipo.
- Tocar no card abre a lista de Produtos já filtrada por aquele alerta. De lá, cada produto leva à ação certa: lançar
  compra, ajustar o estoque ou descartar as unidades vencidas.
- A tela inicial mostra o total de alertas no atalho de Alertas.

## Regras

| Alerta | Quando aparece |
| --- | --- |
| Sem estoque | Quantidade zero, em produto com estoque mínimo definido |
| Estoque baixo | Quantidade igual ou abaixo do mínimo, com alguma unidade |
| Vencido | Há unidades com validade passada |
| Perto de vencer | Há unidades que vencem dentro da antecedência de vencimento (30 dias por padrão) |

- O estoque mínimo é como a loja diz "quero acompanhar este produto": sem mínimo, o produto não gera alerta de
  quantidade. Assim, quem cadastra o catálogo inteiro e ainda não comprou tudo não recebe uma enxurrada de avisos.
- A antecedência de vencimento fica nas [configurações da loja](acesso-e-loja.md).
- Os alertas são os mesmos filtros de estoque da lista de Produtos, então o número do card sempre bate com a lista.
- Alertas são calculados a partir dos dados e somem sozinhos quando o problema é resolvido.
- Um produto pode estar em mais de um alerta ao mesmo tempo, e o total da tela inicial conta cada um.
- Produto arquivado não gera alerta. Produto sem validade não gera alerta de vencimento.

## Fora do escopo

Margem baixa, margem negativa e produto parado (a margem por produto fica para os [Relatórios](relatorios.md)),
push notification, e-mail e dispensar alerta.
