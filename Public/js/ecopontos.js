const campoPesquisa = document.getElementById("pesquisaProdutos");
const botoesCategorias = document.querySelectorAll(".categoria-btn");
const produtos = document.querySelectorAll(".produto-item");
const mensagemVazia = document.getElementById("produtosVazios");

let categoriaSelecionada = "todos";

function filtrarProdutos() {
    const pesquisa = campoPesquisa.value
        .toLowerCase()
        .trim();

    let quantidadeVisivel = 0;

    produtos.forEach(produto => {
        const nome = produto.dataset.nome.toLowerCase();
        const marca = produto.dataset.marca.toLowerCase();
        const modelo = produto.dataset.modelo.toLowerCase();
        const categoria = produto.dataset.categoria;

        const correspondePesquisa =
            nome.includes(pesquisa) ||
            marca.includes(pesquisa) ||
            modelo.includes(pesquisa);

        const correspondeCategoria =
            categoriaSelecionada === "todos" ||
            categoria === categoriaSelecionada;

        const mostrar =
            correspondePesquisa && correspondeCategoria;

        produto.style.display = mostrar ? "" : "none";

        if (mostrar) {
            quantidadeVisivel++;
        }
    });

    mensagemVazia.style.display =
        quantidadeVisivel === 0 ? "block" : "none";
}

campoPesquisa.addEventListener("input", filtrarProdutos);

botoesCategorias.forEach(botao => {
    botao.addEventListener("click", () => {
        botoesCategorias.forEach(item => {
            item.classList.remove("active");
        });

        botao.classList.add("active");

        categoriaSelecionada = botao.dataset.categoria;

        filtrarProdutos();
    });
});

// PREENCHER MODAL COM OS DADOS DO PRODUTO

const modalProduto = document.getElementById("modalProduto");

modalProduto.addEventListener("show.bs.modal", evento => {
    const botao = evento.relatedTarget;

    document.getElementById("modalProdutoTitulo").textContent =
        botao.dataset.nome;

    document.getElementById("modalProdutoCategoria").textContent =
        botao.dataset.categoria;

    document.getElementById("modalProdutoDescricao").textContent =
        botao.dataset.descricao;

    document.getElementById("modalProdutoPreco").textContent =
        botao.dataset.preco;
});