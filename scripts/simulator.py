import os
import random
import time
import uuid
from datetime import datetime, timezone
import requests

# URL pública de Ngrok apuntando a nuestro backend local
URL = "http://localhost:3001/api/aws/webhook/bus-location"
API_KEY = os.getenv("AWS_WEBHOOK_SECRET", "tu_llave_secreta_aqui")

# Puntos de control reales sobre la carretera MEX 80 (La Huerta -> Melaque -> Barra de Navidad)
WAYPOINTS = [
    (19.489844, -104.630985, 310.3),  # La Huerta
    (19.354120, -104.678450, 145.0),  # Entronque El Rebalse
    (19.225680, -104.703120, 18.5),   # San Patricio Melaque
    (19.202850, -104.682140, 6.2),    # Terminal Barra de Navidad
]


def interpolar_ruta(pasos_por_tramo: int = 8):
    """Genera coordenadas progresivas a lo largo de la ruta."""
    puntos = []
    for i in range(len(WAYPOINTS) - 1):
        lat1, lng1, alt1 = WAYPOINTS[i]
        lat2, lng2, alt2 = WAYPOINTS[i + 1]
        for step in range(pasos_por_tramo):
            t = step / pasos_por_tramo
            lat = lat1 + (lat2 - lat1) * t
            lng = lng1 + (lng2 - lng1) * t
            alt = alt1 + (alt2 - alt1) * t
            puntos.append((lat, lng, alt))
    puntos.append(WAYPOINTS[-1])
    return puntos


def enviar_datos():
    recorrido = interpolar_ruta(pasos_por_tramo=6)
    indice = 0
    headers = {
        "Content-Type": "application/json",
        "x-api-key": API_KEY,
    }

    print("🚌 Iniciando simulador fiel ESP32 -> DynamoDB -> Backend...")
    print(f"Apuntando a: {URL} | Ciclo: 10 segundos\n")

    while True:
        lat, lng, alt = recorrido[indice]

        # Payload idéntico al esquema real guardado en AWS DynamoDB (Bus-TrackerDB)
        payload = {
            "numCamion": "ESP32_001",
            "measurement_id": str(uuid.uuid4()),
            "captured_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "latitude": round(lat, 6),
            "longitude": round(lng, 6),
            "altitude_m": round(alt + random.uniform(-0.8, 0.8), 1),
            "satellites": random.randint(6, 9),
        }

        try:
            print(
                f"[{indice + 1}/{len(recorrido)}] Enviando GPS: "
                f"Lat {payload['latitude']}, Lng {payload['longitude']} | Alt: {payload['altitude_m']}m"
            )
            response = requests.post(URL, json=payload, headers=headers, timeout=5)
            print(f"Respuesta Backend: {response.status_code} | {response.json()}\n")
        except Exception as e:
            print(f"❌ Error conectando al backend: {e}\n")

        # Avanza al siguiente punto y reinicia al llegar a la terminal
        indice = (indice + 1) % len(recorrido)

        # Ciclo exacto de 10 segundos igual que el ESP32 físico
        time.sleep(10)


if __name__ == "__main__":
    enviar_datos()