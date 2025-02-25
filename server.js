const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const port = 3000;


// === Datenbankverbindung === //
const db = new sqlite3.Database('./database.db', (err) => {
    if (err) {
        console.error('Datenbank konnte nicht geöffnet werden:', err.message);
    } else {
        console.log('Verbindung zur Datenbank hergestellt');
    }
});


// === Middleware für statische Dateien === //
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());


// === Holt alle Sitze aus der Datenbank === //
app.get('/api/sitze', (req, res) => {
    db.all('SELECT * FROM sitze', (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json(rows);
        }
    });
});


// === Holt alle Sitze für einen bestimmten Raum === //
app.get('/api/sitze/:raumId', (req, res) => {
    const raumId = req.params.raumId;

    // Abfrage für Sitze basierend auf der Raum-ID
    db.all('SELECT * FROM sitze WHERE raum_id = ?', [raumId], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json(rows);
        }
    });
});


// === Buchen eines Sitzes === //
app.post('/api/buchen', (req, res) => {
    const { kunde_id, film_id, sitz_ids } = req.body;

    console.log('Empfangene Daten:', req.body); // Debugging

    if (!Array.isArray(sitz_ids) || sitz_ids.length === 0) {
        return res.status(400).json({ error: 'sitz_ids muss ein Array mit mindestens einem Element sein.' });
    }

    // === Prüft ob alle Sitze verfügbar sind === //
    db.all('SELECT * FROM sitze WHERE id IN (' + sitz_ids.join(',') + ') AND ist_belegt = 0', (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        if (rows.length !== sitz_ids.length) {
            return res.status(400).json({ error: 'Einige Sitze sind bereits belegt.' });
        }

        // Sitze als belegt markieren
        const stmt = db.prepare('UPDATE sitze SET ist_belegt = 1 WHERE id = ?');
        sitz_ids.forEach(sitzId => stmt.run(sitzId));
        stmt.finalize((err) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }

            // Buchungen speichern
            const bookingStmt = db.prepare('INSERT INTO buchungen (kunde_id, sitz_id, film_id) VALUES (?, ?, ?)');
            sitz_ids.forEach(sitzId => {
                bookingStmt.run(kunde_id, sitzId, film_id);
            });
            bookingStmt.finalize((err) => {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }

                // Erfolgreiche Buchung wird hier EINMAL gesendet
                res.json({ success: true });
            });
        });
    });
});


// === Holt alle Sitze für einen bestimmten Raum === //
app.get('/api/sitze/:raumId', (req, res) => {
    const raumId = req.params.raumId;

    // Abfrage für Sitze basierend auf der Raum-ID (Annahme: bis 10 Sitze pro Raum)
    db.all('SELECT * FROM sitze WHERE raum_id = ? LIMIT 10', [raumId], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json(rows);
        }
    });
});


// === Holt alle Filme === //
app.get('/api/filme', (req, res) => {
    db.all(`
        SELECT filme.*, raeume.name as raum_name 
        FROM filme 
        LEFT JOIN raeume ON filme.raum_id = raeume.id
    `, (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json(rows);
        }
    });
});


// === Neue Räume hinzufügen === //
app.post('/api/raeume', (req, res) => {
    const { name, anzahl_sitze } = req.body;
    db.run('INSERT INTO raeume (name, anzahl_sitze) VALUES (?, ?)', [name, anzahl_sitze], function (err) {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json({ success: true, id: this.lastID });
        }
    });
});


// === Raum-ID zuweisen === //
app.get('/api/raeume/:raumId', (req, res) => {
    const raumId = req.params.raumId;

    db.get('SELECT * FROM raeume WHERE id = ?', [raumId], (err, raum) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else if (raum) {
            res.json(raum);
        } else {
            res.status(404).json({ error: 'Raum nicht gefunden' });
        }
    });
});


// === Sitze für einen Raum hinzufügen === //
app.post('/api/sitze', (req, res) => {
    const { raum_id, anzahl_sitze } = req.body;
    const stmt = db.prepare('INSERT INTO sitze (raum_id, sitznummer, ist_belegt) VALUES (?, ?, ?)');

    for (let i = 1; i <= anzahl_sitze; i++) {
        stmt.run(raum_id, `Sitz ${i}`, false);
    }

    stmt.finalize((err) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json({ success: true });
        }
    });
});


// === Hole alle Räume === //
app.get('/api/raeume', (req, res) => {
    db.all('SELECT * FROM raeume', (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json(rows);
        }
    });
});


// === Kunde registrieren === //
app.post('/api/kunden', (req, res) => {
    const { name, email } = req.body;
    db.run('INSERT INTO kunden (name, email) VALUES (?, ?)', [name, email], function (err) {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json({ success: true, id: this.lastID });
        }
    });
});


// === Start des Servers === //
app.listen(port, () => {
    console.log(`Server läuft auf http://localhost:${port}`);
});
