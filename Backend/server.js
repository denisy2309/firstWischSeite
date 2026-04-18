const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const app = express();
const PORT = 3000;

const CONFIG = {
    // Lokale Supabase Konfiguration
    supabaseUrl: 'http://localhost:8000',  // Deine lokale Supabase URL
    supabaseServiceKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzUxODM5MjAwLCJleHAiOjE5MDk2MDU2MDB9.bLapBKEpVDeXBlSNRiwThrnxglJjS4qHQK8W-RqB0_Y', // Service Role Key (aus .env oder Docker logs)
    
    // Master Code
    masterCode: '123',
    
    // n8n Webhook
    n8nWebhookUrl: 'http://localhost:5678/webhook/a35fcedb-3f86-441c-bfee-3f8f67b8353b',
    
    // Server Port
    port: 3000
};

// Middleware
app.use(cors({
    origin: 'https://denisy2309.github.io'
}));
app.use(express.json());
app.use(express.static('public')); // Statische Dateien (HTML, CSS, JS)

const supabase = createClient(CONFIG.supabaseUrl, CONFIG.supabaseServiceKey);

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
        console.log(responseData);

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

// API-Endpunkt zum Validieren eines einzelnen Slots
app.post('/api/validate-slot', async (req, res) => {
    const { contractor, date, time, requiredDuration } = req.body;
    
    console.log('Slot-Validierung:', { contractor, date, time });

    try {
        // Request an n8n Webhook zur Validierung
        const response = await fetch('http://localhost:5678/webhook/fb538b15-4398-4b3d-9ab6-aff307fbe9b7', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contractor,
                date,
                time,
                requiredDuration
            })
        });

        const responseData = await response.json();

        if (response.ok) {
            // Erwartete Response: { available: true/false }
            res.status(200).json({
                success: true,
                available: responseData.available || false
            });
        } else {
            res.status(response.status).json({
                success: false,
                message: 'Fehler bei der Slot-Validierung',
                error: responseData
            });
        }
    } catch (error) {
        console.error('Fehler bei der Slot-Validierung:', error);
        res.status(500).json({
            success: false,
            message: 'Serverfehler bei der Slot-Validierung',
            error: error.message
        });
    }
});

// API-Endpunkt zum Speichern von Kundendaten (Fire & Forget)
app.post('/api/customer-data', async (req, res) => {
    const customerData = req.body;
    
    console.log('Kundendaten erhalten:', customerData);

    // SOFORT Response senden (nicht warten)
    res.status(200).json({
        success: true,
        message: 'Daten werden verarbeitet'
    });

    // Im Hintergrund an n8n senden (Fire & Forget)
    try {
        await fetch('http://localhost:5678/webhook/18f6465f-ee88-48f7-b524-7c24ff58418c', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(customerData)
        });
        console.log('Kundendaten an n8n gesendet');
    } catch (error) {
        console.error('Fehler beim Senden an n8n:', error);
        // Fehler wird geloggt, aber nicht an Frontend weitergegeben
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
            },
            body: JSON.stringify(bookingData)
        });

        const responseData = await response.json();

        if (response.ok) {
            res.status(200).json({
                success: responseData.output.success,
                message: 'Buchung erfolgreich übermittelt',
                data: responseData
            });
        } else if (responseData.output.emailError){
            res.status(200).json({
                success: responseData.output.success,
                emailError: responseData.output.emailError,
                message: responseData.output.message,
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

// ============================================================================
// Supabase-Datenbank Abfragen
// ============================================================================

// ============================================================================
// AUTHENTIFIZIERUNG
// ============================================================================
 
// Login - Code validieren
app.post('/api/login', async (req, res) => {
    try {
        const { code } = req.body;
 
        if (!code) {
            return res.status(400).json({ error: 'Zugangscode erforderlich' });
        }
 
        // Check Master Code
        if (code === CONFIG.masterCode) {
            return res.json({
                success: true,
                user: {
                    code: code,
                    name: 'Master',
                    isMaster: true,
                    tableName: null
                }
            });
        }
 
        // Check Subcontractor Code
        const { data, error } = await supabase
            .from('contractors')
            .select('*')
            .eq('code', code)
            .single();
 
        if (error || !data) {
            return res.status(401).json({ 
                success: false, 
                error: 'Ungültiger Zugangscode' 
            });
        }
 
        res.json({
            success: true,
            user: {
                code: code,
                name: data.name,
                isMaster: false,
                tableName: data.table_name
            }
        });
 
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Server Fehler' });
    }
});
 
// ============================================================================
// CONTRACTORS (Master View)
// ============================================================================
 
// Alle Subunternehmer laden
app.get('/api/contractors', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('contractors')
            .select('*')
            .order('name');
 
        if (error) throw error;
 
        res.json({ success: true, data });
 
    } catch (error) {
        console.error('Get contractors error:', error);
        res.status(500).json({ error: 'Fehler beim Laden der Subunternehmer' });
    }
});
 
// Statistiken für einen Subunternehmer
app.get('/api/contractors/:tableName/stats', async (req, res) => {
    try {
        const { tableName } = req.params;
 
        const { data, error } = await supabase
            .from(tableName)
            .select('status');
 
        if (error) throw error;
 
        const stats = {
            open: data.filter(o => o.status === 'Offen').length,
            completed: data.filter(o => o.status === 'Erledigt').length,
            rejected: data.filter(o => o.status === 'Abgelehnt').length
        };
 
        res.json({ success: true, stats });
 
    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({ error: 'Fehler beim Laden der Statistiken' });
    }
});
 
// ============================================================================
// ORDERS (Aufträge)
// ============================================================================
 
// Alle Aufträge für einen Subunternehmer laden
app.get('/api/orders/:tableName', async (req, res) => {
    try {
        const { tableName } = req.params;
 
        const { data, error } = await supabase
            .from(tableName)
            .select('*')
            .order('created_at', { ascending: false });
 
        if (error) throw error;
 
        res.json({ success: true, data });
 
    } catch (error) {
        console.error('Get orders error:', error);
        res.status(500).json({ error: 'Fehler beim Laden der Aufträge' });
    }
});
 
// Auftrag ablehnen
app.post('/api/orders/:tableName/:orderId/reject', async (req, res) => {
    try {
        const { tableName, orderId } = req.params;
        const { contractorName } = req.body;
 
        // Status auf "Abgelehnt" setzen
        const { data: order, error: updateError } = await supabase
            .from(tableName)
            .update({ status: 'Abgelehnt' })
            .eq('id', orderId)
            .select()
            .single();
 
        if (updateError) throw updateError;
 
        // n8n Benachrichtigung senden
        if (CONFIG.n8nWebhookUrl && CONFIG.n8nWebhookUrl !== 'DEINE_N8N_WEBHOOK_URL') {
            try {
                await fetch(CONFIG.n8nWebhookUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        orderId: orderId,
                        customerEmail: order.customer_email,
                        customerName: order.customer_name,
                        status: 'rejected',
                        contractorName: contractorName
                    })
                });
            } catch (e) {
                console.error('n8n notification error:', e);
            }
        }
 
        res.json({ success: true, data: order });
 
    } catch (error) {
        console.error('Reject order error:', error);
        res.status(500).json({ error: 'Fehler beim Ablehnen des Auftrags' });
    }
});
 
// Auftrag abschließen
app.post('/api/orders/:tableName/:orderId/complete', async (req, res) => {
    try {
        const { tableName, orderId } = req.params;
        const { signature } = req.body;
 
        if (!signature) {
            return res.status(400).json({ error: 'Unterschrift erforderlich' });
        }
 
        const { data: order, error } = await supabase
            .from(tableName)
            .update({
                status: 'Erledigt',
                signature: signature,
                completed_at: new Date().toISOString()
            })
            .eq('id', orderId)
            .select()
            .single();
 
        if (error) throw error;
 
        res.json({ success: true, data: order });
 
    } catch (error) {
        console.error('Complete order error:', error);
        res.status(500).json({ error: 'Fehler beim Abschließen des Auftrags' });
    }
});
 
// ============================================================================
// REALTIME - Polling Endpoint für Updates
// ============================================================================
 
// Polling endpoint für Echtzeit-Updates
// (Alternative zu Supabase Realtime, da Realtime über ngrok kompliziert ist)
app.get('/api/orders/:tableName/updates', async (req, res) => {
    try {
        const { tableName } = req.params;
        const { since } = req.query; // Timestamp seit letztem Abruf
 
        let query = supabase
            .from(tableName)
            .select('*');
 
        if (since) {
            query = query.gte('updated_at', since);
        }
 
        const { data, error } = await query
            .order('created_at', { ascending: false });
 
        if (error) throw error;
 
        res.json({ success: true, data, timestamp: new Date().toISOString() });
 
    } catch (error) {
        console.error('Get updates error:', error);
        res.status(500).json({ error: 'Fehler beim Laden der Updates' });
    }
});
 
// ============================================================================
// HEALTH CHECK
// ============================================================================
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        supabase: CONFIG.supabaseUrl,
        timestamp: new Date().toISOString() 
    });
});