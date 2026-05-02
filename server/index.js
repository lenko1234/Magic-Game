const express = require('express');
const https = require('https');
const fs = require('fs');
const { Server } = require('socket.io');
const path = require('path');

const app = express();

const sslOptions = {
    key: fs.readFileSync(path.join(__dirname, 'key.pem')),
    cert: fs.readFileSync(path.join(__dirname, 'cert.pem')),
};

const server = https.createServer(sslOptions, app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, '../public')));

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    socket.on('hechizo', (data) => {
        console.log('Spell received:', data);
        // Relay to everyone (including sender and PC)
        io.emit('recibir-ataque', data);
    });

    socket.on('ping_sync', (data) => {
        socket.emit('pong_sync', { 
            t1: data.t1, 
            serverTime: Date.now() 
        });
    });

    socket.on('motion_data', (data) => {
        // Broadcast motion data to all other connected clients (the PC)
        socket.broadcast.emit('motion_data', data);
    });

    socket.on('inestabilidad', (data) => {
        // Relay motion instability from mobile to PC (and other clients)
        socket.broadcast.emit('inestabilidad', data);
    });

    socket.on('choque-terminado', (data) => {
        // PC notifies all mobiles that the clash is over
        socket.broadcast.emit('choque-terminado', data);
    });

    socket.on('choque-iniciado', (data) => {
        // PC notifies all mobiles that the clash has started
        socket.broadcast.emit('choque-iniciado', data);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 Servidor Mágico iniciado!`);
    console.log(`💻 En PC abrir: https://localhost:${PORT}/pc.html`);
    console.log(`📱 En Móvil abrir: https://[TU_IP_LOCAL]:${PORT}/mobile.html`);
    console.log(`\n⚠️  IMPORTANTE: Debes usar HTTPS y aceptar el certificado en el navegador.`);
});
