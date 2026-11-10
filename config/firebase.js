
const {
    initializeApp,
    cert,
    getApps
} = require("firebase-admin/app");

const {
    getDatabase
} = require("firebase-admin/database");

const path = require("path");

const serviceAccount = require(
    path.join(__dirname, "firebase-admin.json")
);

if (!process.env.FIREBASE_DATABASE_URL) {
    throw new Error("FIREBASE_DATABASE_URL não configurada.");
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
