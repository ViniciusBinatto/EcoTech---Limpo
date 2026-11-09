
const categoria = document.getElementById("categoria");
const marca = document.getElementById("marca");
const modelo = document.getElementById("modelo");
const aviso = document.getElementById("avisoCatalogo");

const modeloManual = document.getElementById("modeloManual");
const especificacoes = document.getElementById("especificacoes");

const campos = {
    ram: document.getElementById("campoRam"),
    armazenamento: document.getElementById("campoArmazenamento"),
    tela: document.getElementById("campoTela"),
    processador: document.getElementById("campoProcessador")
};

const entradas = {
    ram: document.getElementById("ram"),
    armazenamento: document.getElementById("armazenamento"),
    tamanhoTela: document.getElementById("tamanhoTela"),
    processador: document.getElementById("processador")
};

const categoriasApi = {
    celular: "smartphones",
    tablet: "tablets",
    computador: "laptops",
    televisao: "monitors",
    perifericos: "perifericos",
    console: "console",
    impressora: "impressora",
    outros: "outros"
};

function limparEspecificacoes() {
    Object.values(entradas).forEach(campo => {
        if (campo) campo.value = "";
    });
}

function preencherSelect(select, itens, textoInicial) {
    select.innerHTML = "";
    select.add(new Option(textoInicial, ""));

    itens.forEach(item => {
        select.add(new Option(item.nome, item.valor));
    });
}

function configurarCampos(tipo) {
    Object.values(campos).forEach(campo => {
        if (campo) campo.hidden = true;
    });

    if (tipo === "celular" || tipo === "tablet") {
        campos.ram.hidden = false;
        campos.armazenamento.hidden = false;
        campos.tela.hidden = false;
    } else if (tipo === "computador") {
        campos.ram.hidden = false;
        campos.armazenamento.hidden = false;
        campos.processador.hidden = false;
    } else if (tipo === "televisao") {
        campos.tela.hidden = false;
    } else if (tipo === "console") {
        campos.armazenamento.hidden = false;
    }

    especificacoes.hidden = !Object.values(campos).some(campo => !campo.hidden);
}

function configurarModeloManual() {
    modelo.disabled = true;
    modelo.removeAttribute("name");

    modeloManual.hidden = false;
    modeloManual.disabled = false;
    modeloManual.name = "modelo";
    modeloManual.required = true;
    modeloManual.value = "";
}

function configurarModeloCatalogo() {
    modeloManual.hidden = true;
    modeloManual.disabled = true;
    modeloManual.removeAttribute("name");
    modeloManual.value = "";

    modelo.disabled = false;
    modelo.name = "modelo";
    modelo.required = true;
}

categoria.addEventListener("change", async () => {
    const tipo = categoria.value;

    limparEspecificacoes();
    configurarCampos(tipo);

    marca.disabled = true;
    modelo.disabled = true;
    modeloManual.hidden = true;
    modeloManual.disabled = true;
    modeloManual.removeAttribute("name");

    preencherSelect(marca, [], "Carregando marcas...");
    preencherSelect(modelo, [], "Selecione primeiro a marca");

    aviso.textContent = "";

    if (!tipo) {
        preencherSelect(marca, [], "Selecione primeiro o tipo");
        return;
    }

    try {
        const resposta = await fetch(
            `/api/ecotech/marcas?categoria=${categoriasApi[tipo]}`
        );

        if (!resposta.ok) {
            throw new Error("Não foi possível carregar as marcas.");
        }

        const dados = await resposta.json();

        preencherSelect(
            marca,
            dados.map(item => ({
                nome: item.nome || item.name,
                valor: item.valor || item.slug || item.nome || item.name
            })),
            "Selecione uma marca"
        );

        marca.disabled = false;
        aviso.textContent = tipo === "celular"
            ? "Selecione a marca para carregar os modelos."
            : "Selecione a marca e informe o modelo manualmente.";

    } catch (erro) {
        console.error(erro);
        preencherSelect(marca, [], "Marcas indisponíveis");
        aviso.textContent = "Não foi possível carregar as marcas.";
    }
});

marca.addEventListener("change", async () => {
    const tipo = categoria.value;
    const nomeMarca = marca.value;

    limparEspecificacoes();

    preencherSelect(modelo, [], "Selecione primeiro a marca");

    if (!nomeMarca) {
        modelo.disabled = true;
        modeloManual.hidden = true;
        modeloManual.disabled = true;
        modeloManual.removeAttribute("name");
        return;
    }

    if (tipo !== "celular") {
        configurarModeloManual();
        aviso.textContent = "Digite o modelo do aparelho.";
        return;
    }

    configurarModeloCatalogo();
    modelo.disabled = true;

    try {
        const resposta = await fetch(
            `/api/ecotech/modelos?categoria=smartphones&marca=${encodeURIComponent(nomeMarca)}`
        );

        if (!resposta.ok) {
            throw new Error("Não foi possível carregar os modelos.");
        }

        const dados = await resposta.json();

        preencherSelect(
            modelo,
            dados.map(item => ({
                nome: item.nome || item.name,
                valor: item.valor || item.slug || item.nome || item.name
            })),
            "Selecione um modelo"
        );

        modelo.disabled = false;
        aviso.textContent = "Selecione o modelo para preencher as especificações.";

    } catch (erro) {
        console.error(erro);
        aviso.textContent = "Não foi possível carregar os modelos.";
    }
});

modelo.addEventListener("change", async () => {
    limparEspecificacoes();

    if (categoria.value !== "celular" || !modelo.value) return;

    try {
        const resposta = await fetch(
            `/api/ecotech/especificacoes?categoria=celular&marca=${encodeURIComponent(marca.value)}&modelo=${encodeURIComponent(modelo.value)}`
        );

        if (!resposta.ok) return;

        const dados = await resposta.json();

        entradas.ram.value = dados.ram || "";
        entradas.armazenamento.value = dados.armazenamento || "";
        entradas.tamanhoTela.value = dados.tamanhoTela || "";
        entradas.processador.value = dados.processador || "";

    } catch (erro) {
        console.error("Erro ao carregar especificações:", erro);
    }
});
