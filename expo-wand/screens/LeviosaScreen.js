import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Accelerometer } from 'expo-sensors';
import * as Haptics from 'expo-haptics';
import { useKeepAwake } from 'expo-keep-awake';
import { LeviosaGestureDetector } from '../core/leviosa_math';

let moveCounter = 0;

export default function LeviosaScreen({ socket, roomId, onBack }) {
  useKeepAwake(); // Previene que la pantalla se apague

  const [status, setStatus] = useState('Haz el gesto: Swish & Flick');
  const detectorRef = useRef(new LeviosaGestureDetector());
  const subscriptionRef = useRef(null);

  // Brush position para el rastro
  const brushX = useRef(0);
  const brushY = useRef(0);
  const isLevitating = useRef(false);

  useEffect(() => {
    // Configurar el callback cuando el gesto es correcto
    detectorRef.current.onGestureComplete = () => {
      setStatus('✨ ¡Wingardium Leviosa Exitoso!');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      isLevitating.current = true;
      
      if (socket) {
        socket.emit('game-event', { roomId, event: 'leviosa-start' });
      }

      setTimeout(() => {
        setStatus('Levitando... Controla la pluma.');
      }, 2000);
    };

    // Ajustar a 60Hz (~16ms)
    Accelerometer.setUpdateInterval(16);
    startSensors();

    return () => {
      stopSensors();
    };
  }, []);

  const lastX = useRef(null);
  const lastY = useRef(null);

  const startSensors = () => {
    subscriptionRef.current = Accelerometer.addListener(accelerometerData => {
      // Para el gesto usamos m/s^2 (multiplicado por 9.8)
      const accMps = {
        x: accelerometerData.x * 9.8,
        y: accelerometerData.y * 9.8,
        z: accelerometerData.z * 9.8,
      };

      if (!isLevitating.current) {
        detectorRef.current.processMotion(accMps);

        // Actualizar brush para visualizar rastro (escala mayor para visibilidad)
        brushX.current += (accMps.x * 3);
        brushY.current -= (accMps.y * 3);

        // Fricción para que vuelva al centro
        brushX.current += (0 - brushX.current) * 0.05;
        brushY.current += (0 - brushY.current) * 0.05;

        if (socket) {
          socket.emit('game-event', {
            roomId,
            event: 'leviosa-draw',
            x: brushX.current,
            y: brushY.current
          });
        }
      } else {
        // MODO VUELO: Calculamos el Delta (Inercia)
        if (lastX.current === null) {
          lastX.current = accelerometerData.x;
          lastY.current = accelerometerData.y;
          return;
        }

        // EXPO MIDE EN 'G' (Gravedad). LA WEB MIDE EN m/s2.
        // 1 G = 9.8 m/s2. Tenemos que multiplicar por 9.8 para que los números sean idénticos a la web.
        const dx = (accelerometerData.x - lastX.current) * 9.8;
        const dy = (accelerometerData.y - lastY.current) * 9.8;

        lastX.current = accelerometerData.x;
        lastY.current = accelerometerData.y;

        // Subimos el threshold de 0.1 a 0.4 para ignorar el temblor de la mano
        if (socket && (Math.abs(dx) > 0.4 || Math.abs(dy) > 0.4)) {
          moveCounter++;
          socket.emit('game-event', {
            roomId,
            event: 'leviosa-move',
            seq: moveCounter,
            dx: dx,
            dy: dy
          });
        }
      }
    });
  };

  const stopSensors = () => {
    if (subscriptionRef.current) {
      subscriptionRef.current.remove();
      subscriptionRef.current = null;
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={onBack}>
        <Text style={styles.backText}>{'< Salir'}</Text>
      </TouchableOpacity>

      <Text style={styles.roomInfo}>Sala: {roomId}</Text>

      <View style={styles.centerBox}>
        <Text style={styles.status}>{status}</Text>
        <View style={styles.wandContainer}>
          <Text style={styles.wand}>🪄</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#09090b', alignItems: 'center', justifyContent: 'center' },
  backButton: { position: 'absolute', top: 50, left: 20, padding: 10 },
  backText: { color: '#a1a1aa', fontSize: 16 },
  roomInfo: { position: 'absolute', top: 60, color: '#3f3f46', fontSize: 14, fontWeight: 'bold' },
  centerBox: { alignItems: 'center' },
  status: { color: '#fff', fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 40 },
  wandContainer: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#18181b', borderWidth: 2, borderColor: '#facc15', alignItems: 'center', justifyContent: 'center', shadowColor: '#facc15', shadowOpacity: 0.3, shadowRadius: 20 },
  wand: { fontSize: 50 }
});
