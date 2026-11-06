# Produtos

## Objetivo

Cadastrar e encontrar rapidamente os produtos da loja, que são a base de estoque, vendas, relatórios e alertas. A lista e
a tela do produto também concentram o [Estoque](estoque.md).

## Funcionalidades

- Cadastrar e editar produto.
- Buscar por nome, código interno ou código de barras.
- Ler o código de barras pela câmera no cadastro, na busca, na venda e na compra.
- Ver a foto do produto em tela cheia, com zoom.
- Arquivar e reativar produto.
- Criar, renomear, arquivar e reativar categorias, e filtrar a lista por elas.
- Tirar ou escolher uma foto.

## Regras

- Obrigatórios: nome e preço base.
- Opcionais: foto, categoria, código de barras, código interno, estoque mínimo, localização e "tem validade".
- Código interno e código de barras não se repetem na loja, contando os produtos arquivados. No código interno,
  maiúsculas e minúsculas contam como iguais ("mm-01" e "MM-01" são o mesmo).
- O produto nasce com estoque zero e custo zero. Estoque e custo não são digitados no cadastro nem na edição.
- Ao salvar um produto novo, o app sugere "Cadastrar primeira entrada", com o produto já selecionado. Dá para pular.
- O preço base é maior que zero.
- O nome do produto pode se repetir; quem identifica são os códigos.
- Produto não é excluído, só arquivado. Arquivado não entra em novas compras ou vendas, mas continua no histórico e nos
  relatórios.
- Produto arquivado não se edita: para mudar algo, primeiro reativa.
- Quantidades são sempre inteiras. Um kit é cadastrado como um produto próprio.
- A categoria é um cadastro da loja, só com nome. Cada produto tem no máximo uma.
- O nome da categoria não se repete na loja, contando as arquivadas (sem diferenciar maiúsculas e acentos).
- Categoria não é excluída, só arquivada. Arquivada não aparece para escolher no cadastro nem no filtro, mas os
  produtos que já estão nela continuam com ela, inclusive nos relatórios. Dá para reativar.
- Sem foto, aparece um ícone no lugar (nas listas, as iniciais do nome).
- A foto é uma por produto, tirada na hora ou escolhida da galeria, e recortada em quadrado. O app reduz a foto antes de
  enviar, então ela chega leve.
- Trocar ou remover a foto não apaga a anterior: ela continua guardada, como tudo no sistema.
- Ler um código de barras na venda ou na compra já adiciona o produto que tem esse código, sem precisar tocar nele, e
  deixa a busca pronta para o próximo.
- Na lista de produtos, ler ou digitar um código de barras que nenhum produto tem oferece cadastrar um produto com
  ele, já preenchido.
- O preço base é o preço normal de venda, sugerido na venda e editável nela.

## Ainda não disponível no app

O estoque na lista e na tela do produto e a sugestão de "Cadastrar primeira entrada" chegam com Compras e Estoque. Até
lá, o estoque aparece como "—".

## Fora do escopo

Embalagem, marca, fornecedor, referência de fábrica, NCM/CEST e peso.
