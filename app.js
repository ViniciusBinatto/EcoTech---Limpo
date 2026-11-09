require("dotenv").config();

const express = require("express");
const session = require("express-session");
const path = require("path");

const authRoutes = require("./Routes/auth");
const eletronicosRoutes = require("./Routes/eletronicos");
const adminRoutes = require("./Routes/admin");

const app = express();
const PORT = process.env.PORT || 3000;

if (!process.env.SESSION_SECRET) {
    throw new Error("SESSION_SECRET não foi configurado no arquivo .env");
}

if (!process.env.FIREBASE_API_KEY) {
    throw new Error("FIREBASE_API_KEY não foi configurada no .env");
}

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.static(path.join(__dirname, "Public")));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(session({
    name: "ecotech.sid",
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 1000 * 60 * 60 * 24
    }
}));

app.use((req, res, next) => {
    res.locals.nomeUsuario = req.session.nome || null;
    res.locals.tipoUsuario = req.session.tipo || null;
    next();
});

// ROTAS
app.use(authRoutes);
app.use(eletronicosRoutes);
app.use(adminRoutes);

// PÁGINAS PÚBLICAS
app.get("/", (req, res) => res.render("index"));
app.get("/sobre", (req, res) => res.render("sobre"));
app.get("/ecopontos", (req, res) => res.render("ecopontos"));
// ECOPRODUTOS
app.get("/ecoprodutos", async (req, res) => {
    try {
        const { db } = require("./config/firebase");

        const snapshot = await db
            .ref("produtos")
            .orderByChild("status")
            .equalTo("aprovado")
            .once("value");

        const dados = snapshot.val() || {};

        const produtos = Object.entries(dados).map(([id, produto]) => ({
            id,
            ...produto
        }));

        produtos.sort((a, b) => {
            return new Date(b.aprovadoEm || b.criadoEm || 0) -
                   new Date(a.aprovadoEm || a.criadoEm || 0);
        });

        res.render("ecoprodutos", { produtos });

    } catch (erro) {
        console.error("Erro ao carregar EcoProdutos:", erro);
        res.status(500).send("Não foi possível carregar os EcoProdutos.");
    }
});

// CADASTRO DE ELETRÔNICOS
app.get("/cadastrar-eletronico", (req, res) => {
    if (!req.session.uid) {
        return res.redirect("/login");
    }

    res.render("cadastrarEletronico", {
        erro: null,
        sucesso: req.query.sucesso === "1"
    });
});

// PERFIL
app.get("/perfil", async (req, res) => {
    if (!req.session.uid) {
        return res.redirect("/login");
    }

    try {
        const { db } = require("./config/firebase");

        const [usuarioSnapshot, produtosSnapshot] = await Promise.all([
            db.ref(`usuarios/${req.session.uid}`).once("value"),
            db.ref("produtos")
                .orderByChild("usuarioId")
                .equalTo(req.session.uid)
                .once("value")
        ]);

        const usuario = usuarioSnapshot.val();

        if (!usuario) {
            return req.session.destroy(() => {
                res.redirect("/login");
            });
        }

        const dadosProdutos = produtosSnapshot.val() || {};

        const produtos = Object.entries(dadosProdutos).map(([id, produto]) => ({
            id,
            ...produto
        }));

        produtos.sort((a, b) => {
            return new Date(b.criadoEm || 0) - new Date(a.criadoEm || 0);
        });

        res.render("perfil", {
            usuario,
            produtos
        });

    } catch (erro) {
        console.error("Erro ao carregar perfil:", erro);
        res.status(500).send("Não foi possível carregar seu perfil.");
    }
});

// PÁGINA NÃO ENCONTRADA
app.use((req, res) => {
    res.status(404).send("Página não encontrada.");
});

app.listen(PORT, () => {
    console.log(`EcoTech disponível em http://localhost:${PORT}`);
});