# 🪄 Magic Clash: Duelo de Magos P2P

**Magic Clash** es una experiencia de duelo mágico de alta fidelidad que transforma tu celular en una varita y tu PC en un santuario de combate. Utiliza tecnologías modernas de comunicación en tiempo real y gráficos avanzados para una inmersión total.

## 🌟 Características Principales

- **Conexión P2P (WebRTC):** Comunicación directa entre dispositivos para una latencia casi nula.
- **Control por Gestos:** Olvídate de los botones. Lanza hechizos agitando tu teléfono (acelerómetro y giroscopio).
- **El Santuario (Projector View):** Una pantalla cinematográfica con efectos de **Three.js**, **Raymarching** y **Bloom** para visualizar el duelo.
- **Mecánica de Choque (Clash):** Cuando dos hechizos colisionan, entra en un duelo de pulso mágico donde la estabilidad de tu mano decide el ganador.
- **Feedback Háptico:** Siente la vibración de los hechizos y el impacto de los ataques en tu mano.
- **Barras de Vida Líquidas:** Visualización fluida y dinámica de la energía vital.

## 📂 Estructura del Proyecto

El corazón del proyecto se encuentra en la carpeta `webRTC app/`:

- **`webRTC app/public/index.html`**: El "Controlador/Varita" para el celular. Incluye escáner QR y detección de gestos.
- **`webRTC app/public/pantalla.html`**: El "Santuario" para la PC/Proyector. Renderiza la batalla en 3D.
- **`webRTC app/server/index.js`**: Servidor de señalización (Signaling) para establecer la conexión P2P.

## 🚀 Instalación y Puesta en Marcha

### 1. Requisitos previos
Tener instalado [Node.js](https://nodejs.org/).

### 2. Iniciar el servidor
```bash
cd "webRTC app/server"
npm install
node index.js
```

### 3. Abrir el Santuario (PC)
En tu navegador (Chrome recomendado), accede a:
`https://localhost:3001/pantalla.html`

### 4. Conectar la Varita (Celular)
1. Asegúrate de que tu celular y PC estén en la **misma red Wi-Fi**.
2. Accede a la IP de tu PC (ejemplo: `https://192.168.1.XX:3001`).
3. Usa el **Escáner QR** o introduce el código de sala que aparece en la pantalla de la PC.

> [!IMPORTANT]
> **HTTPS y Sensores:** Para que los sensores de movimiento funcionen en el celular, es posible que necesites acceder vía HTTPS o habilitar los permisos de "Motion & Orientation" en los ajustes del navegador de tu móvil.

## 🧙 Hechizos Disponibles (Gestos)

- **Expelliarmus:** Un movimiento rápido hacia adelante. Desarma al rival por 3 segundos.
- **Desmaius:** Un golpe fuerte descendente. Gran daño directo.
- **Protego:** Mantén el celular en posición vertical. Crea un escudo que mitiga ataques.
- **Accio:** Un tirón hacia atrás. Daño leve pero difícil de bloquear.

---
Desarrollado con ❤️ por el equipo de Magia Digital.
