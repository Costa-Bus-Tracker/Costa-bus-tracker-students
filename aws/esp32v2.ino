#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <TinyGPSPlus.h>
#include <WebServer.h>

// ================= CONFIGURACIÓN WIFI Y SERVIDOR =================
const char* ssid     = "[ El nombre de la Red ]";
const char* password = "[ Contraseña de la Red]";

const char* serverUrl = "[ Dirrecion del EndPoint]";

// ================= ASIGNACIÓN DE PINES (SOLO GPS) =================
#define RXD2 16 // GPS TX -> D16 (RX2 en ESP32)
#define TXD2 17 // GPS RX -> D17 (TX2 en ESP32)

// ================= INSTANCIAS =================
TinyGPSPlus gps;
WebServer server(80);

// Último JSON para mostrarlo en el celular
String lastJsonPayload = "{}";

// Temporizador para envíos sin bloquear
unsigned long lastSendTime = 0;
const unsigned long sendInterval = 10000; // cada 10 segundos

// ================= HTML PARA EL CELULAR =================
const char* htmlPage = R"rawliteral(
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Telemetría GPS en Vivo</title>
<style>
body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #0f172a; color: #38bdf8; padding: 20px; }
h2 { color: #f8fafc; text-align: center; }
pre { background: #1e293b; padding: 15px; border-radius: 8px; overflow-x: auto; font-size: 1.1em; color: #a78bfa; }
</style>
</head>
<body>
<h2>📡 Datos GPS en Vivo</h2>
<pre id="json-display">Esperando señal de satélites...</pre>
<script>
setInterval(() => {
  fetch('/api/data')
    .then(response => response.json())
    .then(data => {
      document.getElementById('json-display').innerText = JSON.stringify(data, null, 4);
    })
    .catch(err => console.error(err));
}, 2000);
</script>
</body>
</html>
)rawliteral";

// ================= FUNCIÓN DE ENVÍO HTTP/HTTPS =================
int enviarDatos(const String& body, String& respuesta) {
  HTTPClient http;
  int code;

  if (String(serverUrl).startsWith("https")) {
    WiFiClientSecure client;
    client.setInsecure(); // Para pruebas. Luego usa client.setCACert(rootCA);
    http.begin(client, serverUrl);
    http.setTimeout(8000);
    http.addHeader("Content-Type", "application/json");
    code = http.POST(body);
    if (code > 0) respuesta = http.getString();
    else respuesta = http.errorToString(code);
    http.end();
  } else {
    WiFiClient client;
    http.begin(client, serverUrl);
    http.setTimeout(8000);
    http.addHeader("Content-Type", "application/json");
    code = http.POST(body);
    if (code > 0) respuesta = http.getString();
    else respuesta = http.errorToString(code);
    http.end();
  }
  return code;
}

void setup() {
  Serial.begin(115200);
  delay(1000);

  // Serial2 para el GPS a 9600 baudios
  Serial2.begin(9600, SERIAL_8N1, RXD2, TXD2);

  // Conexión WiFi
  Serial.print("Conectando a WiFi: ");
  Serial.println(ssid);
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("\nWiFi conectado exitosamente.");
  Serial.print("IP asignada: ");
  Serial.println(WiFi.localIP());

  // --- SERVIDOR WEB ---
  server.on("/", HTTP_GET, []() {
    server.send(200, "text/html", htmlPage);
  });

  server.on("/api/data", HTTP_GET, []() {
    server.send(200, "application/json", lastJsonPayload);
  });

  server.begin();
  Serial.println("Servidor Web iniciado. Abre la IP en tu celular.");
}

void loop() {
  // 1. Atender clientes web
  server.handleClient();

  // 2. Alimentar el parser GPS
  while (Serial2.available() > 0) {
    gps.encode(Serial2.read());
  }

  // 3. Envío temporizado
  if (millis() - lastSendTime >= sendInterval) {
    lastSendTime = millis();

    bool gpsFix = gps.location.isValid();
    double latitud  = gpsFix ? gps.location.lat() : 0.0;
    double longitud = gpsFix ? gps.location.lng() : 0.0;
    float altitud   = gps.altitude.isValid() ? gps.altitude.meters() : -1.0;
    int satelites   = gps.satellites.isValid() ? gps.satellites.value() : 0;

    Serial.println("\n--- [REPORTE GPS] ---");
    if (gpsFix) {
      Serial.printf("Lat = %.6f | Lng = %.6f | Alt = %.1f m | Sats = %d\n", latitud, longitud, altitud, satelites);
    } else {
      Serial.printf("Buscando señal satelital... (Sats detectados: %d)\n", satelites);
    }

    // --- Construcción del JSON ---
    StaticJsonDocument<256> doc;
    doc["device_id"] = "ESP32_001";

    if (gpsFix) {
      doc["latitude"]   = serialized(String(latitud, 6));
      doc["longitude"]  = serialized(String(longitud, 6));
      doc["altitude_m"] = serialized(String(altitud, 1));
      doc["satellites"] = satelites;
    } else {
      doc["latitude"]   = nullptr;
      doc["longitude"]  = nullptr;
      doc["altitude_m"] = nullptr;
      doc["satellites"] = satelites;
    }

    String requestBody;
    serializeJson(doc, requestBody);

    // Actualizar el JSON mostrado en el celular (aunque no haya WiFi)
    lastJsonPayload = requestBody;

    Serial.print("Payload JSON: ");
    Serial.println(requestBody);

    // --- Envío ---
    if (WiFi.status() == WL_CONNECTED) {
      String respuesta;
      int httpCode = enviarDatos(requestBody, respuesta);

      if (httpCode > 0) {
        Serial.printf("HTTP Code: %d | AWS: %s\n", httpCode, respuesta.c_str());
      } else {
        Serial.printf("Error HTTP (%d): %s\n", httpCode, respuesta.c_str());
      }
    } else {
      Serial.println("WiFi desconectado. Intentando reconectar...");
      WiFi.reconnect();
    }
  }
}