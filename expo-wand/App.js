import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, SafeAreaView, KeyboardAvoidingView, Platform } from 'react-native';
import { io } from 'socket.io-client';
import LeviosaScreen from './screens/LeviosaScreen';

// Reemplaza esto con tu IP local cuando corras la app
const SERVER_URL = 'http://192.168.1.33:3001'; 

export default function App() {
  const [socket, setSocket] = useState(null);
  const [roomId, setRoomId] = useState('');
  const [currentScreen, setCurrentScreen] = useState('LOBBY'); // LOBBY, LEVIOSA, DUEL

  useEffect(() => {
    const newSocket = io(SERVER_URL);
    setSocket(newSocket);
    
    return () => newSocket.close();
  }, []);

  const handleConnect = () => {
    const cleanRoomId = roomId.trim().toUpperCase();
    if (cleanRoomId && socket) {
      socket.emit('join-room', cleanRoomId);
      setRoomId(cleanRoomId); // Actualizar estado para consistencia
      setCurrentScreen('LEVIOSA'); 
    }
  };

  if (currentScreen === 'LEVIOSA') {
    return <LeviosaScreen socket={socket} roomId={roomId.trim()} onBack={() => setCurrentScreen('LOBBY')} />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.content}>
        <Text style={styles.title}>Magic Game</Text>
        <Text style={styles.subtitle}>Wand Controller</Text>
        
        <View style={styles.card}>
          <TextInput
            style={styles.input}
            placeholder="Room ID (ej: SALA)"
            placeholderTextColor="#666"
            value={roomId}
            onChangeText={setRoomId}
            autoCapitalize="characters"
          />
          <TouchableOpacity style={styles.button} onPress={handleConnect}>
            <Text style={styles.buttonText}>CONECTAR VARITA</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#09090b' },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  title: { fontSize: 32, fontWeight: 'bold', color: '#fff', marginBottom: 5 },
  subtitle: { fontSize: 16, color: '#a1a1aa', marginBottom: 40 },
  card: { width: '100%', maxWidth: 350, backgroundColor: '#18181b', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: '#27272a' },
  input: { backgroundColor: '#09090b', color: '#fff', padding: 15, borderRadius: 8, fontSize: 18, textAlign: 'center', marginBottom: 20, borderWidth: 1, borderColor: '#27272a' },
  button: { backgroundColor: '#3b82f6', padding: 15, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});
