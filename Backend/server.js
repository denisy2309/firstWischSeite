const express = require('express');
const cors = require('cors');
const app = express();
const PORT = 3000;

// Middleware
app.use(cors({
    origin: 'https://denisy2309.github.io'
}));
app.use(express.json());
app.use(express.static('public')); // Statische Dateien (HTML, CSS, JS)

// API-Endpunkt für verfügbare Termine
app.post('/api/available-slots', async (req, res) => {
    const { contractor, requiredDuration, searchPeriod, workingHours } = req.body;
    
    console.log('Termine-Anfrage erhalten:', { contractor, requiredDuration });

    try {
        // Request an n8n Webhook
        const response = await fetch('http://localhost:5678/webhook/92a503ef-6e40-4af1-8620-1f7c89052b07', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contractor,
                requiredDuration,
                searchPeriod,
                workingHours
            })
        });

        const responseData = await response.json();

        if (response.ok) {
            res.status(200).json(responseData);
        } else {
            res.status(response.status).json({
                success: false,
                message: 'Fehler beim Abrufen der verfügbaren Termine',
                error: responseData
            });
        }
    } catch (error) {
        console.error('Fehler beim Abrufen der Termine:', error);
        res.status(500).json({
            success: false,
            message: 'Serverfehler beim Abrufen der Termine',
            error: error.message
        });
    }
});

// API-Endpunkt für Buchungen
app.post('/api/bookings', async (req, res) => {
    const bookingData = req.body;
    
    console.log('Buchung erhalten:', bookingData);

    try {
        // Hier wird der Request an Ihr eigentliches Backend weitergeleitet
        const response = await fetch('http://localhost:5678/webhook/ad573761-a174-493e-ad63-b3a2adfb15f4', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // Fügen Sie hier ggf. weitere Header hinzu (z.B. API-Keys)
                // 'Authorization': 'Bearer YOUR_API_KEY'
            },
            body: JSON.stringify(bookingData)
        });

        const responseData = await response.json();

        if (response.ok) {
            res.status(200).json({
                success: true,
                message: 'Buchung erfolgreich übermittelt',
                data: responseData
            });
        } else {
            res.status(response.status).json({
                success: false,
                message: 'Fehler beim Übermitteln der Buchung',
                error: responseData
            });
        }
    } catch (error) {
        console.error('Fehler beim Weiterleiten der Buchung:', error);
        res.status(500).json({
            success: false,
            message: 'Serverfehler beim Übermitteln der Buchung',
            error: error.message
        });
    }
});

// Server starten
app.listen(PORT, () => {
    console.log(`Server läuft auf http://localhost:${PORT}`);
});