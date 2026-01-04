// Globale Variablen
let currentStep = 1;
let customerData = null;
let selectedServices = {};
let selectedDate = '';
let selectedTime = '';

// Services-Daten
const services = [
    { id: 'windows', name: 'Fenster putzen', price: 45 },
    { id: 'floors', name: 'Boden reinigen', price: 35 },
    { id: 'bathroom', name: 'Badezimmer reinigen', price: 40 },
    { id: 'kitchen', name: 'Küche reinigen', price: 40 }
];

// Zeitslots
const timeSlots = ['08:00', '10:00', '12:00', '14:00', '16:00'];

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

// Initialisierung
document.addEventListener('DOMContentLoaded', function() {
    // Prüfen ob Kundendaten existieren
    const storedData = loadCustomerData();
    if (storedData) {
        customerData = storedData;
        goToStep(2);
    }

    // Event Listeners
    document.getElementById('customer-form').addEventListener('submit', handleCustomerFormSubmit);
    document.getElementById('change-customer-btn').addEventListener('click', resetCustomerData);
    document.getElementById('continue-to-date-btn').addEventListener('click', () => goToStep(3));
    document.getElementById('back-to-services-btn').addEventListener('click', () => goToStep(2));
    document.getElementById('submit-booking-btn').addEventListener('click', submitBooking);
    document.getElementById('new-booking-btn').addEventListener('click', () => {
        selectedServices = {};
        selectedDate = '';
        selectedTime = '';
        goToStep(2);
    });

    // Datum Minimum setzen
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('appointment-date').min = today;
    document.getElementById('appointment-date').addEventListener('change', updateSubmitButton);

    // Services rendern
    renderServices();
    renderTimeSlots();
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
        healthInsurance: formData.get('healthInsurance'),
        insuranceNumber: formData.get('insuranceNumber'),
        careLevel: formData.get('careLevel')
    };

    saveCustomerData(data);
    customerData = data;
    goToStep(2);
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
    if (step === 2) {
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
        <strong>Adresse:</strong> ${customerData.street} ${customerData.houseNumber}, ${customerData.postalCode} ${customerData.city}
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
                <span class="service-price">${service.price}€ / Einheit</span>
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
    let html = '<strong>Ausgewählte Leistungen:</strong><br><ul class="booking-summary">';
    let totalPrice = 0;

    Object.entries(selectedServices).forEach(([id, quantity]) => {
        const service = services.find(s => s.id === id);
        const price = quantity * service.price;
        totalPrice += price;
        html += `<li>${service.name} x${quantity} (${price}€)</li>`;
    });

    html += `</ul><div class="total-section"><strong>Gesamtpreis: ${totalPrice}€</strong></div>`;
    summaryDiv.innerHTML = html;
}

function renderTimeSlots() {
    const timeSlotsDiv = document.getElementById('time-slots');
    timeSlotsDiv.innerHTML = '';

    timeSlots.forEach(time => {
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
    selectedDate = document.getElementById('appointment-date').value;
    const canSubmit = selectedDate && selectedTime;
    document.getElementById('submit-booking-btn').disabled = !canSubmit;
}

async function submitBooking() {
    const submitBtn = document.getElementById('submit-booking-btn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Wird gesendet...';

    const servicesWithQuantity = Object.entries(selectedServices).map(([id, quantity]) => {
        const service = services.find(s => s.id === id);
        const totalPrice = quantity * service.price;
        return {
            id: service.id,
            name: service.name,
            quantity: quantity,
            pricePerUnit: `${service.price}€`,
            totalPrice: `${totalPrice}€`
        };
    });

    const bookingData = {
        customer: customerData,
        services: servicesWithQuantity,
        appointmentDate: selectedDate,
        appointmentTime: selectedTime,
        timestamp: new Date().toISOString()
    };

    try {
        // Request geht jetzt an das lokale Backend
        const response = await fetch('http://localhost:3000', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(bookingData)
        });

        const result = await response.json();

        if (response.ok && result.success) {
            displayConfirmation();
            goToStep(4);
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


function displayConfirmation() {
    const confirmationDiv = document.getElementById('booking-confirmation');
    let html = `
        <strong>Termin:</strong> ${selectedDate} um ${selectedTime} Uhr<br>
        <strong>Adresse:</strong> ${customerData.street} ${customerData.houseNumber}, ${customerData.postalCode} ${customerData.city}<br>
        <strong>Leistungen:</strong><br>
        <ul class="booking-summary">
    `;

    let totalPrice = 0;
    Object.entries(selectedServices).forEach(([id, quantity]) => {
        const service = services.find(s => s.id === id);
        const price = quantity * service.price;
        totalPrice += price;
        html += `<li>${service.name} x${quantity} (${price}€)</li>`;
    });

    html += `</ul><div class="total-section"><strong>Gesamtpreis: ${totalPrice}€</strong></div>`;
    confirmationDiv.innerHTML = html;
}