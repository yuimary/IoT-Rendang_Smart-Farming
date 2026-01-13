// --- KONFIGURASI MQTT ---
const broker = "test.mosquitto.org";
const port = 8081; // Port WebSocket Secure (WSS) untuk HTTPS/GitHub Pages
// const port = 8080; // Gunakan ini jika test lokal tanpa HTTPS bermasalah

// !!! GANTI TOPIK INI SESUAI DENGAN KODE WOKWI ANDA !!!
const topic = "projek_iot/smart_farming/iotrendangganteng"; 

// Membuat Client ID unik agar broker tidak bingung
const clientID = "WebClient-" + parseInt(Math.random() * 100000);

// Inisialisasi Paho Client
const client = new Paho.MQTT.Client(broker, port, clientID);

// Variabel Statistik
let totalOnTime = 0; // dalam detik
let lastOnTime = 0;
let isValveOpen = false;
let timerInterval = null;

// --- FUNGSI UTAMA ---

// 1. Saat berhasil konek
function onConnect() {
    console.log("Connected to Broker!");
    document.getElementById("connection-status").innerText = "Status: Terhubung 🟢";
    document.getElementById("connection-status").style.color = "green";
    
    // Subscribe ke topik
    client.subscribe(topic);
}

// 2. Saat koneksi putus
function onConnectionLost(responseObject) {
    if (responseObject.errorCode !== 0) {
        console.log("Connection Lost: " + responseObject.errorMessage);
        document.getElementById("connection-status").innerText = "Status: Terputus 🔴";
        document.getElementById("connection-status").style.color = "red";
    }
}

// 3. Saat pesan masuk (Data dari Wokwi)
function onMessageArrived(message) {
    console.log("Data Masuk: " + message.payloadString);
    
    try {
        // Parsing data JSON dari Wokwi
        const data = JSON.parse(message.payloadString);

        // Update Tampilan HTML
        document.getElementById("temp").innerText = data.temp.toFixed(1);
        document.getElementById("hum").innerText = data.hum.toFixed(1);
        document.getElementById("soil").innerText = data.soil;
        document.getElementById("valve").innerText = data.valve;

        if(data.valve === "ON") {
            document.getElementById("total-time").innerText = data.duration + " Detik";

            if(data.water !== undefined) {
            document.getElementById("water-usage").innerText = data.water.toFixed(2) + " Liter";
            }
        } else {
            document.getElementById("total-time").innerText = " 0 Detik";
            document.getElementById("water-usage").innerText = " 0 Liter";
        }
        if (document.getElementById("delayTime")) {
            document.getElementById("delayTime").innerText = data.delay + " ms";
        }
        if (document.getElementById("packetLoss")) {
            document.getElementById("packetLoss").innerText = data.packetLoss?.toFixed(2) + " %";
        }
    } catch (e) {
        console.error("Error parsing JSON:", e);
    }
}

// --- EKSEKUSI KONEKSI ---
client.onConnectionLost = onConnectionLost;
client.onMessageArrived = onMessageArrived;

const options = {
    useSSL: true, // Wajib True untuk GitHub Pages (HTTPS)
    onSuccess: onConnect,
    onFailure: function(e) {
        console.log("Connect failed:", e);
        document.getElementById("connection-status").innerText = "Status: Gagal Konek (Coba Reload) ⚠";
    }
};

// Mulai koneksi
document.getElementById("connection-status").innerText = "Status: Menghubungkan ke Broker...";

client.connect(options);







