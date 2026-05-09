export class LeviosaGestureDetector {
    constructor(options = {}) {
        this.timeWindow = options.timeWindow || 1000; 
        this.state = 'IDLE';
        this.lastSwishTime = 0;
        this.onGestureComplete = null;
        this.onDebug = null; // Callback para enviar logs
        
        this.history = []; // Buffer de movimiento para diagnóstico
        this.maxHistory = 50; 
    }

    processMotion(acc) {
        if (!acc || acc.x === undefined) return;

        const now = Date.now();
        const x = acc.x;
        const y = acc.y;
        const z = acc.z;

        // Guardar en historial para debugging
        this.history.push({ t: now, x, y, z, state: this.state });
        if (this.history.length > this.maxHistory) this.history.shift();

        if (this.state === 'IDLE') {
            let maxY = -Infinity;
            let maxX = -Infinity;
            let minX = Infinity;

            const framesToAnalyze = Math.min(20, this.history.length);
            for (let i = this.history.length - framesToAnalyze; i < this.history.length; i++) {
                const h = this.history[i];
                if (h.y > maxY) maxY = h.y;
                if (h.x > maxX) maxX = h.x;
                if (h.x < minX) minX = h.x;
            }

            // Umbrales promediados de los 12 gestos naturales (asumiendo escala m/s^2)
            if (maxY > 8 && maxX > 8 && minX < -12) {
                this.state = 'FLICK_DETECTED'; 
                console.log('✨ PATRÓN LÁTIGO DETECTADO! Gesto completado.');
                
                if (this.onDebug) this.onDebug({ msg: "GESTURE_COMPLETE (Expo)", history: [...this.history] });
                if (this.onGestureComplete) this.onGestureComplete();
                
                setTimeout(() => { this.state = 'IDLE'; }, 1500);
            }
        }
    }

    reset() {
        this.state = 'IDLE';
        this.history = [];
    }
}
