require("dotenv").config();

const { db } = require("./firebase");

async function testarConexao() {
    try {
        await db.ref("/").once("value");

        console.log("Conexão com o Firebase estabelecida!");
        console.log("Banco:", process.env.FIREBASE_DATABASE_URL);

        process.exit(0);
    } catch (erro) {
        console.error("Erro ao conectar ao Firebase:");
        console.error(erro);
        process.exit(1);
    }
}

testarConexao();