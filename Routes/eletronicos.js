
const express = require("express");
const multer = require("multer");
const { randomUUID } = require("crypto");

const { db } = require("../config/firebase");
const supabase = require("../config/supabase");

const router = express.Router();

const BUCKET = "ecotech-produtos";
const LIMITE_FOTO = 5 * 1024 * 1024;

const API_CELULARES = "https://api-mobilespecs.azharimm.dev";

const tiposPermitidos = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp"
};

const marcasManuais = {
    tablets: ["Apple", "Samsung", "Lenovo", "Xiaomi", "Motorola", "Outra"],
    laptops: ["Dell", "Lenovo", "HP", "Acer", "Asus", "Apple", "Samsung", "Outra"],
    monitors: ["Samsung", "LG", "Philips", "TCL", "Sony", "Outra"],
    perifericos: ["Logitech", "Razer", "HyperX", "Redragon", "Corsair", "Outra"],
    console: ["Sony", "Microsoft", "Nintendo", "Outra"],
    impressora: ["HP", "Epson", "Canon", "Brother", "Outra"],
    outros: ["Samsung", "Apple", "LG", "Sony", "Outra"]
};

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: LIMITE_FOTO,
        files: 1
    },
    fileFilter: (req, file, callback) => {
        if (!tiposPermitidos[file.mimetype]) {
            return callback(
                new Error("Formato inválido. Envie uma imagem JPG, PNG ou WEBP.")
            );
        }

        callback(null, true);
    }
});

function exigirLogin(req, res, next) {
    if (!req.session.uid) {
        return res.redirect("/login");
    }

    next();
}

function receberFoto(req, res, next) {
    upload.single("foto")(req, res, (erro) => {
        if (!erro) return next();

        let mensagem = erro.message;

        if (erro instanceof multer.MulterError) {
            mensagem = erro.code === "LIMIT_FILE_SIZE"
                ? "A foto deve ter no máximo 5 MB."
                : "Não foi possível receber a foto selecionada.";
        }

        return res.status(400).render("cadastrarEletronico", {
            erro: mensagem,
            sucesso: false
        });
    });
}

async function consultarAPI(caminho) {
    const resposta = await fetch(`${API_CELULARES}${caminho}`, {
        headers: {
            Accept: "application/json"
        },
        signal: AbortSignal.timeout(15000)
    });

    if (!resposta.ok) {
        throw new Error(`API respondeu com status ${resposta.status}`);
    }

    return resposta.json();
}

function extrairLista(resultado) {
    const dados = resultado?.data;

    if (Array.isArray(dados)) return dados;
    if (Array.isArray(dados?.phones)) return dados.phones;
    if (Array.isArray(dados?.data)) return dados.data;
    if (Array.isArray(resultado?.results)) return resultado.results;

    return [];
}

function extrairValorEspecificacao(dados, palavras) {
    const secoes = dados?.specifications || dados?.specs || [];

    for (const secao of secoes) {
        const itens = secao.specs || secao.values || [];

        for (const item of itens) {
            const chave = String(item.key || item.name || "").toLowerCase();

            if (palavras.some(palavra => chave.includes(palavra))) {
                const valor = item.val ?? item.value;

                if (Array.isArray(valor)) {
                    return valor.join(", ");
                }

                return valor ? String(valor) : "";
            }
        }
    }

    return "";
}

/* =========================================
   API: MARCAS
   ========================================= */

router.get("/api/ecotech/marcas", async (req, res) => {
    try {
        const categoria = String(req.query.categoria || "").toLowerCase();

        if (categoria === "smartphones") {
            const resultado = await consultarAPI("/brands");

            const marcas = extrairLista(resultado)
                .map(item => ({
                    name: item.brand_name || item.name,
                    slug: item.brand_slug || item.slug
                }))
                .filter(item => item.name && item.slug);

            return res.json(marcas);
        }

        const marcas = marcasManuais[categoria];

        if (!marcas) {
            return res.status(400).json({
                erro: "Categoria não suportada."
            });
        }

        return res.json(
            marcas.map(nome => ({
                name: nome,
                slug: nome
            }))
        );

    } catch (erro) {
        console.error("Erro ao consultar marcas:", erro);

        res.status(502).json({
            erro: "Não foi possível carregar as marcas."
        });
    }
});

/* =========================================
   API: MODELOS DE CELULAR
   ========================================= */

router.get("/api/ecotech/modelos", async (req, res) => {
    try {
        const categoria = String(req.query.categoria || "").toLowerCase();
        const marca = String(req.query.marca || "").trim();

        if (categoria !== "smartphones" || !/^[a-z0-9-]+$/i.test(marca)) {
            return res.status(400).json({
                erro: "Categoria ou marca inválida."
            });
        }

        const resultado = await consultarAPI(
            `/brands/${encodeURIComponent(marca)}`
        );

        const modelos = extrairLista(resultado)
            .map(item => ({
                name: item.phone_name || item.name,
                slug: item.slug || item.phone_slug
            }))
            .filter(item => item.name && item.slug);

        res.json(modelos);

    } catch (erro) {
        console.error("Erro ao consultar modelos:", erro);

        res.status(502).json({
            erro: "Não foi possível carregar os modelos."
        });
    }
});

/* =========================================
   API: ESPECIFICAÇÕES DO CELULAR
   ========================================= */

router.get("/api/ecotech/especificacoes", async (req, res) => {
    try {
        const categoria = String(req.query.categoria || "").toLowerCase();
        const marca = String(req.query.marca || "").trim();
        const modelo = String(req.query.modelo || "").trim();

        if (
            categoria !== "celular" ||
            !/^[a-z0-9-]+$/i.test(marca) ||
            !/^[a-z0-9_-]+$/i.test(modelo)
        ) {
            return res.status(400).json({
                erro: "Dados do aparelho inválidos."
            });
        }

        const dados = await consultarAPI(
            `/brands/${encodeURIComponent(marca)}/${encodeURIComponent(modelo)}`
        );

        const aparelho = dados?.data || dados;

        const memoria = extrairValorEspecificacao(aparelho, [
            "internal memory",
            "ram"
        ]);

        const armazenamento = extrairValorEspecificacao(aparelho, [
            "internal memory"
        ]);

        const ram = extrairValorEspecificacao(aparelho, [
            "ram"
        ]);

        const tela = extrairValorEspecificacao(aparelho, [
            "size",
            "display"
        ]);

        const processador = extrairValorEspecificacao(aparelho, [
            "chipset",
            "cpu"
        ]);

        res.json({
            nome: aparelho.phone_name || aparelho.name || "",
            ram: ram || memoria,
            armazenamento,
            tamanhoTela: tela,
            processador
        });

    } catch (erro) {
        console.error("Erro ao consultar especificações:", erro);

        res.status(502).json({
            erro: "Não foi possível carregar as especificações."
        });
    }
});

/* =========================================
   CADASTRO DE ELETRÔNICOS
   ========================================= */

router.post(
    "/cadastrar-eletronico",
    exigirLogin,
    receberFoto,
    async (req, res) => {
        let caminhoFoto = null;

        try {
            const categoria = String(req.body.categoria || "").trim();
            const marca = String(req.body.marca || "").trim();
            const modelo = String(req.body.modelo || "").trim();
            const funcionamento = String(req.body.funcionamento || "").trim();
            const descricao = String(req.body.descricao || "").trim();
            const problema = String(req.body.problema || "").trim();
            const precoTexto = String(req.body.preco || "").trim();

            const ram = String(req.body.ram || "").trim();
            const armazenamento = String(req.body.armazenamento || "").trim();
            const tamanhoTela = String(req.body.tamanhoTela || "").trim();
            const processador = String(req.body.processador || "").trim();

            const categoriasPermitidas = [
                "celular",
                "computador",
                "tablet",
                "televisao",
                "perifericos",
                "console",
                "impressora",
                "outros"
            ];

            const estadosPermitidos = [
                "funcionando",
                "parcial",
                "defeito",
                "nao_liga"
            ];

            if (
                !categoriasPermitidas.includes(categoria) ||
                !estadosPermitidos.includes(funcionamento) ||
                !marca ||
                !modelo ||
                !descricao
            ) {
                return res.status(400).render("cadastrarEletronico", {
                    erro: "Confira os campos obrigatórios do formulário.",
                    sucesso: false
                });
            }

            if (
                marca.length > 80 ||
                modelo.length > 100 ||
                descricao.length > 500 ||
                problema.length > 300 ||
                ram.length > 50 ||
                armazenamento.length > 50 ||
                tamanhoTela.length > 50 ||
                processador.length > 100
            ) {
                return res.status(400).render("cadastrarEletronico", {
                    erro: "Um ou mais campos ultrapassaram o limite de caracteres.",
                    sucesso: false
                });
            }

            let preco = null;

            if (precoTexto !== "") {
                preco = Number(precoTexto);

                if (!Number.isFinite(preco) || preco < 0 || preco > 10000000) {
                    return res.status(400).render("cadastrarEletronico", {
                        erro: "Informe um preço válido.",
                        sucesso: false
                    });
                }
            }

            let fotoUrl = null;

            if (req.file) {
                const extensao = tiposPermitidos[req.file.mimetype];

                caminhoFoto =
                    `produtos/${req.session.uid}/${randomUUID()}.${extensao}`;

                const { error: erroUpload } = await supabase
                    .storage
                    .from(BUCKET)
                    .upload(caminhoFoto, req.file.buffer, {
                        contentType: req.file.mimetype,
                        cacheControl: "3600",
                        upsert: false
                    });

                if (erroUpload) {
                    throw new Error("Não foi possível enviar a foto. Tente novamente.");
                }

                const resultadoFoto = supabase
                    .storage
                    .from(BUCKET)
                    .getPublicUrl(caminhoFoto);

                fotoUrl = resultadoFoto.data.publicUrl;
            }

            const novoProduto = {
                usuarioId: req.session.uid,
                nome: `${marca} ${modelo}`,
                categoria,
                marca,
                modelo,
                ram,
                armazenamento,
                tamanhoTela,
                processador,
                funcionamento,
                descricao,
                problema,
                preco,
                fotoUrl,
                fotoPath: caminhoFoto,
                status: "pendente",
                criadoEm: new Date().toISOString()
            };

            const referencia = db.ref("produtos").push();

            await referencia.set(novoProduto);

            return res.redirect("/cadastrar-eletronico?sucesso=1");

        } catch (erro) {
            console.error("Erro ao cadastrar eletrônico:", erro);

            if (caminhoFoto) {
                try {
                    await supabase.storage
                        .from(BUCKET)
                        .remove([caminhoFoto]);
                } catch (erroRemocao) {
                    console.error("Não foi possível remover a foto:", erroRemocao);
                }
            }

            return res.status(500).render("cadastrarEletronico", {
                erro: "Não foi possível cadastrar o eletrônico. Tente novamente.",
                sucesso: false
            });
        }
    }
);

module.exports = router;
