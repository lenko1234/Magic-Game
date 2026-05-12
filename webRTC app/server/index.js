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
    // Local development: Necesitamos HTTPS para que funcionen los sensores en el navegador del celular
    try {
        const sslOptions = {
            key: fs.readFileSync(path.join(__dirname, 'key.pem')),
            cert: fs.readFileSync(path.join(__dirname, 'cert.pem')),
        };
        server = https.createServer(sslOptions, app);
        console.log('🛡️  Modo Desarrollo: HTTPS habilitado para sensores web.');
    } catch (err) {
        console.warn('⚠️ No se encontraron certificados SSL locales. Usando HTTP (los sensores NO funcionarán en el navegador).');
        server = http.createServer(app);
    }
}

const io = new Server(server, {
    cors: { origin: "*" }
});

app.use(express.static(path.join(__dirname, '../public')));
app.use('/v2', express.static(path.join(__dirname, '../colision 2.0')));

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Jugadores: se unen a la sala y disparan handshake WebRTC
    socket.on('join-room', (roomId) => {
        const room = roomId.toUpperCase();
        socket.join(room);
        console.log(`Player ${socket.id} joined room: ${room}`);
        socket.to(room).emit('user-joined', socket.id);
    });

    // Pantalla/Proyector: se une solo para escuchar eventos
    socket.on('screen-join', (roomId) => {
        const room = roomId.toUpperCase();
        socket.join(room);
        socket.data.isScreen = true;
        console.log(`Screen ${socket.id} joined room: ${room}`);
    });

    // Nuevo flujo: Unirse desde el QR de la Pantalla
    socket.on('join-setup', (roomId) => {
        const room = roomId.toUpperCase();
        const clients = io.sockets.adapter.rooms.get(room);
        let numPlayers = 0;
        
        if (clients) {
            for (const clientId of clients) {
                const clientSocket = io.sockets.sockets.get(clientId);
                if (clientSocket && !clientSocket.data.isScreen) {
                    numPlayers++;
                }
            }
        }
        
        if (numPlayers === 0) {
            socket.join(room);
            socket.emit('setup-role', { role: 'host', room: room });
            socket.to(room).emit('player-joined', { player: 1 });
            console.log(`Player ${socket.id} joined setup as Host in room: ${room}`);
        } else if (numPlayers === 1) {
            socket.join(room);
            socket.emit('setup-role', { role: 'client', room: room });
            socket.to(room).emit('player-joined', { player: 2 });
            // Fundamental: avisar al Host que llegó su rival
            socket.to(room).emit('user-joined', socket.id);
            console.log(`Player ${socket.id} joined setup as Client in room: ${room}`);
        } else {
            socket.emit('setup-role', { role: 'full' });
            console.log(`Player ${socket.id} rejected, room ${room} is full`);
        }
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
        const room = data.roomId ? data.roomId.toUpperCase() : null;
        
        if (data.event === 'leviosa-debug') {
            console.log(`[DEBUG] Gesto en sala ${room}: ${data.data.msg}`);
        }
        
        if (data.event === 'leviosa-move') {
            console.log(`[#${data.seq}] 📱 [TEL] Envía -> dx: ${data.dx?.toFixed(2)} dy: ${data.dy?.toFixed(2)}`);
        }

        if (room) {
            socket.to(room).emit('game-event', data);
        }
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
        console.log(`\n⚠️  Recuerda aceptar el certificado auto-firmado en el navegador.`);
    }
});
