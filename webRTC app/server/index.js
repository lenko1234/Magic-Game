const express = require('express');
const http = require('http');
const https = require('https');
const fs = require('fs');
const { Server } = require('socket.io');
const path = require('path');

const app = express();

// Detect production environment
const isProduction = process.env.NODE_ENV === 'production';

let server;

if (isProduction) {
    // In production (Render, etc.), SSL is handled by the provider's proxy
    server = http.createServer(app);
} else {
    // Local development needs manual SSL for WebRTC/Camera access
    try {
        const sslOptions = {
            key: fs.readFileSync(path.join(__dirname, 'key.pem')),
            cert: fs.readFileSync(path.join(__dirname, 'cert.pem')),
        };
        server = https.createServer(sslOptions, app);
    } catch (err) {
        console.warn('⚠️ No se encontraron certificados SSL locales. Usando HTTP (algunas funciones WebRTC podrían no funcionar localmente).');
        server = http.createServer(app);
    }
}

const io = new Server(server, {
    cors: { origin: "*" }
});

app.use(express.static(path.join(__dirname, '../public')));

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Jugadores: se unen a la sala y disparan handshake WebRTC
    socket.on('join-room', (roomId) => {
        socket.join(roomId);
        console.log(`Player ${socket.id} joined room: ${roomId}`);
        socket.to(roomId).emit('user-joined', socket.id);
    });

    // Pantalla/Proyector: se une solo para escuchar eventos
    socket.on('screen-join', (roomId) => {
        socket.join(roomId);
        socket.data.isScreen = true;
        console.log(`Screen ${socket.id} joined room: ${roomId}`);
    });

    // Señalización WebRTC
    socket.on('signal', (data) => {
        socket.to(data.roomId).emit('signal', {
            from: socket.id,
            signalData: data.signalData
        });
    });

    // Relay de eventos de juego a la pantalla (hechizos, choques, etc.)
    socket.on('game-event', (data) => {
        socket.to(data.roomId).emit('game-event', data);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 Servidor WebRTC iniciado!`);
    if (isProduction) {
        console.log(`🌍 URL de producción activa`);
    } else {
        console.log(`📱 Abrir en los teléfonos: https://[TU_IP_LOCAL]:${PORT}`);
        console.log(`🖥️  Pantalla: https://[TU_IP_LOCAL]:${PORT}/pantalla.html?room=SALA`);
        console.log(`\n⚠️  Aceptar el certificado en el navegador antes de empezar.`);
    }
});
