
const {
    initializeApp,
    cert,
    getApps
} = require("firebase-admin/app");

const {
    getDatabase
} = require("firebase-admin/database");

if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT não configurada.");
}

if (!process.env.FIREBASE_DATABASE_URL) {
    throw new Error("FIREBASE_DATABASE_URL não configurada.");
}

let serviceAccount;

try {
    serviceAccount = JSON.parse(
        process.env.FIREBASE_SERVICE_ACCOUNT
    );
} catch (erro) {
    throw new Error("A credencial do Firebase Admin SDK não é um JSON válido.");
}

const app = getApps().length
    ? getApps()[0]
    : initializeApp({
        credential: cert(serviceAccount),
        databaseURL: process.env.FIREBASE_DATABASE_URL
    });

const db = getDatabase(app);

module.exports = {
    app,
    db
};
