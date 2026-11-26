# 🚌 Costa Bus Tracker

![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![AWS](https://img.shields.io/badge/AWS-Serverless-FF9900?style=for-the-badge&logo=amazonaws&logoColor=white)
![ESP32](https://img.shields.io/badge/Hardware-ESP32%20%2B%20GPS-E7352C?style=for-the-badge&logo=espressif&logoColor=white)
![Leaflet](https://img.shields.io/badge/Mapas-Leaflet-199900?style=for-the-badge&logo=leaflet&logoColor=white)

**Sistema integral de monitoreo, telemetría y rastreo GPS en tiempo real para el transporte público foráneo en la región de la Costa Sur de Jalisco, México.**

La plataforma enlaza dispositivos físicos embarcados en las unidades de transporte con una infraestructura híbrida en la nube (AWS) y una aplicación web progresiva interactiva. Este ecosistema permite a los pasajeros consultar ubicaciones en vivo, tiempos estimados de llegada (ETA) y alertas sonoras de proximidad, al mismo tiempo que proporciona a los operadores y administradores un panel centralizado para la supervisión operativa de la flotilla.

---

## 📑 Tabla de Contenidos

- [Cobertura Geográfica y Corredores Operativos](#-cobertura-geográfica-y-corredores-operativos)
- [Arquitectura del Sistema y Flujo de Datos](#-arquitectura-del-sistema-y-flujo-de-datos)
- [Funcionalidades Principales](#-funcionalidades-principales)
- [Stack Tecnológico](#-stack-tecnológico)
- [Estructura del Repositorio](#-estructura-del-repositorio)
- [Instalación y Configuración Local](#-instalación-y-configuración-local)
- [Especificación del Webhook de Telemetría](#-especificación-del-webhook-de-telemetría-aws--backend)
- [Pruebas y Simulación de Flotilla](#-pruebas-y-simulación-de-flotilla)
- [Equipo de Desarrollo e Integración](#-equipo-de-desarrollo-e-integración)
- [Licencia y Uso](#-licencia-y-uso)

---

## 🗺️ Cobertura Geográfica y Corredores Operativos

El sistema está diseñado y calibrado específicamente para la red carretera federal y estatal de la región **Costa Sur** y **Sierra de Amula**, cubriendo los principales puntos de origen, destino y paradas intermedias:

- **Autlán de Navarro**
- **Casimiro Castillo**
- **La Huerta**
- **San Patricio - Melaque**
- **Barra de Navidad**
- **Cihuatlán**
- **Manzanillo (Colima)**

---

## 🏗️ Arquitectura del Sistema y Flujo de Datos

La plataforma opera bajo una arquitectura distribuida orientada a eventos (*Event-Driven Architecture*), integrando hardware embebido IoT, cómputo *serverless* en Amazon Web Services y comunicación bidireccional de baja latencia mediante WebSockets:

```text
[ESP32 + Módulo GPS] ──(HTTPS / JSON)──▶ [AWS API Gateway + AWS Lambda]
                                                    │
                                      ┌─────────────┴─────────────┐
                                      ▼                           ▼
                            [Amazon DynamoDB]         (POST + x-api-key)
                            (Bus-TrackerDB)                       │
                                                                  ▼
                                                        [Túnel HTTPS (Ngrok)]
                                                                  │
                                                                  ▼
                                              [Backend: Node.js + Express + Socket.io]
                                                                  │
                                                             (WebSockets)
                                                                  ▼
                                               [Frontend: React + Vite + Leaflet]
```

### Etapas del Procesamiento de Telemetría

1. **Adquisición de Telemetría (Hardware Embebido):** Un microcontrolador **ESP32** acoplado a un módulo receptor satelital **GPS** captura las coordenadas geográficas reales de la unidad (latitud, longitud, altitud, rumbo y conteo de satélites activos) y las transmite de forma segura vía HTTPS en paquetes JSON cada **10 segundos**.
2. **Ingesta, Validación y Persistencia (AWS Cloud):** **AWS API Gateway** recibe la petición entrante y dispara una función **AWS Lambda**. Esta función valida la integridad del esquema JSON, estampa la marca de tiempo oficial del servidor y almacena cada traza histórica en una tabla NoSQL en **Amazon DynamoDB** (`Bus-TrackerDB`).
3. **Puente de Comunicación Segura (Webhook y Ngrok):** Una vez confirmada la persistencia en DynamoDB, la función AWS Lambda reenvía la actualización mediante una solicitud `POST` autenticada con el encabezado de seguridad `x-api-key` hacia un túnel cifrado **Ngrok**, permitiendo conectar la nube de AWS con el servidor backend local sin exponer puertos directamente.
4. **Cálculo Cinemático y Emisión en Vivo (Backend y Frontend):** El servidor en **Node.js** verifica la autenticidad de la llave API, procesa el estado de la unidad (cálculo de velocidad instantánea, porcentaje de avance sobre el corredor y tiempo estimado de llegada) y transmite el evento a través de **Socket.io** hacia todos los clientes conectados en **React**.

---

## ✨ Funcionalidades Principales

### Para Pasajeros (Interfaz Pública)

- **Mapa Interactivo en Tiempo Real:** Renderizado cartográfico mediante **Leaflet**, con trazado geográfico de corredores (`RoutePolyline`), marcadores dinámicos (`BusMarker`) e interpolación matemática de movimiento (`useSmoothPosition`) para desplazamientos fluidos sin saltos visuales.
- **Modo GO y Alertas Inteligentes de Proximidad:** Módulo de seguimiento dedicado (`GoModePanel`) que calcula la distancia entre la unidad seleccionada y la ubicación del pasajero, activando notificaciones visuales y alertas auditivas (`useAlarmSound`) cuando el autobús se aproxima a su parada.
- **Geolocalización y Sugerencia de Rutas:** Detección automática de la posición del usuario mediante la API del navegador (`useGeolocation`) para filtrar y priorizar los corredores más cercanos (`NearbyRoutes`).
- **Avisos Operativos y Enlaces de Boletaje:** Paneles informativos sobre incidencias en ruta (`ServiceAlerts`, `AlertList`) y acceso directo a plataformas de compra de boletos por línea transportista (`PurchaseLinks`).
- **Accesibilidad Visual:** Soporte nativo para cambio dinámico entre tema claro y tema oscuro (`ThemeToggle`, `useTheme`) con persistencia en almacenamiento local.

### Para Operadores y Desarrolladores

- **Panel de Supervisión Administrativa:** Interfaz privada protegida por credenciales (`AdminLogin`, `AdminDashboard`) para auditar el estado de conexión de las unidades, coordenadas exactas, telemetría recibida y monitoreo de inactividad.
- **Entorno de Simulación de Flotilla:** Herramientas independientes (`backend/demo_flotilla.js`, `scripts/simulator.py` y `frontend/demo-flotilla.html`) diseñadas para inyectar telemetría sintética de múltiples unidades simultáneas, permitiendo realizar pruebas de estrés y demostraciones sin afectar los datos reales en producción.

---

## 🛠️ Stack Tecnológico

| Capa del Sistema | Tecnologías y Herramientas |
| :--- | :--- |
| **Hardware e IoT** | Microcontrolador ESP32, Módulo GPS NEO-6M/NEO-8M, C++ / Arduino Framework |
| **Infraestructura Cloud** | AWS API Gateway, AWS Lambda (Node.js/Python), Amazon DynamoDB, Ngrok |
| **Backend & Tiempo Real** | Node.js, TypeScript, Express.js, Socket.io, CORS, Dotenv |
| **Frontend & Cartografía** | React 18, TypeScript, Vite, Leaflet, React-Leaflet, CSS3 Modular |
| **Arquitectura & Control** | Monorepo (`npm workspaces`), Git, GitHub Actions (CI) |

---

## 📂 Estructura del Repositorio

El proyecto está estructurado como un monorepo gestionado mediante `npm workspaces` (`shared` y `frontend`), centralizando las dependencias del servidor backend y los scripts de orquestación en la raíz:

```text
Costa-Bus-Tracker/
├── .github/                           # Flujos de integración continua (CI)
├── backend/                           # Servidor API, Webhooks AWS y WebSockets (Node.js + TS)
│   ├── src/
│   │   ├── controllers/
│   │   │   └── awsController.ts       # Validación de headers y procesamiento de paquetes AWS
│   │   ├── routes/
│   │   │   └── awsRoutes.ts           # Definición del endpoint POST /api/aws/webhook/bus-location
│   │   ├── services/
│   │   │   └── busService.ts          # Lógica de negocio: estado de unidades, velocidad, progreso y ETA
│   │   ├── sockets/
│   │   │   └── socketManager.ts       # Gestión de salas y emisión en vivo vía Socket.io
│   │   └── index.ts                   # Punto de entrada Express (puerto 3001) y monitor de inactividad
│   ├── .env                           # Variables de entorno locales del servidor (no versionado)
│   └── demo_flotilla.js               # Script Node.js para inyectar unidades simuladas al webhook
│
├── documentacion/                     # Documentación técnica extendida, diagramas y notas de versión
│
├── frontend/                          # Aplicación web interactiva (React + Vite + TypeScript)
│   ├── src/
│   │   ├── components/
│   │   │   ├── AdminDashboard.tsx     # Panel privado de monitoreo administrativo
│   │   │   ├── AdminLogin.tsx         # Autenticación para el panel administrativo
│   │   │   ├── AlertList.tsx          # Listado de alertas activas en el corredor
│   │   │   ├── BusCard.tsx            # Tarjeta individual con métricas y botón de seguimiento
│   │   │   ├── BusList.tsx            # Panel lateral de unidades activas en ruta
│   │   │   ├── BusMarker.tsx          # Marcador dinámico de autobús en el mapa
│   │   │   ├── GoModePanel.tsx        # Tarjeta flotante de Modo GO con alertas de proximidad
│   │   │   ├── MapView.tsx            # Contenedor principal del mapa interactivo (Leaflet)
│   │   │   ├── NearbyRoutes.tsx       # Detección y listado de rutas cercanas al usuario
│   │   │   ├── PurchaseLinks.tsx      # Enlaces de compra de boletos por operador
│   │   │   ├── RoutePolyline.tsx      # Trazado geográfico de los corredores en el mapa
│   │   │   ├── ServiceAlerts.tsx      # Avisos generales de servicio y contingencias
│   │   │   └── ThemeToggle.tsx        # Selector de modo claro/oscuro
│   │   ├── hooks/
│   │   │   ├── useAlarmSound.ts       # Control de alertas sonoras en Modo GO
│   │   │   ├── useGeolocation.ts      # Obtención de coordenadas GPS del navegador del usuario
│   │   │   ├── useSmoothPosition.ts   # Interpolación suave del movimiento de los marcadores
│   │   │   ├── useSocket.ts           # Conexión WebSocket en tiempo real con el backend
│   │   │   └── useTheme.ts            # Persistencia y cambio de tema visual
│   │   ├── lib/
│   │   │   └── backendUrl.ts          # Resolución dinámica de la URL del servidor backend
│   │   ├── App.tsx                    # Componente raíz, estado global y selector de rutas
│   │   ├── main.tsx                   # Punto de montaje de React
│   │   ├── styles.css                 # Estilos globales y variables CSS de la interfaz
│   │   └── vite-env.d.ts              # Definiciones de entorno para Vite
│   ├── demo-flotilla.html             # Demostración estática independiente con múltiples unidades
│   ├── index.html                     # Plantilla HTML principal de la aplicación
│   ├── package.json                   # Dependencias y scripts exclusivos del frontend
│   ├── tsconfig.app.json              # Configuración TypeScript para el código de la app
│   ├── tsconfig.json                  # Configuración TypeScript base del frontend
│   ├── tsconfig.node.json             # Configuración TypeScript para entorno Node/Vite
│   └── vite.config.ts                 # Configuración del empaquetador Vite
│
├── scripts/
│   └── simulator.py                   # Script auxiliar en Python para pruebas de simulación GPS
│
├── shared/                            # Paquete compartido @costa-bus/shared
│   ├── src/                           # Tipos TypeScript, interfaces de telemetría y utilidades
│   ├── package.json                   # Configuración del workspace compartido
│   └── tsconfig.json                  # Configuración de compilación TypeScript
│
├── .env.example                       # Plantilla de referencia para variables de entorno
├── .gitignore                         # Archivos y directorios excluidos del control de versiones
├── package.json                       # Configuración raíz, workspaces y scripts globales
└── README.md                          # Documentación principal del repositorio
```

---

## ⚙️ Instalación y Configuración Local

### Requisitos Previos

- **Node.js** `v18.0.0` o superior y **npm** `v9.0.0` o superior.
- **Python** `3.9+` *(opcional, requerido únicamente si se desea ejecutar `scripts/simulator.py`)*.
- **Ngrok** *(requerido para recibir telemetría en vivo desde AWS Lambda en entorno local)*.

### 1. Clonar el Repositorio e Instalar Dependencias

```bash
git clone https://github.com/<tu-usuario>/Costa-Bus-Tracker.git
cd Costa-Bus-Tracker
npm install
```

### 2. Configurar Variables de Entorno

Copia la plantilla `.env.example` hacia los archivos `.env` correspondientes dentro de `backend/` y `frontend/`:

```bash
cp .env.example backend/.env
```

Asegúrate de definir las siguientes variables críticas:

```env
# Configuración del Backend (backend/.env)
PORT=3001
AWS_WEBHOOK_API_KEY=tu_llave_secreta_compartida_con_lambda
ADMIN_PASSWORD=contrasena_segura_panel_admin
CORS_ORIGIN=http://localhost:5173
```

```env
# Configuración del Frontend (frontend/.env)
VITE_BACKEND_URL=http://localhost:3001
```

### 3. Compilar el Paquete Compartido y Ejecutar Servicios

Construye primero los tipos compartidos (`@costa-bus/shared`) y levanta el servidor backend junto con el cliente frontend en terminales separadas:

```bash
# 1. Compilar workspace compartido
npm run build --workspace=shared

# 2. Iniciar servidor backend (Puerto 3001)
npm run dev:backend

# 3. Iniciar aplicación web frontend (Puerto 5173)
npm run dev --workspace=frontend
```

### 4. Exponer el Backend Local para AWS Lambda *(Opcional - Telemetría Real)*

Para recibir los paquetes reenviados desde AWS Lambda hacia tu entorno local, abre un túnel HTTPS apuntando al puerto del backend:

```bash
ngrok http 3001
```

Copia la URL pública HTTPS generada por Ngrok y configúrala en las variables de entorno de tu función **AWS Lambda** apuntando a `/api/aws/webhook/bus-location`.

---

## 📡 Especificación del Webhook de Telemetría (AWS → Backend)

El servidor backend expone el siguiente endpoint para recibir los paquetes reenviados desde AWS Lambda:

- **Endpoint:** `POST /api/aws/webhook/bus-location`
- **Encabezados Requeridos:**
  - `Content-Type: application/json`
  - `x-api-key: <AWS_WEBHOOK_API_KEY>`

### Ejemplo de Carga Útil (Payload JSON)

```json
{
  "busId": "AUT-104",
  "routeId": "autlan-melaque",
  "latitude": 19.48291,
  "longitude": -104.64812,
  "altitude": 312.5,
  "speed": 64.2,
  "satellites": 9,
  "timestamp": "2026-11-15T14:32:10.000Z"
}
```

### Prueba Rápida con `curl`

Puedes verificar que el webhook local responde correctamente ejecutando:

```bash
curl -X POST http://localhost:3001/api/aws/webhook/bus-location \
  -H "Content-Type: application/json" \
  -H "x-api-key: tu_llave_secreta_compartida_con_lambda" \
  -d '{
    "busId": "AUT-104",
    "routeId": "autlan-melaque",
    "latitude": 19.48291,
    "longitude": -104.64812,
    "altitude": 312.5,
    "speed": 64.2,
    "satellites": 9,
    "timestamp": "2026-11-15T14:32:10.000Z"
  }'
```

---

## 🧪 Pruebas y Simulación de Flotilla

Para validar el comportamiento del mapa, el cálculo de tiempos estimados de llegada (ETA) y las alertas del **Modo GO** sin necesidad de contar con una unidad física en movimiento, utiliza cualquiera de los simuladores incluidos:

- **Simulador en Node.js (Múltiples unidades en ruta):**
  ```bash
  node backend/demo_flotilla.js
  ```

- **Simulador en Python (Inyección parametrizable):**
  ```bash
  python scripts/simulator.py
  ```

- **Vista previa estática:** Abre directamente el archivo `frontend/demo-flotilla.html` en cualquier navegador web para visualizar una demostración autocontenida del comportamiento de la flotilla.

---

## 👥 Equipo de Desarrollo e Integración

Este proyecto fue concebido, diseñado, desarrollado e integrado por:

- **Sugely Díaz**
- **Williams Díaz**
- **Cuauhtémoc Flores**
- **Raúl Beltrán**

📍 **Lugar y Fecha:** La Huerta, Jalisco, México — Noviembre de 2026.

---

## 📄 Licencia y Uso

Este software ha sido desarrollado con fines académicos, tecnológicos y de innovación en movilidad regional para la Costa de Jalisco. Todos los derechos reservados por el equipo desarrollador.