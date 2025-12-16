#include <WiFi.h>
#include <PubSubClient.h>
#include <DHT.h>
#include <ESP32Servo.h>

// --- KONFIGURASI WIFI & MQTT ---
const char* ssid = "Wokwi-GUEST"; // Wifi virtual Wokwi
const char* password = "";
const char* mqtt_server = "test.mosquitto.org"; // Broker Publik Gratis

// GANTI "nim_kalian" DENGAN NIM ANDA AGAR TIDAK BENTROK
const char* mqtt_topic = "projek_iot/smart_farming/nim_kalian"; 

// --- PIN CONFIG ---
#define DHTPIN 15
#define DHTTYPE DHT22
#define POTPIN 34
#define SERVOPIN 18

// --- OBJEK ---
WiFiClient espClient;
PubSubClient client(espClient);
DHT dht(DHTPIN, DHTTYPE);
Servo myservo;

// --- VARIABEL ---
long lastMsg = 0;
int soilMoisture = 0;
String valveStatus = "OFF";

void setup_wifi() {
  delay(10);
  Serial.println();
  Serial.print("Connecting to ");
  Serial.println(ssid);

  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi connected");
}

void reconnect() {
  while (!client.connected()) {
    Serial.print("Attempting MQTT connection...");
    // Create a random client ID
    String clientId = "ESP32Client-";
    clientId += String(random(0xffff), HEX);
    
    if (client.connect(clientId.c_str())) {
      Serial.println("connected");
    } else {
      Serial.print("failed, rc=");
      Serial.print(client.state());
      Serial.println(" try again in 5 seconds");
      delay(5000);
    }
  }
}

void setup() {
  Serial.begin(115200);
  
  // Init Sensor & Actuator
  dht.begin();
  myservo.attach(SERVOPIN);
  pinMode(POTPIN, INPUT);

  setup_wifi();
  client.setServer(mqtt_server, 1883);
}

void loop() {
  if (!client.connected()) {
    reconnect();
  }
  client.loop();

  // Kirim data setiap 2 detik (jangan terlalu cepat agar tidak spam)
  long now = millis();
  if (now - lastMsg > 2000) {
    lastMsg = now;

    // 1. BACA DATA
    float h = dht.readHumidity();
    float t = dht.readTemperature();
    int potValue = analogRead(POTPIN); // Baca nilai 0-4095
    
    // Mapping nilai potensio (0-4095) menjadi persen (0-100%)
    // Anggap 0% = Kering banget, 100% = Basah banget
    soilMoisture = map(potValue, 0, 4095, 0, 100);

    // Cek error pembacaan DHT
    if (isnan(h) || isnan(t)) {
      Serial.println("Gagal membaca DHT!");
      return;
    }

    // 2. LOGIKA KONTROL (SMART FARMING)
    // Jika tanah kering (< 30%), buka keran
    if (soilMoisture < 30) {
      myservo.write(90); // Posisi Buka (90 derajat)
      valveStatus = "ON";
    } else {
      myservo.write(0);  // Posisi Tutup (0 derajat)
      valveStatus = "OFF";
    }

    // 3. PACKING DATA KE JSON
    // Format: {"temp": 30.5, "hum": 80, "soil": 20, "valve": "ON"}
    String payload = "{";
    payload += "\"temp\":"; payload += t; payload += ",";
    payload += "\"hum\":"; payload += h; payload += ",";
    payload += "\"soil\":"; payload += soilMoisture; payload += ",";
    payload += "\"valve\":\""; payload += valveStatus; payload += "\"";
    payload += "}";

    // 4. KIRIM KE MQTT BROKER
    Serial.print("Publish message: ");
    Serial.println(payload);
    client.publish(mqtt_topic, payload.c_str());
  }
}