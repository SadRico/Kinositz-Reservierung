document.addEventListener('DOMContentLoaded', function() {

    // Variablen für die Buchungsinformationen
    let chosenSeats = []; // Speicher Sitze in einem Array
    let chosenMovie = null;
    let chosenRoom = null;
    let kundeId = null;
    let alleFilme = []; // Speichert alle Filme mit ihren zugehörigen Räumen

    // Elemente für Navigation zwischen Schritten
    const sections = document.querySelectorAll('.section');
    const steps = document.querySelectorAll('.step');

    // Lade Filme mit ihren zugehörigen Räumen
    fetch('/api/filme')
        .then(response => response.json())
        .then(filme => {
            alleFilme = filme; // Alle Filme speichern
            const filmDropdown = document.getElementById('film-dropdown');

            filme.forEach(film => {
                const option = document.createElement('option');
                option.value = film.id;
                option.textContent = film.titel;

                // Option-Attribut für Raum_ID festlegen
                option.dataset.raumId = film.raum_id;
                filmDropdown.appendChild(option);
            });

            // Event-Listener für Filmauswahl
            filmDropdown.addEventListener('change', function() {
                const selectedFilmId = this.value;
                const selectedFilm = alleFilme.find(film => film.id == selectedFilmId);

                if (selectedFilm) {
                    // Filminformationen anzeigen
                    const filmInfoElement = document.getElementById('film-info');
                    filmInfoElement.innerHTML = `
                        <h3>${selectedFilm.titel}</h3>
                        <p><strong>Beschreibung:</strong> ${selectedFilm.beschreibung || 'Keine Beschreibung verfügbar'}</p>
                        <p><strong>Dauer:</strong> ${selectedFilm.dauer || '90'} Minuten</p>
                        <p><strong>Vorführraum:</strong> ${selectedFilm.raum_name || 'Saal ' + selectedFilm.raum_id}</p>
                    `;
                    filmInfoElement.style.display = 'block';
                }
            });
        })
        .catch(error => {
            console.error('Fehler beim Laden der Filme:', error);
            alert('Die Filmliste konnte nicht geladen werden. Bitte versuchen Sie es später erneut.');
        });

    // Funktion zum Aktivieren eines Schritts
    function aktiviereSchritt(schritt) {
        sections.forEach(section => section.classList.add('hidden'));
        steps.forEach(step => step.classList.remove('active'));

        document.getElementById(`section${schritt}`).classList.remove('hidden');
        document.getElementById(`step${schritt}`).classList.add('active');
    }

    // Schritt 1 zu Schritt 2 (Film zu Sitzplatzauswahl)
    document.getElementById('btn-to-step2').addEventListener('click', function() {
        const filmDropdown = document.getElementById('film-dropdown');

        if (filmDropdown.value) {
            const selectedOption = filmDropdown.options[filmDropdown.selectedIndex];
            const raumId = selectedOption.dataset.raumId || 1; // Fallback auf Raum 1, falls keine Raum-ID angegeben

            chosenMovie = {
                id: filmDropdown.value,
                titel: selectedOption.text
            };

            // Lade Rauminformationen
            fetch(`/api/raeume/${raumId}`)
                .then(response => response.json())
                .then(raum => {
                    chosenRoom = {
                        id: raum.id,
                        name: raum.name || `Saal ${raum.id}`
                    };

                    // Film- und Rauminformationen anzeigen
                    document.getElementById('film-raum-info').innerHTML = `
                        <h3>${chosenMovie.titel}</h3>
                        <p>Raum: ${chosenRoom.name}</p>
                    `;

                    // Sitze laden
                    ladeSitze(chosenRoom.id);
                    aktiviereSchritt(2);
                })
                .catch(error => {
                    console.error('Fehler beim Laden der Rauminformationen:', error);

                    // Fallback: Ohne Rauminformationen fortfahren
                    chosenRoom = {
                        id: raumId,
                        name: `Saal ${raumId}`
                    };

                    document.getElementById('film-raum-info').innerHTML = `
                        <h3>${chosenMovie.titel}</h3>
                        <p>Raum: ${chosenRoom.name}</p>
                    `;

                    ladeSitze(chosenRoom.id);
                    aktiviereSchritt(2);
                });
        } else {
            alert('Bitte wählen Sie einen Film aus.');
        }
    });

    // Schritt 2 zurück zu Schritt 1
    document.getElementById('btn-back-step1').addEventListener('click', function() {
        aktiviereSchritt(1);
    });

    // Schritt 2 zu Schritt 3 (Sitzplatzauswahl zu persönlichen Daten)
    document.getElementById('btn-to-step3').addEventListener('click', function() {
        if (chosenSeats.length > 0) {
            aktiviereSchritt(3);
        } else {
            alert('Bitte wählen Sie mindestens einen Sitzplatz aus.');
        }
    });

    // Schritt 3 zurück zu Schritt 2
    document.getElementById('btn-back-step2').addEventListener('click', function() {
        aktiviereSchritt(2);
    });

    // Reservierung bestätigen und zu Schritt 4 gehen
    document.getElementById('btn-reservieren').addEventListener('click', function() {
        const kundeName = document.getElementById('kunde-name').value;
        const kundeEmail = document.getElementById('kunde-email').value;

        if (kundeName && kundeEmail) {
            // Kunde registrieren
            fetch('/api/kunden', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: kundeName, email: kundeEmail })
            })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        kundeId = data.id;

                        // Sitze buchen
                        return fetch('/api/buchen', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                kunde_id: kundeId,
                                film_id: chosenMovie.id,
                                sitz_ids: chosenSeats.map(sitz => sitz.id)
                            })
                        });
                    } else {
                        throw new Error('Fehler bei der Kundenregistrierung');
                    }
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        // Reservierung erfolgreich - Ticket vorbereiten
                        const aktuellesDatum = new Date();
                        const formatiertesDatum = `${aktuellesDatum.getDate()}.${aktuellesDatum.getMonth() + 1}.${aktuellesDatum.getFullYear()}`;
                        const uhrzeit = `${aktuellesDatum.getHours()}:${String(aktuellesDatum.getMinutes()).padStart(2, '0')}`;

                        const reservierungsDetails = document.getElementById('reservierungs-details');
                        reservierungsDetails.innerHTML = `
                        <h3>Kinoticket</h3>
                        <div class="ticket-section">
                            <div class="ticket-info"><strong>Film:</strong> <span>${chosenMovie.titel}</span></div>
                            <div class="ticket-info"><strong>Raum:</strong> <span>${chosenRoom.name}</span></div>
                            <div class="ticket-info"><strong>Datum:</strong> <span>${formatiertesDatum}</span></div>
                            <div class="ticket-info"><strong>Uhrzeit:</strong> <span>${uhrzeit}</span></div>
                        </div>
                        <div class="ticket-section">
                            <div class="ticket-info"><strong>Name:</strong> <span>${kundeName}</span></div>
                            <div class="ticket-info"><strong>E-Mail:</strong> <span>${kundeEmail}</span></div>
                        </div>
                        <div class="ticket-section">
                            <div class="ticket-info"><strong>Sitzplätze:</strong> <span>${chosenSeats.map(sitz => sitz.sitznummer).join(', ')}</span></div>
                        </div>
                    `;

                        aktiviereSchritt(4);
                    } else {
                        alert('Fehler bei der Buchung. Bitte versuchen Sie es erneut.');
                    }
                })
                .catch(error => {
                    console.error('Fehler bei der Reservierung:', error);
                    alert('Es ist ein Fehler aufgetreten. Bitte versuchen Sie es erneut.');
                });
        } else {
            alert('Bitte füllen Sie alle Pflichtfelder aus.');
        }
    });

    // Ticket als PDF herunterladen
    document.getElementById('btn-download-ticket').addEventListener('click', function() {
        // PDF erzeugen mit jsPDF
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        const aktuellesDatum = new Date();
        const formatiertesDatum = `${aktuellesDatum.getDate()}.${aktuellesDatum.getMonth() + 1}.${aktuellesDatum.getFullYear()}`;
        const uhrzeit = `${aktuellesDatum.getHours()}:${String(aktuellesDatum.getMinutes()).padStart(2, '0')}`;

        // Ticket Header
        doc.setFontSize(22);
        doc.setTextColor(0, 102, 204);
        doc.text("KINOTICKET", 105, 20, { align: "center" });

        // Logo oder Dekoration
        doc.setDrawColor(0, 102, 204);
        doc.setLineWidth(1);
        doc.line(20, 25, 190, 25);

        // Film & Vorstellungsinformationen
        doc.setFontSize(16);
        doc.setTextColor(0, 0, 0);
        doc.text(`Film: ${chosenMovie.titel}`, 20, 40);
        doc.text(`Raum: ${chosenRoom.name}`, 20, 50);
        doc.text(`Datum: ${formatiertesDatum}`, 20, 60);
        doc.text(`Uhrzeit: ${uhrzeit}`, 20, 70);

        // Kundeninformationen
        doc.text("Kundeninformationen:", 20, 90);
        doc.setFontSize(12);
        doc.text(`Name: ${document.getElementById('kunde-name').value}`, 30, 100);
        doc.text(`E-Mail: ${document.getElementById('kunde-email').value}`, 30, 110);

        // Sitzplatzinformationen
        doc.setFontSize(16);
        doc.text("Reservierte Sitzplätze:", 20, 130);
        doc.setFontSize(12);
        doc.text(chosenSeats.map(sitz => sitz.sitznummer).join(', '), 30, 140);

        // QR-Code simulieren (nur zur Dekoration)
        doc.setDrawColor(0);
        doc.setFillColor(0);
        const qrSize = 30;
        const qrX = 160;
        const qrY = 90;
        doc.rect(qrX, qrY, qrSize, qrSize, 'F');

        // Fußzeile
        doc.setDrawColor(0, 102, 204);
        doc.setLineWidth(1);
        doc.line(20, 260, 190, 260);
        doc.setFontSize(10);
        doc.setTextColor(128, 128, 128);
        doc.text("Vielen Dank für Ihre Reservierung!", 105, 270, { align: "center" });

        // PDF herunterladen
        doc.save(`kinoticket_${chosenMovie.titel.replace(/\s+/g, '_')}.pdf`);
    });

    // Neue Reservierung starten
    document.getElementById('btn-neue-reservierung').addEventListener('click', function() {
        // Alle eingegebenen Daten zurücksetzen
        document.getElementById('kunde-name').value = '';
        document.getElementById('kunde-email').value = '';
        chosenSeats = [];
        document.getElementById('ausgewahlte-liste').textContent = 'Keine Sitze ausgewählt';

        // Zurück zu Schritt 1
        aktiviereSchritt(1);
    });

    // Funktion zum Laden der Sitze basierend auf dem ausgewählten Raum
    function ladeSitze(raumId) {
        fetch(`/api/sitze/${raumId}`)
            .then(response => response.json())
            .then(sitze => {
                const kinoSaale = document.getElementById('kino-saale');
                kinoSaale.innerHTML = '';
                chosenSeats = []; // Zurücksetzen der ausgewählten Sitze
                document.getElementById('ausgewahlte-liste').textContent = 'Keine Sitze ausgewählt';

                sitze.forEach(sitz => {
                    const sitzDiv = document.createElement('div');
                    sitzDiv.classList.add('sitz');
                    sitzDiv.textContent = sitz.sitznummer;
                    sitzDiv.dataset.id = sitz.id;
                    sitzDiv.dataset.sitznummer = sitz.sitznummer;

                    if (sitz.ist_belegt) {
                        sitzDiv.classList.add('belegt');
                    } else {
                        sitzDiv.classList.add('buchbar');
                        sitzDiv.addEventListener('click', function() {
                            toggleSitzauswahl(this, sitz);
                        });
                    }

                    kinoSaale.appendChild(sitzDiv);
                });
            })
            .catch(error => {
                console.error('Fehler beim Laden der Sitze:', error);
                alert('Die Sitzplätze konnten nicht geladen werden. Bitte versuchen Sie es später erneut.');
            });
    }

    // Funktion zur Auswahl/Abwahl eines Sitzes
    function toggleSitzauswahl(sitzElement, sitz) {
        if (sitzElement.classList.contains('belegt')) {
            return; // Bereits belegte Sitze können nicht ausgewählt werden
        }

        if (sitzElement.classList.contains('ausgewahlt')) {
            // Sitz abwählen
            sitzElement.classList.remove('ausgewahlt');
            sitzElement.classList.add('buchbar');

            // Aus der Liste der ausgewählten Sitze entfernen
            chosenSeats = chosenSeats.filter(s => s.id !== sitz.id);
        } else {
            // Sitz auswählen
            sitzElement.classList.remove('buchbar');
            sitzElement.classList.add('ausgewahlt');

            // Zur Liste der ausgewählten Sitze hinzufügen
            chosenSeats.push({
                id: sitz.id,
                sitznummer: sitz.sitznummer
            });
        }

        // Anzeige der ausgewählten Sitze aktualisieren
        const ausgewahlteListe = document.getElementById('ausgewahlte-liste');
        if (chosenSeats.length > 0) {
            ausgewahlteListe.textContent = chosenSeats.map(s => s.sitznummer).join(', ');
        } else {
            ausgewahlteListe.textContent = 'Keine Sitze ausgewählt';
        }
    }
});