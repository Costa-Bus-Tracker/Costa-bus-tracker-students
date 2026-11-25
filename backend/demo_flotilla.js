// backend/demo_flotilla.js
const WEBHOOK_URL = "http://localhost:3001/api/aws/webhook/bus-location";
const WEBHOOK_SECRET = "costabus_aws_secret_2026";

// Rutas simuladas en la Costa de Jalisco
const flotilla = [
  {
    id: "ESP32_002", // Tramo: Autlán -> Casimiro Castillo -> La Huerta
    puntos: [
      { lat: 19.7708, lng: -104.3639 },
      { lat: 19.6850, lng: -104.4000 },
      { lat: 19.6047, lng: -104.4342 },
      { lat: 19.5400, lng: -104.5300 },
      { lat: 19.4847, lng: -104.6425 },
    ],
    pasoActual: 0,
    subpaso: 0,
  },
  {
    id: "ESP32_003", // Tramo: La Huerta -> Melaque -> Barra de Navidad
    puntos: [
      { lat: 19.4847, lng: -104.6425 },
      { lat: 19.3500, lng: -104.6800 },
      { lat: 19.2244, lng: -104.7064 },
      { lat: 19.2014, lng: -104.6822 },
    ],
    pasoActual: 0,
    subpaso: 0,
  },
  {
    id: "ESP32_004", // Tramo: Barra de Navidad -> Cihuatlán -> Manzanillo
    puntos: [
      { lat: 19.2014, lng: -104.6822 },
      { lat: 19.2369, lng: -104.5653 },
      { lat: 19.1500, lng: -104.4500 },
      { lat: 19.0522, lng: -104.3158 },
    ],
    pasoActual: 0,
    subpaso: 0,
  },
];

const PASOS_ENTRE_CIUDADES = 10; // Suavidad del movimiento

function obtenerSiguientePosicion(bus) {
  const origen = bus.puntos[bus.pasoActual];
  const siguienteIndice = (bus.pasoActual + 1) % bus.puntos.length;
  const destino = bus.puntos[siguienteIndice];

  const t = bus.subpaso / PASOS_ENTRE_CIUDADES;
  const lat = origen.lat + (destino.lat - origen.lat) * t;
  const lng = origen.lng + (destino.lng - origen.lng) * t;

  bus.subpaso++;
  if (bus.subpaso >= PASOS_ENTRE_CIUDADES) {
    bus.subpaso = 0;
    bus.pasoActual = siguienteIndice;
  }

  return {
    latitude: Number(lat.toFixed(6)),
    longitude: Number(lng.toFixed(6)),
  };
}

async function enviarUbicacion(bus) {
  const pos = obtenerSiguientePosicion(bus);
  const payload = {
    numCamion: bus.id,
    latitude: pos.latitude,
    longitude: pos.longitude,
    altitude_m: 280.5,
    satellites: 8,
    captured_at: new Date().toISOString(),
  };

  try {
    const res = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": WEBHOOK_SECRET,
      },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      console.log(`🚌 [${bus.id}] enviado -> Lat: ${pos.latitude}, Lng: ${pos.longitude}`);
    } else {
      console.error(`❌ [${bus.id}] Error HTTP ${res.status}`);
    }
  } catch (err) {
    console.error(`❌ Error conectando al backend (¿está encendido en el puerto 3001?):`, err.message);
  }
}

console.log("🚀 Iniciando simulación de flotilla Costa Bus Tracker...");
console.log("Presiona Ctrl + C para detener la simulación.\n");

// Enviar de inmediato y luego cada 3 segundos
flotilla.forEach(enviarUbicacion);
setInterval(() => {
  flotilla.forEach(enviarUbicacion);
}, 3000);