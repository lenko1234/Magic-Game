export class LeviosaGestureDetector {
    constructor(options = {}) {
        this.timeWindow = options.timeWindow || 1000; 
        this.swishThreshold = options.swishThreshold || 12; // Aumentado para evitar disparos accidentales
        this.flickThreshold = options.flickThreshold || 15; // Aumentado
        
        this.state = 'IDLE';
        this.lastSwishTime = 0;
        this.onGestureComplete = null;
        this.onDebug = null; // Callback para enviar logs
        
        this.history = []; // Buffer de movimiento para diagnóstico
        this.maxHistory = 50; 
    }

    processMotion(event) {
        let acc = event.acceleration;
        if (!acc || (acc.x === null)) {
            acc = event.accelerationIncludingGravity;
        }
        if (!acc || acc.x === null) return;

        const now = Date.now();
        const x = acc.x;
        const y = acc.y;
        const z = acc.z;

        // Guardar en historial para debugging
        this.history.push({ t: now, x, y, z, state: this.state });
        if (this.history.length > this.maxHistory) this.history.shift();

        if (this.state === 'IDLE') {
            // Buscamos el patrón "Látigo" del usuario en los últimos 20 frames (aprox 300ms)
            // Características del patrón:
            // 1. Un pico altísimo en Y (frenazo hacia arriba/adelante) > 18G
            // 2. Un balanceo violento en X (de +15G a -15G o viceversa)
            
            let maxY = -Infinity;
            let maxX = -Infinity;
            let minX = Infinity;

            // Analizamos los últimos 20 frames (o lo que haya en el historial)
            const framesToAnalyze = Math.min(20, this.history.length);
            for (let i = this.history.length - framesToAnalyze; i < this.history.length; i++) {
                const h = this.history[i];
                if (h.y > maxY) maxY = h.y;
                if (h.x > maxX) maxX = h.x;
                if (h.x < minX) minX = h.x;
            }

            // Umbrales promediados de los 12 gestos naturales:
            // El usuario promedia picos de Y=13, MaxX=13, MinX=-20
            // Usamos un margen seguro para que no tenga que forzarlo:
            if (maxY > 8 && maxX > 8 && minX < -12) {
                this.state = 'FLICK_DETECTED'; // Usamos el mismo estado final
                console.log('✨ PATRÓN LÁTIGO DETECTADO! Gesto completado.');
                
                if (this.onDebug) this.onDebug({ msg: "GESTURE_COMPLETE (Personalizado)", history: [...this.history] });
                if (this.onGestureComplete) this.onGestureComplete();
                
                // Cooldown largo para evitar que el mismo movimiento dispare dos veces
                setTimeout(() => { this.state = 'IDLE'; }, 1500);
            }
        }
    }

    reset() {
        this.state = 'IDLE';
        this.history = [];
    }
}
