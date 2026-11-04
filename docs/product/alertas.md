# Alertas

## Objetivo

Avisar o lojista antes do prejuízo: falta de produto, vencimento, margem ruim e produto encalhado.

## Funcionalidades

- Ver os alertas ativos dentro do app.
- Ir direto para a ação certa, como estoque baixo → lançar compra.

## Regras

| Alerta | Quando aparece |
| --- | --- |
| Estoque baixo | Quantidade igual ou abaixo do mínimo |
| Sem estoque | Quantidade zero (substitui "estoque baixo") |
| Perto de vencer | Falta até 30 dias para a validade |
| Vencido | Há unidades com validade passada |
| Margem baixa | Lucro abaixo de 10% nas vendas dos últimos 60 dias |
| Margem negativa | Prejuízo nas vendas dos últimos 60 dias |
| Produto parado | Tem estoque e não vende há 60 dias |

- Os números 30, 60 e 10% são padrões, editáveis nas [configurações da loja](acesso-e-loja.md).
- Alertas são calculados a partir dos dados e somem sozinhos quando o problema é resolvido.
- Um produto pode ter vários alertas ao mesmo tempo.
- Produto sem validade não gera alerta de vencimento.

## Fora do escopo

Push notification, e-mail e dispensar alerta.

## Em aberto

- Produto com estoque que nunca vendeu: "parado" conta a partir de quando?
