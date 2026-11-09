
const express = require("express");
const router = express.Router();

const { app, db } = require("../config/firebase");
const { getAuth } = require("firebase-admin/auth");

const auth = getAuth(app);

const API_KEY = process.env.FIREBASE_API_KEY;

async function autenticarFirebase(endpoint, dados) {
    const resposta = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:${endpoint}?key=${API_KEY}`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                ...dados,
                returnSecureToken: true
            })
        }
    );

    const resultado = await resposta.json();

    if (!resposta.ok) {
        const codigo = resultado.error?.message;

        const mensagens = {
            EMAIL_EXISTS: "Este e-mail já está cadastrado.",
            INVALID_EMAIL: "O e-mail informado é inválido.",
            WEAK_PASSWORD: "A senha precisa ter pelo menos 6 caracteres.",
            INVALID_LOGIN_CREDENTIALS: "E-mail ou senha incorretos.",
            EMAIL_NOT_FOUND: "E-mail ou senha incorretos.",
            INVALID_PASSWORD: "E-mail ou senha incorretos.",
            USER_DISABLED: "Esta conta está desativada."
        };

        throw new Error(
            mensagens[codigo] || "Não foi possível realizar a operação."
        );
    }

    return resultado;
}

// PÁGINA DE CADASTRO
router.get("/cadastro", (req, res) => {
    res.render("cadastro", {
        erro: null
    });
});

// REALIZAR CADASTRO
router.post("/cadastro", async (req, res) => {
    try {
        const nome = String(req.body.nome || "").trim();
        const email = String(req.body.email || "").trim().toLowerCase();
        const senha = String(req.body.senha || "");

        if (!nome || !email || !senha) {
            return res.status(400).render("cadastro", {
                erro: "Preencha todos os campos."
            });
        }

        if (nome.length > 80) {
            return res.status(400).render("cadastro", {
                erro: "O nome deve ter até 80 caracteres."
            });
        }

        if (senha.length < 6) {
            return res.status(400).render("cadastro", {
                erro: "A senha precisa ter pelo menos 6 caracteres."
            });
        }

        const usuario = await autenticarFirebase("signUp", {
            email,
            password: senha
        });

        await db.ref(`usuarios/${usuario.localId}`).set({
            nome,
            email,
            tipo: "usuario",
            criadoEm: new Date().toISOString()
        });

        req.session.uid = usuario.localId;
        req.session.nome = nome;
        req.session.tipo = "usuario";

        res.redirect("/perfil");

    } catch (erro) {
        console.error("Erro no cadastro:", erro.message);

        res.status(400).render("cadastro", {
            erro: erro.message
        });
    }
});

// PÁGINA DE LOGIN
router.get("/login", (req, res) => {
    res.render("login", {
        erro: null
    });
});

// REALIZAR LOGIN
router.post("/login", async (req, res) => {
    try {
        const email = String(req.body.email || "").trim().toLowerCase();
        const senha = String(req.body.senha || "");

        if (!email || !senha) {
            return res.status(400).render("login", {
                erro: "Informe seu e-mail e sua senha."
            });
        }

        const usuario = await autenticarFirebase("signInWithPassword", {
            email,
            password: senha
        });

        const tokenVerificado = await auth.verifyIdToken(usuario.idToken);

        const snapshot = await db
            .ref(`usuarios/${tokenVerificado.uid}`)
            .once("value");

        const dadosUsuario = snapshot.val();

        if (!dadosUsuario) {
            return res.status(403).render("login", {
                erro: "Os dados desta conta não foram encontrados."
            });
        }

        req.session.uid = tokenVerificado.uid;
        req.session.nome = dadosUsuario.nome;
        req.session.tipo = dadosUsuario.tipo || "usuario";

        res.redirect(
    dadosUsuario.tipo === "admin" ? "/admin" : "/perfil"
);

    } catch (erro) {
        console.error("Erro no login:", erro.message);

        res.status(400).render("login", {
            erro: erro.message
        });
    }
});

// REALIZAR LOGOUT
router.post("/logout", (req, res) => {
    req.session.destroy((erro) => {
        if (erro) {
            console.error("Erro ao sair:", erro);
            return res.status(500).send("Não foi possível encerrar a sessão.");
        }

        res.clearCookie("connect.sid");
        res.redirect("/");
    });
});

module.exports = router;
