# Produtos

## Objetivo

Cadastrar e encontrar rapidamente os produtos da loja, que são a base de estoque, vendas, relatórios e alertas. A lista e
a tela do produto também concentram o [Estoque](estoque.md).

## Funcionalidades

- Cadastrar e editar produto.
- Buscar por nome, código interno ou código de barras.
- Ler o código de barras pela câmera no cadastro, na busca, na venda e na compra.
- Arquivar e reativar produto.
- Criar categorias e filtrar a lista por elas.
- Tirar ou escolher uma foto.

## Regras

- Obrigatórios: nome e preço base.
- Opcionais: foto, categoria, código de barras, código interno, estoque mínimo, localização e "tem validade".
- Código interno e código de barras não se repetem na loja, contando os produtos arquivados.
- O produto nasce com estoque zero e custo zero. Estoque e custo não são digitados no cadastro nem na edição.
- Ao salvar um produto novo, o app sugere "Cadastrar primeira entrada", com o produto já selecionado. Dá para pular.
- Produto não é excluído, só arquivado. Arquivado não entra em novas compras ou vendas, mas continua no histórico e nos
  relatórios.
- Quantidades são sempre inteiras. Um kit é cadastrado como um produto próprio.
- A categoria é um cadastro da loja, só com nome. Cada produto tem no máximo uma.
- Sem foto, aparece um ícone no lugar.
- O preço base é o preço normal de venda, sugerido na venda e editável nela.

## Fora do escopo

Embalagem, marca, fornecedor, referência de fábrica, NCM/CEST e peso.
