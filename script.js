// Globale Variablen
let currentStep = 1;
let customerData = null;
let selectedServices = {};
let selectedDate = '';
let selectedTime = '';
let availableSlots = {}; // Format: { "2026-01-08": ["07:00", "09:00"], ... }
let isLoadingSlots = false;

// Services-Daten mit Zeitangaben
const services = [
    { id: 'windows', name: 'Fenster putzen', price: 45, duration: 40 },
    { id: 'floors', name: 'Böden reinigen', price: 35, duration: 30 },
    { id: 'bathroom', name: 'Badezimmer reinigen', price: 40, duration: 25 },
    { id: 'kitchen', name: 'Küche reinigen', price: 40, duration: 25 }
];

// Konstanten für Zeitberechnung
const TRAVEL_TIME = 30; // Minuten
const BUFFER_TIME = 15; // Minuten

// PLZ zu Bundesland Mapping (NRW und Niedersachsen)
const postalCodeMapping = {
    'Nordrhein-Westfalen': {
        ranges: [
            { start: 40000, end: 48999 },
            { start: 50000, end: 53999 },
            { start: 57000, end: 59999 }
        ],
        contractor: 'Subunternehmer NRW'
    },
    'Niedersachsen': {
        ranges: [
            { start: 26000, end: 27999 },
            { start: 28000, end: 29999 },
            { start: 30000, end: 31999 },
            { start: 37000, end: 38999 },
            { start: 49000, end: 49999 }
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

// Gesamtdauer berechnen
function calculateTotalDuration() {
    let serviceDuration = 0;
    
    Object.entries(selectedServices).forEach(([id, quantity]) => {
        const service = services.find(s => s.id === id);
        serviceDuration += service.duration * quantity;
    });
    
    return serviceDuration + TRAVEL_TIME + BUFFER_TIME;
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
        await fetchAvailableSlots();
        goToStep(3);
    });
    document.getElementById('back-to-services-btn').addEventListener('click', () => goToStep(2));
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
    const data = {
        fullName: formData.get('fullName'),
        street: formData.get('street'),
        houseNumber: formData.get('houseNumber'),
        postalCode: formData.get('postalCode'),
        city: formData.get('city'),
        phone: formData.get('phone'),
        healthInsurance: formData.get('healthInsurance'),
        insuranceNumber: formData.get('insuranceNumber'),
        careLevel: formData.get('careLevel')
    };

    // Prüfen ob PLZ unterstützt wird
    const contractorInfo = getContractorFromPostalCode(data.postalCode);
    if (!contractorInfo) {
        alert('Entschuldigung, für Ihre Postleitzahl (NRW und Niedersachsen) bieten wir derzeit keinen Service an. Bitte überprüfen Sie Ihre Eingabe.');
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
        document.getElementById('healthInsurance').value = customerData.healthInsurance || '';
        document.getElementById('insuranceNumber').value = customerData.insuranceNumber || '';
        document.getElementById('careLevel').value = customerData.careLevel || '';
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
    } else if (step === 3) {
        displayServicesSummary();
    }
}

function displayCustomerInfo() {
    const infoBox = document.getElementById('customer-info');
    infoBox.innerHTML = `
        <strong>Kunde:</strong> ${customerData.fullName}<br>
        <strong>Adresse:</strong> ${customerData.street} ${customerData.houseNumber}, ${customerData.postalCode} ${customerData.city}<br>
        <strong>Telefon:</strong> ${customerData.phone}
    `;
}

function renderServices() {
    const servicesList = document.getElementById('services-list');
    servicesList.innerHTML = '';

    services.forEach(service => {
        const quantity = selectedServices[service.id] || 0;
        const totalPrice = quantity * service.price;

        const serviceDiv = document.createElement('div');
        serviceDiv.className = `service-item ${quantity > 0 ? 'selected' : ''}`;
        serviceDiv.innerHTML = `
            <div class="service-header">
                <span class="service-name">${service.name}</span>
                <span class="service-price">${service.price}€ / Einheit (${service.duration} Min)</span>
            </div>
            <div class="service-controls">
                <div class="quantity-controls">
                    <button class="quantity-btn minus" onclick="updateQuantity('${service.id}', -1)" ${quantity === 0 ? 'disabled' : ''}>−</button>
                    <span class="quantity-display">${quantity}</span>
                    <button class="quantity-btn plus" onclick="updateQuantity('${service.id}', 1)">+</button>
                </div>
                ${quantity > 0 ? `<span class="total-price">${totalPrice}€</span>` : ''}
            </div>
        `;
        servicesList.appendChild(serviceDiv);
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
    const totalDuration = calculateTotalDuration();
    let html = '<strong>Ausgewählte Leistungen:</strong><br><ul class="booking-summary">';
    let totalPrice = 0;

    Object.entries(selectedServices).forEach(([id, quantity]) => {
        const service = services.find(s => s.id === id);
        const price = quantity * service.price;
        const duration = quantity * service.duration;
        totalPrice += price;
        html += `<li>${service.name} x${quantity} (${price}€, ${duration} Min)</li>`;
    });

    html += `</ul><div class="total-section">`;
    html += `<strong>Gesamtpreis: ${totalPrice}€</strong><br>`;
    html += `<strong>Geschätzte Dauer: ${totalDuration} Minuten (${Math.round(totalDuration/60*10)/10} Std)</strong>`;
    html += `<br><small style="color: #6b7280;">inkl. ${TRAVEL_TIME} Min Fahrtzeit + ${BUFFER_TIME} Min Puffer</small>`;
    html += `</div>`;
    summaryDiv.innerHTML = html;
}

// Verfügbare Slots von n8n abrufen
async function fetchAvailableSlots() {
    isLoadingSlots = true;
    showLoadingState();
    
    const contractorInfo = getContractorFromPostalCode(customerData.postalCode);
    
    if (!contractorInfo) {
        alert('Entschuldigung, für Ihre Postleitzahl bieten wir derzeit keinen Service an.');
        isLoadingSlots = false;
        return;
    }
    
    const totalDuration = calculateTotalDuration();
    
    // Zeitraum berechnen (heute + 30 Tage)
    const today = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 30);
    
    const requestData = {
        customer: {
            name: customerData.fullName,
            postalCode: customerData.postalCode,
            state: contractorInfo.state,
            phone: customerData.phone
        },
        services: Object.entries(selectedServices).map(([id, quantity]) => {
            const service = services.find(s => s.id === id);
            return {
                name: service.name,
                quantity: quantity,
                durationPerUnit: service.duration
            };
        }),
        totalDuration: totalDuration,
        contractor: contractorInfo.contractor,
        searchPeriod: {
            startDate: today.toISOString().split('T')[0],
            endDate: endDate.toISOString().split('T')[0]
        },
        workingHours: {
            start: '07:00',
            end: '18:00'
        }
    };
    
    try {
        const response = await fetch('http://localhost:5678/webhook/ad573761-a174-493e-ad63-b3a2adfb15f4', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestData)
        });
        
        const result = await response.json();
        
        if (response.ok && result.success) {
            availableSlots = {};
            
            // Slots in unser Format umwandeln
            if (result.availableSlots && Array.isArray(result.availableSlots)) {
                result.availableSlots.forEach(slot => {
                    availableSlots[slot.date] = slot.times;
                });
            }
            
            renderDynamicCalendar();
        } else {
            alert('Fehler beim Laden der verfügbaren Termine. Bitte versuchen Sie es erneut.');
        }
    } catch (error) {
        console.error('Fehler beim Abrufen der Termine:', error);
        alert('Verbindungsfehler. Bitte überprüfen Sie Ihre Internetverbindung.');
    } finally {
        isLoadingSlots = false;
        hideLoadingState();
    }
}

// Loading-State anzeigen
function showLoadingState() {
    const dateGroup = document.querySelector('.form-group:has(#appointment-date)');
    const timeGroup = document.querySelector('.form-group:has(#time-slots)');
    
    dateGroup.innerHTML = `
        <label>Verfügbare Termine werden geladen...</label>
        <div style="padding: 2rem; text-align: center;">
            <div style="display: inline-block; width: 40px; height: 40px; border: 4px solid #e5e7eb; border-top-color: #2563eb; border-radius: 50%; animation: spin 1s linear infinite;"></div>
            <p style="margin-top: 1rem; color: #6b7280;">Bitte warten Sie 7-10 Sekunden...</p>
        </div>
    `;
    timeGroup.style.display = 'none';
}

// Loading-State verstecken
function hideLoadingState() {
    const dateGroup = document.querySelector('.form-group:has(#appointment-date)').parentElement;
    dateGroup.querySelector('.form-group').innerHTML = `
        <label for="appointment-date">Datum auswählen</label>
        <select id="appointment-date" required>
            <option value="">Bitte wählen Sie ein Datum</option>
        </select>
    `;
    document.querySelector('.form-group:has(#time-slots)').style.display = 'block';
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
    document.getElementById('submit-booking-btn').disabled = !canSubmit;
}

async function submitBooking() {
    const submitBtn = document.getElementById('submit-booking-btn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Wird gesendet...';

    const contractorInfo = getContractorFromPostalCode(customerData.postalCode);
    const totalDuration = calculateTotalDuration();

    const servicesWithQuantity = Object.entries(selectedServices).map(([id, quantity]) => {
        const service = services.find(s => s.id === id);
        const totalPrice = quantity * service.price;
        return {
            id: service.id,
            name: service.name,
            quantity: quantity,
            pricePerUnit: `${service.price}€`,
            totalPrice: `${totalPrice}€`,
            duration: service.duration * quantity
        };
    });

    let totalPrice = 0;
    servicesWithQuantity.forEach(s => {
        totalPrice += parseInt(s.totalPrice);
    });

    const bookingData = {
        customer: customerData,
        contractor: contractorInfo.contractor,
        services: servicesWithQuantity,
        totalPrice: `${totalPrice}€`,
        totalDuration: totalDuration,
        appointmentDate: selectedDate,
        appointmentTime: selectedTime,
        timestamp: getGermanTimestamp()
    };

    try {
        const response = await fetch('http://localhost:3000/api/bookings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(bookingData)
        });

        const result = await response.json();

        if (response.ok && result.success) {
            displayConfirmation(totalPrice);
            goToStep(4);
            submitBtn.textContent = 'Buchung abschließen';
        } else {
            alert('Fehler beim Senden der Buchung: ' + (result.message || 'Unbekannter Fehler'));
            submitBtn.disabled = false;
            submitBtn.textContent = 'Buchung abschließen';
        }
    } catch (error) {
        console.error('Fehler:', error);
        alert('Verbindungsfehler. Bitte überprüfen Sie Ihre Internetverbindung.');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Buchung abschließen';
    }
}


function displayConfirmation(totalPrice) {
    const contractorInfo = getContractorFromPostalCode(customerData.postalCode);
    const totalDuration = calculateTotalDuration();
    
    const confirmationDiv = document.getElementById('booking-confirmation');
    let html = `
        <strong>Termin:</strong> ${formatDate(selectedDate)} um ${selectedTime} Uhr<br>
        <strong>Adresse:</strong> ${customerData.street} ${customerData.houseNumber}, ${customerData.postalCode} ${customerData.city}<br>
        <strong>Zuständig:</strong> ${contractorInfo.contractor}<br>
        <strong>Leistungen:</strong><br>
        <ul class="booking-summary">
    `;

    Object.entries(selectedServices).forEach(([id, quantity]) => {
        const service = services.find(s => s.id === id);
        const price = quantity * service.price;
        html += `<li>${service.name} x${quantity} (${price}€)</li>`;
    });

    html += `</ul><div class="total-section">`;
    html += `<strong>Gesamtpreis: ${totalPrice}€</strong><br>`;
    html += `<strong>Dauer: ca. ${totalDuration} Minuten</strong>`;
    html += `</div>`;
    confirmationDiv.innerHTML = html;
}