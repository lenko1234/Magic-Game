# 🪄 Magic Bridge: Celular -> PC

He implementado el sistema completo para que puedas controlar tu PC desde el celular usando **Socket.io**. El diseño sigue una estética "Premium Dark" con glassmorphism y animaciones fluidas.

## 📂 Estructura del Proyecto
- `server/index.js`: El servidor central que conecta ambos dispositivos.
- `public/pc.html`: La pantalla principal (Santuario) que recibirá los ataques.
- `public/mobile.html`: El controlador (Cetro Mágico) para tu celular.

## 🚀 Cómo ponerlo en marcha

1. **Inicia el servidor:**
   Abre una terminal y ejecuta:
   ```bash
   cd "/home/robert/apps/Magic Game/server"
   node index.js
   ```

2. **Abre la pantalla en tu PC:**
   En el navegador de tu computadora, ve a:
   [https://localhost:3000/pc.html](https://localhost:3000/pc.html)

3. **Conecta tu celular:**
   Escribe esto en el navegador de tu celu (asegúrate de estar en el mismo Wi-Fi):
   `https://10.180.1.178:3000/mobile.html`

> **Nota:** Al usar un certificado auto-firmado, verás una advertencia. Haz clic en "Opciones avanzadas" y luego en "Continuar a localhost (no seguro)".

## ⚡ Características Incluidas
- **PC:** Sacudida de pantalla (Screen Shake), destellos de colores según el elemento (Fuego, Hielo, Naturaleza) y notificaciones dinámicas.
- **Móvil:** Botones táctiles optimizados, vibración (haptic feedback) al lanzar hechizos y feedback visual inmediato.
- **Arquitectura:** Comunicación bidireccional en tiempo real con latencia mínima.
