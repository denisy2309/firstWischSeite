// Globale Variablen
let currentStep = 1;
let customerData = null;
let selectedServices = {};
let selectedDate = '';
let selectedTime = '';
let availableSlots = {}; // Format: { "2026-01-08": ["07:00", "09:00"], ... }
let isLoadingSlots = false;

// Services-Daten mit Kategorien
const serviceCategories = [
    {
        id: 'window-cleaning',
        name: 'Fensterreinigung',
        expanded: false,
        services: [
            { id: 'window-glass', name: 'Fensterreinigung (nur Glas)', duration: 5 },
            { id: 'window-frame', name: 'Mit Rahmen', duration: 6 },
            { id: 'window-frame-rebate', name: 'Mit Rahmen und Falz', duration: 8 }
        ]
    },
    {
        id: 'deep-cleaning',
        name: 'Grundreinigung',
        expanded: false,
        type: 'contact',
        message: 'Bitte kontaktieren Sie uns für ein persönliches Angebot'
    },
    {
        id: 'maintenance-cleaning',
        name: 'Unterhaltsreinigung',
        expanded: false,
        type: 'coming-soon',
        message: 'Bald verfügbar'
    }
];

// Konstanten für Zeitberechnung
const TRAVEL_TIME = 30; // Minuten
const DOCUMENTATION_TIME = 15; // Minuten

// PLZ zu Bundesland Mapping (NRW und Niedersachsen)
const postalCodeMapping = {
    'Nordrhein-Westfalen': {
        ranges: [
            // PLZ-Bereich 3 (Nordosten NRW - Ostwestfalen-Lippe)
            { start: 32000, end: 34999 },
            
            // PLZ-Bereich 4 (Norden/Ruhrgebiet)
            { start: 40000, end: 48432 },
            { start: 48466, end: 48477 },
            { start: 48481, end: 48485 },
            { start: 48489, end: 48496 },
            { start: 48541, end: 48739 },
            { start: 49461, end: 49549 },
            
            // PLZ-Bereich 5 (Süden/Rheinland)
            { start: 50001, end: 51597 },
            { start: 51601, end: 53359 },
            { start: 53581, end: 53604 },
            { start: 53621, end: 53949 },
            { start: 57001, end: 57489 },
            { start: 58001, end: 59966 }
        ],
        contractor: 'Subunternehmer NRW'
    },
    'Niedersachsen': {
        ranges: [
            // PLZ-Bereich 2 (Norden - Küste und Bremen-Umland)
            { start: 21000, end: 21999 },
            { start: 26000, end: 27999 },
            { start: 28000, end: 29999 },
            
            // PLZ-Bereich 3 (Süden - Hannover-Region)
            { start: 30000, end: 31999 },
            { start: 37000, end: 38999 },
            
            // PLZ-Bereich 4 (Westen - Grenze zu NRW)
            { start: 48442, end: 48465 },
            { start: 48478, end: 48480 },
            { start: 48486, end: 48488 },
            { start: 48497, end: 48531 },
            { start: 49001, end: 49459 },
            { start: 49551, end: 49849 }
        ],
        contractor: 'Subunternehmer Niedersachsen'
    }
};

// LocalStorage Funktionen
function saveCustomerData(data) {
    localStorage.setItem('customer-data', JSON.stringify(data));
}

function loadCustomerData() {
    const data = localStorage.getItem('customer-data');
    return data ? JSON.parse(data) : null;
}

function deleteCustomerData() {
    localStorage.removeItem('customer-data');
}

// Hilfsfunktion zum Formatieren des Datums
function formatDate(dateString) {
    const [year, month, day] = dateString.split('-');
    return `${day}.${month}.${year}`;
}

// Hilfsfunktion für deutschen Timestamp
function getGermanTimestamp() {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    
    return `${day}.${month}.${year} ${hours}:${minutes}:${seconds}`;
}

// Globales Loading-Overlay
function showGlobalLoading(message = 'Lädt...') {
    // Prüfen ob Overlay bereits existiert
    let overlay = document.getElementById('global-loading-overlay');
    
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'global-loading-overlay';
        overlay.innerHTML = `
            <div style="background: rgba(0, 0, 0, 0.7); position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 9999; display: flex; align-items: center; justify-content: center;">
                <div style="background: white; padding: 2rem 3rem; border-radius: 1rem; text-align: center; box-shadow: 0 10px 40px rgba(0,0,0,0.3);">
                    <div style="display: inline-block; width: 50px; height: 50px; border: 5px solid #e5e7eb; border-top-color: #2563eb; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                    <p id="loading-message" style="margin-top: 1rem; font-size: 1.1rem; font-weight: 500; color: #1f2937;"></p>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
    }
    
    // Nachricht aktualisieren
    const messageElement = overlay.querySelector('#loading-message');
    if (messageElement) {
        messageElement.textContent = message;
    }
    
    overlay.style.display = 'block';
    
    // Alle Buttons und Inputs deaktivieren
    document.querySelectorAll('button, input, select').forEach(el => {
        el.disabled = true;
        el.dataset.wasDisabled = el.disabled;
    });
}

function hideGlobalLoading() {
    const overlay = document.getElementById('global-loading-overlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
    
    // Alle Buttons und Inputs wieder aktivieren (AUSSER submit-booking-btn)
    document.querySelectorAll('button, input, select').forEach(el => {
        // Diese Buttons NICHT reaktivieren - haben eigene Logik
        if (el.id === 'submit-booking-btn') {
            return;
        }
        
        if (el.dataset.wasDisabled !== 'true') {
            el.disabled = false;
        }
        delete el.dataset.wasDisabled;
    });
}

function showErrorMessage(title, message, buttonText = 'OK') {
    console.log('showErrorMessage aufgerufen');
    // Prüfen ob Overlay bereits existiert
    let overlay = document.getElementById('error-message-overlay');
    
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'error-message-overlay';
        document.body.appendChild(overlay);
    }
    
    overlay.innerHTML = `
        <div style="background: rgba(0, 0, 0, 0.7); position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 9999; display: flex; align-items: center; justify-content: center;">
            <div style="background: white; padding: 2rem 2.5rem; border-radius: 1rem; text-align: center; box-shadow: 0 10px 40px rgba(0,0,0,0.3); max-width: 500px; margin: 1rem;">
                <div style="width: 60px; height: 60px; background-color: #fee2e2; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem;">
                    <span style="font-size: 2rem; color: #dc2626;">⚠️</span>
                </div>
                <h3 style="margin: 0 0 1rem 0; font-size: 1.5rem; font-weight: 600; color: #1f2937;">${title}</h3>
                <p style="margin: 0 0 1.5rem 0; font-size: 1rem; color: #6b7280; line-height: 1.5;">${message}</p>
                <button id="error-message-btn" style="background-color: #2563eb; color: white; border: none; padding: 0.75rem 2rem; border-radius: 0.5rem; font-size: 1rem; font-weight: 500; cursor: pointer; transition: background-color 0.2s;" 
                    onmouseover="this.style.backgroundColor='#1d4ed8'" 
                    onmouseout="this.style.backgroundColor='#2563eb'">
                    ${buttonText}
                </button>
            </div>
        </div>
    `;
    
    overlay.style.display = 'block';

    // DEBUG
    setTimeout(() => {
        const dateSelect = document.getElementById('appointment-date');
        const backBtn = document.getElementById('back-to-services-btn');
        console.log('Nach showErrorMessage - Datum disabled?', dateSelect?.disabled);
        console.log('Nach showErrorMessage - Zurück disabled?', backBtn?.disabled);
    }, 100);
    
    // Button-Handler
    document.getElementById('error-message-btn').addEventListener('click', () => {
        hideErrorMessage();
    });
}

function hideErrorMessage() {
    const overlay = document.getElementById('error-message-overlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
}

// PLZ zu Bundesland und Subunternehmer zuordnen
function getContractorFromPostalCode(postalCode) {
    const plz = parseInt(postalCode);
    
    for (const [state, data] of Object.entries(postalCodeMapping)) {
        for (const range of data.ranges) {
            if (plz >= range.start && plz <= range.end) {
                return {
                    state: state,
                    contractor: data.contractor
                };
            }
        }
    }
    
    return null;
}

// Reine Arbeitszeit der Leistungen berechnen
function calculateServiceDuration() {
    let serviceDuration = 0;
    
    Object.entries(selectedServices).forEach(([id, quantity]) => {
        // Alle Services aus allen Kategorien durchsuchen
        serviceCategories.forEach(category => {
            if (category.services) {
                const service = category.services.find(s => s.id === id);
                if (service) {
                    serviceDuration += service.duration * quantity;
                }
            }
        });
    });
    
    return serviceDuration;
}

// Gesamtdauer für Frontend berechnen (mit Doku + Anfahrt)
function calculateTotalDurationForFrontend() {
    const serviceDuration = calculateServiceDuration();
    return serviceDuration + DOCUMENTATION_TIME + TRAVEL_TIME;
}

// Gesamtdauer für Backend berechnen (mit Doku + Anfahrt, OHNE Aufrundung)
function calculateTotalDurationForBackend() {
    return calculateTotalDurationForFrontend();
}

// Dauer auf 90, 120, 150, 180... Minuten aufrunden
function roundUpDuration(minutes) {
    const intervals = [90, 120, 150, 180, 210, 240, 270, 300, 330, 360]; // 1.5h, 2h, 2.5h, 3h, etc.
    
    // Wenn kleiner als 90 Minuten, auf 90 aufrunden
    if (minutes < 90) {
        return 90;
    }
    
    // Auf nächstes 30-Minuten-Intervall aufrunden
    for (let interval of intervals) {
        if (minutes <= interval) {
            return interval;
        }
    }
    
    // Falls länger als 6 Stunden, auf nächste 30 Minuten aufrunden
    return Math.ceil(minutes / 30) * 30;
}

// Minuten in Stunden und Minuten formatieren
function formatDuration(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (mins === 0) {
        return `${hours} Std`;
    } else if (hours === 0) {
        return `${mins} Min`;
    } else {
        return `${hours} Std ${mins} Min`;
    }
}

// Kategorie auf-/zuklappen
function toggleCategory(categoryId) {
    const category = serviceCategories.find(c => c.id === categoryId);
    if (category) {
        category.expanded = !category.expanded;
        renderServices();
    }
}


// Initialisierung
document.addEventListener('DOMContentLoaded', function() {
    // CSS für Spinner hinzufügen
    const style = document.createElement('style');
    style.textContent = `
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
    `;
    document.head.appendChild(style);

    // Prüfen ob Kundendaten existieren
    const storedData = loadCustomerData();
    if (storedData) {
        customerData = storedData;
        goToStep(2);
    }

    // Event Listeners
    document.getElementById('customer-form').addEventListener('submit', handleCustomerFormSubmit);
    document.getElementById('change-customer-btn').addEventListener('click', () => goToStep(1));
    document.getElementById('continue-to-date-btn').addEventListener('click', async () => {
        selectedDate = '';
        selectedTime = '';

        showGlobalLoading('Verfügbare Termine werden geladen...');
        
        try {
            await fetchAvailableSlots();
            goToStep(3);
        } catch (error) {
            console.error('Fehler beim Laden:', error);
        } finally {
            hideGlobalLoading();
        }
    });
    document.getElementById('back-to-services-btn').addEventListener('click', () => {
        // Terminauswahl zurücksetzen
        selectedDate = '';
        selectedTime = '';
        
        const dateSelect = document.getElementById('appointment-date');
        if (dateSelect) {
            dateSelect.value = '';
        }
        
        const timeSlotsDiv = document.getElementById('time-slots');
        if (timeSlotsDiv) {
            timeSlotsDiv.innerHTML = '';
        }
        
        document.getElementById('submit-booking-btn').disabled = true;
        
        goToStep(2);
    });
    document.getElementById('submit-booking-btn').addEventListener('click', submitBooking);
    document.getElementById('new-booking-btn').addEventListener('click', () => {
        resetBooking();
        goToStep(2);
    });

    // Services rendern
    renderServices();
});

function handleCustomerFormSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);

    // Checkbox-Validierung
    const acceptAssignment = formData.get('acceptAssignment');
    if (!acceptAssignment) {
        showErrorMessage(
            'Abtretungserklärung erforderlich',
            'Bitte bestätigen Sie die Abtretungserklärung, um fortzufahren.',
            'OK'
        );
        return;
    }

    const data = {
        fullName: formData.get('fullName'),
        street: formData.get('street'),
        houseNumber: formData.get('houseNumber'),
        postalCode: formData.get('postalCode'),
        city: formData.get('city'),
        phone: formData.get('phone'),
        birthdate: formData.get('birthdate'),
        healthInsurance: formData.get('healthInsurance'),
        insuranceNumber: formData.get('insuranceNumber'),
        careLevel: formData.get('careLevel')
    };

    // Prüfen ob PLZ unterstützt wird
    const contractorInfo = getContractorFromPostalCode(data.postalCode);
    if (!contractorInfo) {
        showErrorMessage(
            'Postleitzahl nicht unterstützt',
            'Entschuldigung, für Ihre Postleitzahl bieten wir derzeit nur Service in NRW und Niedersachsen an. Bitte überprüfen Sie Ihre Eingabe.',
            'OK'
        );
        return;
    }

    saveCustomerData(data);
    customerData = data;
    goToStep(2);
}

function resetBooking() {
    selectedServices = {};
    selectedDate = '';
    selectedTime = '';
    availableSlots = {};

    // Datum-Dropdown zurücksetzen
    const dateSelect = document.getElementById('appointment-date');
    if (dateSelect) {
        dateSelect.innerHTML = '<option value="">Bitte wählen Sie ein Datum</option>';
    }
    
    // Zeitslots leeren
    const timeSlotsDiv = document.getElementById('time-slots');
    if (timeSlotsDiv) {
        timeSlotsDiv.innerHTML = '';
    }
    
    const submitBtn = document.getElementById('submit-booking-btn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Buchung abschließen';
}

function resetCustomerData() {
    deleteCustomerData();
    customerData = null;
    selectedServices = {};
    selectedDate = '';
    selectedTime = '';
    document.getElementById('customer-form').reset();
    goToStep(1);
}

function fillCustomerForm() {
    if (customerData) {
        document.getElementById('fullName').value = customerData.fullName || '';
        document.getElementById('street').value = customerData.street || '';
        document.getElementById('houseNumber').value = customerData.houseNumber || '';
        document.getElementById('postalCode').value = customerData.postalCode || '';
        document.getElementById('city').value = customerData.city || '';
        document.getElementById('phone').value = customerData.phone || '';
        document.getElementById('birthdate').value = customerData.birthdate || '';
        document.getElementById('healthInsurance').value = customerData.healthInsurance || '';
        document.getElementById('insuranceNumber').value = customerData.insuranceNumber || '';
        document.getElementById('careLevel').value = customerData.careLevel || '';
        // Checkbox immer angehakt lassen wenn Daten vorhanden
        document.getElementById('acceptAssignment').checked = true;
    }
}

function goToStep(step) {
    // Alle Steps verstecken
    for (let i = 1; i <= 4; i++) {
        document.getElementById(`step-${i}`).style.display = 'none';
        const progressStep = document.getElementById(`progress-step-${i}`);
        if (progressStep) {
            progressStep.classList.remove('active');
        }
    }

    // Aktuellen Step anzeigen
    document.getElementById(`step-${step}`).style.display = 'block';
    if (step <= 3) {
        const progressStep = document.getElementById(`progress-step-${step}`);
        if (progressStep) {
            progressStep.classList.add('active');
        }
    }
    currentStep = step;

    // Step-spezifische Aktionen
    if (step === 1) {
        fillCustomerForm();
    } else if (step === 2) {
        displayCustomerInfo();
        renderServices();

        // "Kundendaten ändern" Button aktivieren
        setTimeout(() => {
            const changeBtn = document.getElementById('change-customer-btn');
            if (changeBtn) {
                changeBtn.disabled = false;
            }
        }, 0.00000001);
    } else if (step === 3) {
        console.log('Schritt 3 - selectedDate:', selectedDate, 'selectedTime:', selectedTime);
        if (!selectedDate || !selectedTime) {
            selectedDate = '';
            selectedTime = '';
        }
        displayServicesSummary();

        // Kalender rendern wenn Slots vorhanden sind
        if (Object.keys(availableSlots).length > 0) {
            // Datum-Dropdown erstellen falls nicht vorhanden
            const dateSelect = document.getElementById('appointment-date');
            if (!dateSelect) {
                const container = document.querySelector('#step-3 .form-group');
                if (container) {
                    container.innerHTML = `
                        <label for="appointment-date">Datum auswählen</label>
                        <select id="appointment-date" required>
                            <option value="">Bitte wählen Sie ein Datum</option>
                        </select>
                    `;
                }
            }
            hideGlobalLoading();
            renderDynamicCalendar();
        }

        // NEU: Zeitslots zurücksetzen wenn man zu Schritt 3 kommt
        const timeSlotsDiv = document.getElementById('time-slots');
        if (timeSlotsDiv) {
            timeSlotsDiv.innerHTML = '';
        }

        // Submit-Button EXPLIZIT deaktivieren
        setTimeout(() => {
            const submitBtn = document.getElementById('submit-booking-btn');
            if (submitBtn) {
                submitBtn.disabled = true;
                console.log('Submit-Button deaktiviert');
            }
        }, 0.00000001);
    } else if (step === 4) {
        // NEU: Button aktivieren wenn zu Schritt 4 gewechselt wird
        const newBookingBtn = document.getElementById('new-booking-btn');
        if (newBookingBtn) {
            newBookingBtn.disabled = false;
        }
    }
}

function displayCustomerInfo() {
    const birthdate = customerData.birthdate ? formatDate(customerData.birthdate) : 'Nicht angegeben';
    
    const infoBox = document.getElementById('customer-info');
    infoBox.innerHTML = `
        <strong>Kunde:</strong> ${customerData.fullName}<br>
        <strong>Geburtsdatum:</strong> ${birthdate}<br>
        <strong>Adresse:</strong> ${customerData.street} ${customerData.houseNumber}, ${customerData.postalCode} ${customerData.city}<br>
        <strong>Telefon:</strong> ${customerData.phone}
    `;
    
    // Preisinfo-Box hinzufügen (falls noch nicht vorhanden)
    let priceInfoBox = document.getElementById('price-info-box');
    if (!priceInfoBox) {
        priceInfoBox = document.createElement('div');
        priceInfoBox.id = 'price-info-box';
        priceInfoBox.className = 'info-box';
        priceInfoBox.style.marginTop = '1rem';
        infoBox.parentElement.insertBefore(priceInfoBox, infoBox.nextSibling);
    }
    
    priceInfoBox.innerHTML = `
        <strong>Preisberechnung:</strong><br>
        38€/Stunde + 7€ Anfahrtspauschale
    `;
}

function renderServices() {
    const servicesList = document.getElementById('services-list');
    servicesList.innerHTML = '';

    serviceCategories.forEach(category => {
        // Kategorie-Container
        const categoryDiv = document.createElement('div');
        categoryDiv.className = 'category-item';
        
        // Kategorie-Header (klickbar)
        const headerDiv = document.createElement('div');
        headerDiv.className = 'category-header';
        headerDiv.onclick = () => toggleCategory(category.id);
        headerDiv.innerHTML = `
            <span class="category-name">${category.name}</span>
            <span class="category-arrow">${category.expanded ? '▼' : '▶'}</span>
        `;
        categoryDiv.appendChild(headerDiv);
        
        // Kategorie-Inhalt (nur wenn aufgeklappt)
        if (category.expanded) {
            const contentDiv = document.createElement('div');
            contentDiv.className = 'category-content';
            
            if (category.type === 'contact') {
                // Kontakt-Hinweis
                contentDiv.innerHTML = `
                    <p class="category-message">${category.message}</p>
                `;
            } else if (category.type === 'coming-soon') {
                // Bald verfügbar-Hinweis
                contentDiv.innerHTML = `
                    <p class="category-message coming-soon">${category.message}</p>
                `;
            } else if (category.services) {
                // Services der Kategorie
                category.services.forEach(service => {
                    const quantity = selectedServices[service.id] || 0;
                    
                    const serviceDiv = document.createElement('div');
                    serviceDiv.className = `service-item ${quantity > 0 ? 'selected' : ''}`;
                    serviceDiv.innerHTML = `
                        <div class="service-name">${service.name}</div>
                        <div class="quantity-controls">
                            <button class="quantity-btn minus" onclick="updateQuantity('${service.id}', -1)" ${quantity === 0 ? 'disabled' : ''}>−</button>
                            <span class="quantity-display">${quantity}</span>
                            <button class="quantity-btn plus" onclick="updateQuantity('${service.id}', 1)">+</button>
                        </div>
                    `;
                    contentDiv.appendChild(serviceDiv);
                });
            }
            
            categoryDiv.appendChild(contentDiv);
        }
        
        servicesList.appendChild(categoryDiv);
    });

    updateContinueButton();
}

function updateQuantity(serviceId, change) {
    const currentQty = selectedServices[serviceId] || 0;
    const newQty = Math.max(0, currentQty + change);

    if (newQty === 0) {
        delete selectedServices[serviceId];
    } else {
        selectedServices[serviceId] = newQty;
    }

    renderServices();
}

function updateContinueButton() {
    const hasServices = Object.keys(selectedServices).length > 0;
    document.getElementById('continue-to-date-btn').disabled = !hasServices;
}

function displayServicesSummary() {
    const summaryDiv = document.getElementById('services-summary');
    const serviceDuration = calculateServiceDuration();
    const totalDuration = calculateTotalDurationForFrontend();
    const roundedDuration = roundUpDuration(totalDuration);
    
    let html = '<strong>Ausgewählte Leistungen:</strong><br><ul class="booking-summary">';

    Object.entries(selectedServices).forEach(([id, quantity]) => {
        // Service in allen Kategorien suchen
        serviceCategories.forEach(category => {
            if (category.services) {
                const service = category.services.find(s => s.id === id);
                if (service) {
                    html += `<li>${service.name} x${quantity} </li>`;
                }
            }
        });
    });

    html += `</ul><div class="total-section">`;
    html += `<hr style="margin: 0.5rem 0; border: none; border-top: 1px solid #d1d5db;">`;
    html += `<strong>Geschätzte Gesamtdauer: ${formatDuration(roundedDuration)}</strong>`;
    html += `</div>`;
    summaryDiv.innerHTML = html;
}

// Verfügbare Slots vom Backend abrufen
async function fetchAvailableSlots() {
    const contractorInfo = getContractorFromPostalCode(customerData.postalCode);
    
    if (!contractorInfo) {
        hideGlobalLoading();
        showErrorMessage(
            'Kein Service verfügbar',
            'Entschuldigung, für Ihre Postleitzahl bieten wir derzeit keinen Service an.',
            'OK'
        );
        return;
    }
    
    const totalDuration = roundUpDuration(calculateTotalDurationForBackend());
    
    // Zeitraum berechnen (heute + 30 Tage)
    const today = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 30);
    
    const requestData = {
        contractor: contractorInfo.contractor,
        requiredDuration: totalDuration,
        searchPeriod: {
            startDate: today.toISOString().split('T')[0],
            endDate: endDate.toISOString().split('T')[0]
        },
        workingHours: {
            start: '08:00',
            end: '18:00'
        }
    };
    
    try {
        // Request geht an unser Backend
        const response = await fetch('https://uncastigated-niels-greatly.ngrok-free.dev/api/available-slots', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestData)
        });
        
        const result = await response.json();
        console.log('Antwort-Status: ', response.ok);
        console.log('Antwort-Daten: ', result.output.success);

        if (response.ok && result.output.success) {
            availableSlots = {};
            
            // Slots in unser Format umwandeln
            if (result.output.availableSlots && Array.isArray(result.output.availableSlots)) {
                result.output.availableSlots.forEach(slot => {
                    availableSlots[slot.date] = slot.times;
                });
            }

            // NEU: Heutige Slots filtern (nur Zeiten mindestens 2 Stunden in Zukunft)
            const now = new Date();
            const today = now.toISOString().split('T')[0];

            if (availableSlots[today]) {
                const currentHours = now.getHours();
                const currentMinutes = now.getMinutes();
                const currentTimeInMinutes = currentHours * 60 + currentMinutes;
                const minTimeInMinutes = currentTimeInMinutes + 120; // +2 Stunden in Minuten
                
                console.log(`Aktuelle Zeit: ${currentHours}:${String(currentMinutes).padStart(2, '0')} (${currentTimeInMinutes} Min)`);
                console.log(`Minimal benötigte Zeit: ${minTimeInMinutes} Min (= ${Math.floor(minTimeInMinutes/60)}:${String(minTimeInMinutes%60).padStart(2, '0')})`);
                
                availableSlots[today] = availableSlots[today].filter(time => {
                    const [hours, minutes] = time.split(':').map(Number);
                    const timeInMinutes = hours * 60 + minutes;
                    
                    const isValid = timeInMinutes >= minTimeInMinutes;
                    console.log(`Zeit ${time}: ${timeInMinutes} Min >= ${minTimeInMinutes} Min? ${isValid}`);
                    
                    return isValid;
                });
                
                console.log('Heutige Slots nach Filter:', availableSlots[today]);
                
                // Wenn keine Zeiten mehr übrig sind, entferne den heutigen Tag komplett
                if (availableSlots[today].length === 0) {
                    console.log('Keine Slots übrig, entferne heutigen Tag');
                    delete availableSlots[today];
                }
            }
        } else {
            hideGlobalLoading();
            showErrorMessage(
                'Fehler beim Laden',
                'Fehler beim Laden der verfügbaren Termine. Bitte versuchen Sie es erneut.',
                'Erneut versuchen'
            );
        }
    } catch (error) {
        console.error('Fehler beim Abrufen der Termine:', error);
        hideGlobalLoading();
        showErrorMessage(
            'Verbindungsfehler',
            'Bitte überprüfen Sie Ihre Internetverbindung und versuchen Sie es erneut.',
            'OK'
        );
    }
}

// Einzelnen Slot validieren (Optimistic Locking)
async function validateSelectedSlot() {
    const contractorInfo = getContractorFromPostalCode(customerData.postalCode);
    const totalDuration = calculateTotalDurationForBackend();
    
    try {
        const response = await fetch('https://uncastigated-niels-greatly.ngrok-free.dev/api/validate-slot', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contractor: contractorInfo.contractor,
                date: selectedDate,
                time: selectedTime,
                requiredDuration: roundUpDuration(totalDuration)
            })
        });
        
        const result = await response.json();
        
        if (response.ok && result.success) {
            return result.available;
        } else {
            console.error('Validierung fehlgeschlagen:', result);
            return false;
        }
    } catch (error) {
        console.error('Fehler bei der Slot-Validierung:', error);
        // Bei Netzwerkfehler: lieber durchlassen als blockieren
        return true;
    }
}

// Nicht mehr verfügbaren Slot aus der Anzeige entfernen
function removeUnavailableSlot(date, time) {
    console.log('removeUnavailableSlot aufgerufen');
    if (availableSlots[date]) {
        // Zeit aus dem Array entfernen
        availableSlots[date] = availableSlots[date].filter(t => t !== time);
        
        // Wenn keine Zeiten mehr übrig, Tag entfernen
        if (availableSlots[date].length === 0) {
            delete availableSlots[date];
            
            // Kalender neu rendern
            renderDynamicCalendar();
            
            // Datum-Auswahl zurücksetzen
            selectedDate = '';
            
            // Zeitslots leeren
            const timeSlotsDiv = document.getElementById('time-slots');
            if (timeSlotsDiv) {
                timeSlotsDiv.innerHTML = '';
            }
        } else {
            // Tag hat noch andere Zeiten, nur Zeitslots neu rendern
            renderTimeSlots(date);
        }
        
        // NUR Submit-Button deaktivieren, keine anderen!
        const submitBtn = document.getElementById('submit-booking-btn');
        if (submitBtn) {
            submitBtn.disabled = true;
        }

        // MANUELL Datum-Select und Zurück-Button reaktivieren
        setTimeout(() => {
            const dateSelect = document.getElementById('appointment-date');
            const backBtn = document.getElementById('back-to-services-btn');
            
            if (dateSelect) {
                dateSelect.disabled = false;
            }
            if (backBtn) {
                backBtn.disabled = false;
            }
        }, 0.00000001);

        // DEBUG
        const dateSelect = document.getElementById('appointment-date');
        const backBtn = document.getElementById('back-to-services-btn');
        console.log('Datum-Select disabled?', dateSelect?.disabled);
        console.log('Zurück-Button disabled?', backBtn?.disabled);
    }
}

// Loading-State anzeigen
function showLoadingState() {
    const step3 = document.getElementById('step-3');
    const dateContainer = step3.querySelector('#appointment-date')?.closest('.form-group');
    const timeContainer = step3.querySelector('#time-slots')?.closest('.form-group');
    
    if (dateContainer) {
        dateContainer.innerHTML = `
            <label>Verfügbare Termine werden geladen...</label>
            <div style="padding: 2rem; text-align: center;">
                <div style="display: inline-block; width: 40px; height: 40px; border: 4px solid #e5e7eb; border-top-color: #2563eb; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                <p style="margin-top: 1rem; color: #6b7280;">Bitte warten Sie 7-10 Sekunden...</p>
            </div>
        `;
    }
    
    if (timeContainer) {
        timeContainer.style.display = 'none';
    }
}

// Loading-State verstecken
function hideLoadingState() {
    const step3 = document.getElementById('step-3');
    const dateContainer = step3.querySelector('.form-group');
    const timeContainer = step3.querySelector('#time-slots')?.closest('.form-group');
    
    if (dateContainer) {
        dateContainer.innerHTML = `
            <label for="appointment-date">Datum auswählen</label>
            <select id="appointment-date" required>
                <option value="">Bitte wählen Sie ein Datum</option>
            </select>
        `;
    }
    
    if (timeContainer) {
        timeContainer.style.display = 'block';
    }
}

// Dynamischen Kalender rendern
function renderDynamicCalendar() {
    const dateSelect = document.getElementById('appointment-date');
    dateSelect.innerHTML = '<option value="">Bitte wählen Sie ein Datum</option>';
    
    if (Object.keys(availableSlots).length === 0) {
        dateSelect.innerHTML = '<option value="">Keine Termine verfügbar</option>';
        document.getElementById('time-slots').innerHTML = '<p style="color: #6b7280;">Bitte kontaktieren Sie uns telefonisch für alternative Termine.</p>';
        return;
    }
    
    // Sortierte Datums-Liste
    const sortedDates = Object.keys(availableSlots).sort();
    
    sortedDates.forEach(date => {
        const option = document.createElement('option');
        option.value = date;
        option.textContent = formatDate(date);
        dateSelect.appendChild(option);
    });
    
    // Event Listener für Datumsauswahl
    dateSelect.addEventListener('change', (e) => {
        selectedDate = e.target.value;
        selectedTime = '';
        renderTimeSlots(selectedDate);
        updateSubmitButton();
    });
}

// Zeitslots für ausgewähltes Datum rendern
function renderTimeSlots(date) {
    const timeSlotsDiv = document.getElementById('time-slots');
    timeSlotsDiv.innerHTML = '';
    
    if (!date || !availableSlots[date]) {
        return;
    }
    
    const times = availableSlots[date];
    
    if (times.length === 0) {
        timeSlotsDiv.innerHTML = '<p style="color: #6b7280;">Keine Zeiten verfügbar für dieses Datum.</p>';
        return;
    }
    
    times.forEach(time => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'time-slot';
        button.textContent = time;
        button.onclick = () => selectTimeSlot(time);
        timeSlotsDiv.appendChild(button);
    });
}

function selectTimeSlot(time) {
    selectedTime = time;
    
    // Alle Time Slots zurücksetzen
    document.querySelectorAll('.time-slot').forEach(slot => {
        slot.classList.remove('selected');
    });

    // Ausgewählten Time Slot markieren
    event.target.classList.add('selected');
    
    updateSubmitButton();
}

function updateSubmitButton() {
    const canSubmit = selectedDate && selectedTime;
    const submitBtn = document.getElementById('submit-booking-btn');
    if (submitBtn) {
        submitBtn.disabled = !canSubmit;
    }
}

async function submitBooking() {
    const submitBtn = document.getElementById('submit-booking-btn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Wird gesendet...';

    // SCHRITT 1: Loading anzeigen
    showGlobalLoading('Termin wird überprüft...');

    // SCHRITT 2: Slot validieren (Optimistic Locking)
    const isAvailable = await validateSelectedSlot();
    
    if (!isAvailable) {
        hideGlobalLoading();
        
        // Slot ist nicht mehr verfügbar
        showErrorMessage(
            'Termin nicht mehr verfügbar',
            'Dieser Termin wurde gerade von einem anderen Kunden gebucht. Bitte wählen Sie einen anderen Zeitpunkt.',
            'Neuen Termin wählen'
        );
        
        // Ausgegraueten/entfernten Slot aus der Anzeige entfernen
        removeUnavailableSlot(selectedDate, selectedTime);
        
        // Button zurücksetzen
        submitBtn.disabled = false;
        submitBtn.textContent = 'Buchung abschließen';
        
        // Auswahl zurücksetzen
        selectedTime = '';
        updateSubmitButton();
        
        return;
    }

    // SCHRITT 3: Slot ist verfügbar, fortfahren mit Buchung
    showGlobalLoading('Buchung wird abgeschlossen...');

    const contractorInfo = getContractorFromPostalCode(customerData.postalCode);
    const serviceDuration = calculateServiceDuration();
    const totalDurationForBackend = calculateTotalDurationForBackend();

    const servicesWithQuantity = Object.entries(selectedServices).map(([id, quantity]) => {
        let service = null;
        
        serviceCategories.forEach(category => {
            if (category.services) {
                const foundService = category.services.find(s => s.id === id);
                if (foundService) {
                    service = foundService;
                }
            }
        });
        
        if (!service) return null;
        
        return {
            id: service.id,
            name: service.name,
            quantity: quantity
        };
    }).filter(s => s !== null);

    const bookingData = {
        customer: customerData,
        contractor: contractorInfo.contractor,
        services: servicesWithQuantity,
        totalDuration: formatDuration(roundUpDuration(totalDurationForBackend)),
        appointmentDate: selectedDate,
        appointmentTime: selectedTime,
        timestamp: getGermanTimestamp()
    };

    try {
        const response = await fetch('https://uncastigated-niels-greatly.ngrok-free.dev/api/bookings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(bookingData)
        });

        const result = await response.json();

        if (response.ok && result.success) {
            hideGlobalLoading();
            displayConfirmation();
            goToStep(4);
            submitBtn.textContent = 'Buchung abschließen';
        } else {
            hideGlobalLoading();
            showErrorMessage(
                'Fehler beim Senden',
                'Fehler beim Senden der Buchung: ' + (result.message || 'Unbekannter Fehler'),
                'Erneut versuchen'
            );
            submitBtn.disabled = false;
            submitBtn.textContent = 'Buchung abschließen';
        }
    } catch (error) {
        console.error('Fehler:', error);
        hideGlobalLoading();
        showErrorMessage(
            'Verbindungsfehler',
            'Bitte überprüfen Sie Ihre Internetverbindung und versuchen Sie es erneut.',
            'OK'
        );
        submitBtn.disabled = false;
        submitBtn.textContent = 'Buchung abschließen';
    }
}


function displayConfirmation() {
    const contractorInfo = getContractorFromPostalCode(customerData.postalCode);
    const totalDuration = calculateTotalDurationForFrontend();
    const roundedDuration = roundUpDuration(totalDuration);
    
    const confirmationDiv = document.getElementById('booking-confirmation');
    let html = `
        <strong>Termin:</strong> ${formatDate(selectedDate)} um ${selectedTime} Uhr<br>
        <strong>Adresse:</strong> ${customerData.street} ${customerData.houseNumber}, ${customerData.postalCode} ${customerData.city}<br>
        <strong>Zuständig:</strong> ${contractorInfo.contractor}<br>
        <strong>Leistungen:</strong><br>
        <ul class="booking-summary">
    `;

    Object.entries(selectedServices).forEach(([id, quantity]) => {
        // Service in allen Kategorien suchen
        serviceCategories.forEach(category => {
            if (category.services) {
                const service = category.services.find(s => s.id === id);
                if (service) {
                    html += `<li>${service.name} x${quantity}</li>`;
                }
            }
        });
    });

    html += `</ul><div class="total-section">`;
    html += `<strong>Geschätzte Dauer: ${formatDuration(roundedDuration)}</strong>`;
    html += `</div>`;
    confirmationDiv.innerHTML = html;

    // NEU: "Neue Buchung erstellen" Button aktivieren
    const newBookingBtn = document.getElementById('new-booking-btn');
    if (newBookingBtn) {
        newBookingBtn.disabled = false;
    }
}
