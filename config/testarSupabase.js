require("dotenv").config();

const supabase = require("./supabase");

async function testarSupabase() {
    try {
        const { data, error } = await supabase.storage.listBuckets();

        if (error) {
            throw error;
        }

        console.log("Conexão com o Supabase estabelecida!");

        const bucket = data.find(
            item => item.name === "ecotech-produtos"
        );

        if (bucket) {
            console.log("Bucket ecotech-produtos encontrado!");
        } else {
            console.log("ATENÇÃO: bucket ecotech-produtos não encontrado.");
        }

        process.exit(0);

    } catch (erro) {
        console.error("Erro ao conectar ao Supabase:");
        console.error(erro.message);
        process.exit(1);
    }
}

testarSupabase();