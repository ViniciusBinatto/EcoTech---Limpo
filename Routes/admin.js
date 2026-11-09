const express = require("express");
const { db } = require("../config/firebase");

const router = express.Router();

// Proteção: somente administradores
function exigirAdmin(req, res, next) {
    if (!req.session.uid) {
        return res.redirect("/login");
    }

    if (req.session.tipo !== "admin") {
        return res.status(403).send("Acesso não autorizado.");
    }

    next();
}

// PAINEL ADMINISTRATIVO
router.get("/admin", exigirAdmin, async (req, res) => {
    try {
        const snapshot = await db.ref("produtos").once("value");
        const dados = snapshot.val() || {};

        const produtos = Object.entries(dados)
            .map(([id, produto]) => ({
                id,
                ...produto
            }))
            .filter(produto => produto.status === "pendente")
            .sort((a, b) => {
                return new Date(a.criadoEm || 0) - new Date(b.criadoEm || 0);
            });

        const produtosComUsuario = await Promise.all(
            produtos.map(async produto => {
                const usuarioSnapshot = await db
                    .ref(`usuarios/${produto.usuarioId}`)
                    .once("value");

                const usuario = usuarioSnapshot.val();

                return {
                    ...produto,
                    nomeUsuario: usuario?.nome || "Usuário não encontrado",
                    emailUsuario: usuario?.email || ""
                };
            })
        );

        res.render("admin/index", {
            produtos: produtosComUsuario,
            mensagem: req.query.mensagem || null
        });

    } catch (erro) {
        console.error("Erro ao carregar painel administrativo:", erro);
        res.status(500).send("Não foi possível carregar o painel administrativo.");
    }
});

// APROVAR PRODUTO
router.post("/admin/aprovar/:id", exigirAdmin, async (req, res) => {
    try {
        const referencia = db.ref(`produtos/${req.params.id}`);
        const snapshot = await referencia.once("value");

        if (!snapshot.exists()) {
            return res.status(404).send("Produto não encontrado.");
        }

        const produto = snapshot.val();

        if (produto.status !== "pendente") {
            return res.redirect("/admin?mensagem=Produto+ja+processado");
        }

        await referencia.update({
            status: "aprovado",
            aprovadoEm: new Date().toISOString(),
            aprovadoPor: req.session.uid
        });

        res.redirect("/admin?mensagem=Produto+aprovado");

    } catch (erro) {
        console.error("Erro ao aprovar produto:", erro);
        res.status(500).send("Não foi possível aprovar o produto.");
    }
});

// REJEITAR PRODUTO
router.post("/admin/rejeitar/:id", exigirAdmin, async (req, res) => {
    try {
        const referencia = db.ref(`produtos/${req.params.id}`);
        const snapshot = await referencia.once("value");

        if (!snapshot.exists()) {
            return res.status(404).send("Produto não encontrado.");
        }

        const produto = snapshot.val();

        if (produto.status !== "pendente") {
            return res.redirect("/admin?mensagem=Produto+ja+processado");
        }

        await referencia.update({
            status: "rejeitado",
            rejeitadoEm: new Date().toISOString(),
            rejeitadoPor: req.session.uid
        });

        res.redirect("/admin?mensagem=Produto+rejeitado");

    } catch (erro) {
        console.error("Erro ao rejeitar produto:", erro);
        res.status(500).send("Não foi possível rejeitar o produto.");
    }
});

module.exports = router;