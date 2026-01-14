// --- KONFIGURASI MQTT ---
const broker = "broker.emqx.io"; // Broker Publik Stabil
const port = 8084; // Port WebSocket Secure (WSS)
const topic = "projek_iot/smart_farming/iotrendangganteng"; // Topik kamu

// Membuat Client ID unik
const clientID = "WebClient-" + parseInt(Math.random() * 100000);

// Inisialisasi Paho Client
const client = new Paho.MQTT.Client(broker, port, clientID);

// --- KONFIGURASI CHART.JS (GRAFIK) ---

// 1. Setup Grafik Air
const ctxWater = document.getElementById('waterChart').getContext('2d');
const waterChart = new Chart(ctxWater, {
    type: 'line',
    data: {
        labels: [], // Label Waktu
        datasets: [{
            label: 'Air Terpakai (Liter)',
            data: [],
            borderColor: '#3498db', // Warna Biru
            backgroundColor: 'rgba(52, 152, 219, 0.2)',
            borderWidth: 2,
            fill: true,
            tension: 0.4
        }]
    },
    options: {
        responsive: true,
        animation: { duration: 0 }, // Matikan animasi biar cepat
        scales: { y: { beginAtZero: true } }
    }
});

// 2. Setup Grafik Network
const ctxNet = document.getElementById('networkChart').getContext('2d');
const networkChart = new Chart(ctxNet, {
    type: 'line',
    data: {
        labels: [],
        datasets: [{
            label: 'Latency (ms)',
            data: [],
            borderColor: '#e74c3c', // Warna Merah
            backgroundColor: 'rgba(231, 76, 60, 0.2)',
            borderWidth: 2,
            fill: true,
            tension: 0.2
        }]
    },
    options: {
        responsive: true,
        animation: { duration: 0 },
        scales: { y: { beginAtZero: true } }
    }
});

// Fungsi Update Grafik
function updateChartData(chart, label, data) {
    chart.data.labels.push(label);
    chart.data.datasets.forEach((dataset) => {
        dataset.data.push(data);
    });

    // Batasi hanya menampilkan 20 data terakhir agar tidak berat
    if (chart.data.labels.length > 20) {
        chart.data.labels.shift();
        chart.data.datasets.forEach((dataset) => {
            dataset.data.shift();
        });
    }
    chart.update();
}

// --- FUNGSI UTAMA MQTT ---

function onConnect() {
    console.log("Connected to Broker!");
    document.getElementById("connection-status").innerText = "Status: Terhubung 🟢";
    document.getElementById("connection-status").style.color = "green";
    client.subscribe(topic);
}

function onConnectionLost(responseObject) {
    if (responseObject.errorCode !== 0) {
        console.log("Connection Lost: " + responseObject.errorMessage);
        document.getElementById("connection-status").innerText = "Status: Terputus 🔴";
        document.getElementById("connection-status").style.color = "red";
    }
}

function onMessageArrived(message) {
    console.log("Data Masuk: " + message.payloadString);
    
    try {
        const data = JSON.parse(message.payloadString);
        
        // 1. Update Tampilan Angka (Kartu)
        document.getElementById("temp").innerText = data.temp.toFixed(1);
        document.getElementById("hum").innerText = data.hum.toFixed(1);
        document.getElementById("soil").innerText = data.soil;
        document.getElementById("valve").innerText = data.valve;

        // 2. Update Tampilan Statistik Text
        if(data.valve === "ON") {
            document.getElementById("total-time").innerText = data.duration + " Detik";
            if(data.water !== undefined) {
                document.getElementById("water-usage").innerText = data.water.toFixed(2) + " Liter";
            }
        } else {
             // Opsional: Reset text jika mati, atau biarkan nilai terakhir
             // document.getElementById("total-time").innerText = "0 Detik"; 
        }

        if (document.getElementById("delayTime")) {
            document.getElementById("delayTime").innerText = data.delay;
        }
        if (document.getElementById("packetLoss")) {
            document.getElementById("packetLoss").innerText = data.packetLoss?.toFixed(2);
        }

        // 3. Update GRAFIK (Chart.js)
        const timeLabel = new Date().toLocaleTimeString(); // Jam sekarang

        // Update Grafik Air
        // Jika data.water ada isinya, masukkan ke grafik. Jika tidak, masukkan 0.
        let waterVal = (data.water !== undefined) ? data.water : 0;
        updateChartData(waterChart, timeLabel, waterVal);

        // Update Grafik Latency
        let delayVal = (data.delay !== undefined) ? data.delay : 0;
        updateChartData(networkChart, timeLabel, delayVal);

    } catch (e) {
        console.error("Error parsing JSON:", e);
    }
}

// --- EKSEKUSI KONEKSI ---
client.onConnectionLost = onConnectionLost;
client.onMessageArrived = onMessageArrived;

const options = {
    useSSL: true, // Wajib True untuk GitHub Pages
    onSuccess: onConnect,
    onFailure: function(e) {
        console.log("Connect failed:", e);
        document.getElementById("connection-status").innerText = "Status: Gagal Konek (Coba Reload) ⚠";
    }
};

// Mulai koneksi
document.getElementById("connection-status").innerText = "Status: Menghubungkan ke EMQX...";
client.connect(options);