const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const port = 3000;

// SQLite3-Datenbankverbindung
const db = new sqlite3.Database('./database.db', (err) => {
    if (err) {
        console.error('Datenbank konnte nicht geöffnet werden:', err.message);
    } else {
        console.log('Verbindung zur Datenbank hergestellt');
    }
});


// Erstelle die Tabelle, falls sie noch nicht existiert
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS sitze (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sitznummer TEXT,
        ist_belegt BOOLEAN
    )`);

    // Wenn die Tabelle leer ist, fülle sie mit Beispiel-Daten
    db.get('SELECT COUNT(*) AS count FROM sitze', (err, row) => {
        if (row.count === 0) {
            const stmt = db.prepare('INSERT INTO sitze (sitznummer, ist_belegt) VALUES (?, ?)');
            for (let i = 1; i <= 50; i++) {
                stmt.run(`Sitz ${i}`, false); // Alle Sitze sind zu Beginn nicht belegt
            }
            stmt.finalize();
        }
    });
});

// Start des Servers
app.listen(port, () => {
    console.log(`Server läuft auf http://localhost:${port}`);
});
