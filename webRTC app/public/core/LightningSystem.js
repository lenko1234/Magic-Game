import * as THREE from 'three';

const _nSize = 64;
const _nData = new Uint8Array(_nSize * _nSize * 4);
for (let i = 0; i < _nSize * _nSize * 4; i++) _nData[i] = Math.random() * 255;
export const globalNoiseTex = new THREE.DataTexture(_nData, _nSize, _nSize, THREE.RGBAFormat);
globalNoiseTex.wrapS = THREE.RepeatWrapping;
globalNoiseTex.wrapT = THREE.RepeatWrapping;
globalNoiseTex.minFilter = THREE.LinearFilter;
globalNoiseTex.magFilter = THREE.LinearFilter;
globalNoiseTex.needsUpdate = true;

// ──────────────────────────────────────────────
// NOISE ALGORITHM (Self-contained)
// ──────────────────────────────────────────────
const noiseGLSL = `
uniform sampler2D uNoiseTex;
float snoise(vec3 v) {
    vec2 uv1 = v.xy * 0.015 + vec2(v.z * 0.005);
    vec2 uv2 = v.xy * 0.01 - vec2(v.z * 0.007);
    vec4 t1 = texture2D(uNoiseTex, uv1);
    vec4 t2 = texture2D(uNoiseTex, uv2);
    return (t1.r * 0.7 + t2.g * 0.3) * 2.0 - 1.0;
}
`;

const newLightningVert = `
${noiseGLSL}
varying vec2 vUv;
varying float vLife;
varying float vVerticalFade;
attribute float aRandom;
attribute vec3 aParams; 
uniform float uTime;
uniform float uDirection;
uniform float uClashOffset;
varying vec3 vWorldPos;

void main() {
    vUv = uv;
    float fps = 40.0 + aRandom * 20.0;
    float strobeTime = floor(uTime * fps) / fps;
    float spawnChance = snoise(vec3(aRandom * 100.0, strobeTime * 2.0, 0.0));
    vLife = step(0.2, spawnChance);
    
    vec3 pos = position;
    float normX = pos.x;
    
    float distFromCenter = abs(instanceMatrix[3][1]);
    vVerticalFade = 1.0 - clamp(distFromCenter / 3.5, 0.0, 1.0);
    
    float n1 = snoise(vec3(normX * 6.0, aRandom * 50.0, strobeTime * 3.0));
    float n2 = snoise(vec3(normX * 18.0, aRandom * 150.0, strobeTime * 6.0));
    float jagged = (abs(n1) + abs(n2) * 0.4) * uDirection;
    float envelope = 1.0 - pow(abs(normX * 2.0), 2.0);
    pos.y += jagged * 2.2 * envelope * aParams.x;
    pos.z += snoise(vec3(normX * 8.0, aRandom * 200.0, strobeTime * 4.0)) * 1.5 * envelope;
    
    vec4 worldPos = instanceMatrix * vec4(pos, 1.0);
    vWorldPos = worldPos.xyz;
    gl_Position = projectionMatrix * modelViewMatrix * worldPos;
}
`;

const newLightningFrag = `
varying vec2 vUv;
varying float vLife;
varying float vVerticalFade;
varying vec3 vWorldPos;
uniform vec3 uColor;
uniform float uDirection;
uniform float uClashOffset;
uniform float uIntensity;
uniform float uBottomOffset; // Corte trasero

void main() {
    if (vLife < 0.5) discard;
    
    if (uDirection > 0.0 && (vWorldPos.x > uClashOffset || vWorldPos.x < uBottomOffset)) discard;
    if (uDirection < 0.0 && (vWorldPos.x < uClashOffset || vWorldPos.x > uBottomOffset)) discard;
    
    // Blur en la cola del Strobe
    float distToBottom = (uDirection > 0.0) ? (vWorldPos.x - uBottomOffset) : (uBottomOffset - vWorldPos.x);
    float bottomFade = smoothstep(0.0, 5.0, distToBottom); 
    
    float d = abs(vUv.y - 0.5) * 2.0;
    float core = 1.0 - smoothstep(0.0, 0.05, d);
    float glow = pow(1.0 - d, 3.0);
    float edgeFade = smoothstep(0.0, 0.02, vUv.x) * smoothstep(1.0, 0.98, vUv.x);
    
    vec3 finalColor = ((vec3(1.0) * core * 0.4) + (uColor * glow * 0.3)) * vVerticalFade * uIntensity * bottomFade;
    gl_FragColor = vec4(finalColor * edgeFade, 1.0);
}
`;

/**
 * Creates an instanced strobe lightning system.
 * @param {THREE.Scene} scene - The target scene
 * @param {string|THREE.Color} color - Lightning color
 * @param {number} direction - 1.0 for Left-to-Right, -1.0 for Right-to-Left
 * @returns {THREE.ShaderMaterial} - The material to be updated in the loop
 */
export function createStrobeLightning(scene, color, direction) {
    const arcCount = 150;
    const beamLength = 50;
    const geo = new THREE.PlaneGeometry(1, 1, 128, 1);
    const mat = new THREE.ShaderMaterial({
        vertexShader: newLightningVert,
        fragmentShader: newLightningFrag,
        uniforms: {
            uTime: { value: 0 },
            uColor: { value: new THREE.Color(color) },
            uDirection: { value: direction },
            uClashOffset: { value: 0 },
            uBottomOffset: { value: -50 * direction }, // Fuera de pantalla al inicio
            uIntensity: { value: 1.0 },
            uNoiseTex: { value: globalNoiseTex }
        },
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide
    });

    const instMesh = new THREE.InstancedMesh(geo, mat, arcCount);
    const randoms = new Float32Array(arcCount);
    const params = new Float32Array(arcCount * 3);
    const dummy = new THREE.Object3D();

    for (let i = 0; i < arcCount; i++) {
        randoms[i] = Math.random();
        const isMainBranch = i < 12;
        const lengthMultiplier = isMainBranch ? (Math.random() * 0.3 + 0.9) : (Math.random() * 0.4 + 0.6);
        const thickness = isMainBranch ? (Math.random() * 0.2 + 0.1) : (Math.random() * 0.04 + 0.01);
        
        const currentLength = beamLength * lengthMultiplier;
        const startX = direction > 0 ? -25 : 25;
        const centerX = startX + (currentLength / 2) * (direction > 0 ? 1 : -1);
        
        const offsetY = (Math.random() - 0.5) * (isMainBranch ? 0.4 : 1.2);
        const offsetZ = (Math.random() - 0.5) * (isMainBranch ? 0.4 : 1.2);

        dummy.position.set(centerX, offsetY, offsetZ);
        dummy.rotation.x = Math.random() * Math.PI * 2;
        dummy.scale.set(currentLength, thickness, 1);
        dummy.updateMatrix();
        instMesh.setMatrixAt(i, dummy.matrix);

        params[i * 3 + 0] = lengthMultiplier;
        params[i * 3 + 1] = thickness;
        params[i * 3 + 2] = startX;
    }
    geo.setAttribute('aRandom', new THREE.InstancedBufferAttribute(randoms, 1));
    geo.setAttribute('aParams', new THREE.InstancedBufferAttribute(params, 3));
    scene.add(instMesh);
    return mat;
}

// ──────────────────────────────────────────────
// ORIGINAL CINEMATIC BEAM SYSTEM (MagicalBeam)
// ──────────────────────────────────────────────
const lightningVert = `
${noiseGLSL}
varying vec2 vUv;
varying float vDisplace;
varying float vTension;
varying float vNode;
varying float vDistToCore;
uniform float uTime;
uniform float uDirection;
uniform float uSeed;
uniform float uLayer;
uniform float uClashOffset;

void main(){
    vUv = uv;
    vec3 p = position;
    float t = uTime * 4.0;
    float node = smoothstep(0.4, 0.6, abs(sin(vUv.y * 3.0 + t * 0.2)));
    vNode = node;
    float compression = 1.0 - (node * 0.4);
    float macroFreq = (uLayer == 0.0) ? 0.1 : 0.3;
    float macroAmp = (uLayer == 0.0) ? 4.0 : 1.5;
    float n1 = snoise(vec3(p.y * macroFreq, t * 0.4, uSeed));
    float n2 = snoise(vec3(p.y * macroFreq * 3.0, t * 0.8, uSeed + 10.0));
    float combined = n1 + n2 * 0.3;
    float snappedN = pow(abs(combined), 1.1) * sign(combined); 
    float distToCore = smoothstep(0.4, 1.0, vUv.y);
    vDistToCore = distToCore;
    float gravityPull = pow(distToCore, 2.5);
    float twist = snoise(vec3(0.0, t * 0.1, 0.0)) * gravityPull * 5.0;
    float cosT = cos(twist);
    float sinT = sin(twist);
    float nx = p.x * cosT - p.z * sinT;
    float nz = p.x * sinT + p.z * cosT;
    p.x = mix(p.x, nx, gravityPull);
    p.z = mix(p.z, nz, gravityPull);
    p.x += (snappedN * macroAmp) * compression;
    p.z += (snoise(vec3(p.y * 0.3, t * 0.4, uSeed + 1.0)) * macroAmp * 0.2 * compression);
    vDisplace = snappedN;
    vTension = abs(combined); 
    float tip = (uDirection > 0.0) ? (uClashOffset + 25.0)/50.0 : (25.0 - uClashOffset)/50.0;
    float relProgress = clamp(vUv.y / tip, 0.0, 1.0);
    float tipConvergence = 1.0 - smoothstep(0.9, 1.0, relProgress);
    p.x *= tipConvergence;
    p.z *= tipConvergence;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}`;

const lightningFrag = `
${noiseGLSL}
varying vec2 vUv;
varying float vDisplace;
varying float vTension;
varying float vNode;
varying float vDistToCore;
uniform vec3 uColor;
uniform float uTime;
uniform float uDirection;
uniform float uIntensity;
uniform float uClashOffset;
uniform float uBottomOffset;

void main(){
    float d = abs(vUv.x - 0.5) * 2.0;
    float t = uTime * 25.0;
    float spine = smoothstep(0.02, 0.0, d); 
    float bite = step(0.98, snoise(vec3(vUv.y * 10.0, t * 0.5, 0.0)));
    float n = 1.0 - abs(snoise(vec3(vUv.y * 5.0 + t * uDirection, vUv.x * 2.0, t * 0.05)));
    float sharp = pow(n, 4.0); 
    float thickness = 0.015 + vNode * 0.04 + bite * 0.05;
    float collapse = step(-0.5, snoise(vec3(vUv.y * 1.0, t * 0.2, 0.0)));
    float fragmentation = step(0.5, snoise(vec3(vUv.y * 20.0, t * 2.0, 0.0))) * pow(vDistToCore, 2.0);
    float energyTheft = smoothstep(0.7, 1.0, vDistToCore);
    float tip = (uDirection > 0.0) ? (uClashOffset + 25.0)/50.0 : (25.0 - uClashOffset)/50.0;
    float bottom = (uDirection > 0.0) ? (uBottomOffset + 25.0)/50.0 : (25.0 - uBottomOffset)/50.0;
    
    if(vUv.y > tip || vUv.y < bottom) discard;
    
    float relProgress = clamp(vUv.y / tip, 0.0, 1.0);
    float tipFade = smoothstep(1.0, 0.97, relProgress); 
    float mask = smoothstep(thickness * tipFade, 0.0, d - sharp * 0.2) * (1.0 - fragmentation * 0.5);
    mask = max(mask * collapse, spine * (0.9 + fragmentation * 0.3));
    float glowNoise = snoise(vec3(vUv * 15.0, t * 0.1)) * 0.5 + 0.5;
    float glow = exp(-d * 18.0) * (sharp + vNode) * glowNoise * tipFade;
    vec3 col = mix(uColor, vec3(35.0), mask + spine);
    float acc = bite * 15.0 + vNode * 4.0 + fragmentation * 15.0;
    
    float bottomFade = smoothstep(0.0, 0.05, (vUv.y - bottom) / max(0.01, tip - bottom));
    float xFade = smoothstep(0.0, 0.15, vUv.y) * tipFade * bottomFade;
    
    vec3 finalCol = col * (mask * 10.0 + spine * 25.0 + glow * 5.0 + acc);
    finalCol *= uIntensity * 0.55 * (1.0 - energyTheft * 0.2); 
    gl_FragColor = vec4(finalCol, (mask + glow + spine) * xFade);
}`;

export class MagicalBeam {
    constructor(scene, color, direction, posX, rotZ) {
        this.group = new THREE.Group();
        this.mats = [];
        this.addLayer(0.2, color, direction, 0); 
        this.addLayer(0.4, color, direction, 1);
        this.addLayer(0.6, color, direction, 2);
        this.group.position.set(posX, 0, 0);
        this.group.rotation.z = rotZ;
        scene.add(this.group);
    }
    addLayer(radius, color, direction, layerId) {
        const mat = new THREE.ShaderMaterial({
            vertexShader: lightningVert,
            fragmentShader: lightningFrag,
            uniforms: {
                uTime: { value: 0 },
                uColor: { value: new THREE.Color(color) },
                uDirection: { value: direction },
                uLayer: { value: layerId },
                uSeed: { value: Math.random() * 100 },
                uIntensity: { value: 3.5 },
                uClashOffset: { value: 0 },
                uBottomOffset: { value: -25 * direction }
            },
            transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
        });
        const geo = new THREE.CylinderGeometry(radius, radius, 50, 16, 512, true);
        const mesh = new THREE.Mesh(geo, mat);
        this.group.add(mesh);
        this.mats.push(mat);
    }
    update(t, intensity, offset, bottom) {
        this.mats.forEach(m => {
            m.uniforms.uTime.value = t;
            m.uniforms.uIntensity.value = 3.5 + intensity;
            m.uniforms.uClashOffset.value = offset;
            m.uniforms.uBottomOffset.value = bottom;
        });
    }
}

// ──────────────────────────────────────────────
// SINGULARITY CORE SYSTEM
// ──────────────────────────────────────────────
const singularityVert = `
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vWorldPos;
void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPos = worldPos.xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const singularityFrag = `
${noiseGLSL}
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vWorldPos;
uniform float uTime;
uniform vec3 uColor1;
uniform vec3 uColor2;

void main() {
    vec3 p = normalize(vWorldPos);
    float t = uTime * 1.5;
    float dOffset = length(vUv - 0.5) * 2.0;
    float alphaMask = smoothstep(1.0, 0.7, dOffset);
    if(alphaMask < 0.01) discard;

    float n1 = snoise(p * 2.0 + t);
    float n2 = snoise(p * 4.0 - t * 0.5);
    float crackPattern = pow(abs(snoise(p * 8.0 + n1)), 2.0);
    float microFracture = smoothstep(0.7, 0.8, snoise(p * 25.0 + t * 2.0));
    float voids = smoothstep(0.4, 0.5, n1 * n2);
    float heart = exp(-dOffset * 4.0) * (1.0 + snoise(vec3(t * 5.0)));
    float shift = snoise(vec3(p.x * 2.0, p.y * 2.0, t));
    float angle = atan(p.z, p.x);
    float rays1 = sin(angle * 8.0 + t * 4.0) * 0.5 + 0.5;
    float rays2 = sin(angle * 12.0 - t * 3.0) * 0.5 + 0.5;
    float starburst = pow(rays1 * rays2, 3.0) * smoothstep(1.1, 0.0, dOffset);
    vec3 col = mix(uColor1, uColor2, p.x * 0.5 + 0.5 + shift * 0.4);
    col = mix(col, vec3(0.0), voids * 0.9);
    col += vec3(280.0) * heart;
    col += vec3(140.0) * crackPattern * (1.1 - dOffset);
    col += vec3(50.0) * starburst;
    float filaments = pow(abs(snoise(vec3(atan(p.z, p.x) * 4.0, p.y * 2.0, t * 0.3))), 8.0);
    col += uColor2 * filaments * 4.0 * (1.5 - dOffset);
    col += vec3(60.0) * exp(-dOffset * 30.0) * microFracture;
    gl_FragColor = vec4(col, alphaMask);
}
`;

export class Singularity {
    constructor(scene, color1, color2) {
        const geo = new THREE.SphereGeometry(1.5, 64, 64);
        this.mat = new THREE.ShaderMaterial({
            vertexShader: singularityVert,
            fragmentShader: singularityFrag,
            uniforms: {
                uTime: { value: 0 },
                uColor1: { value: new THREE.Color(color1) },
                uColor2: { value: new THREE.Color(color2) },
                uNoiseTex: { value: globalNoiseTex }
            },
            transparent: true, blending: THREE.AdditiveBlending, depthWrite: false
        });
        this.mesh = new THREE.Mesh(geo, this.mat);
        this.mesh.visible = false;
        scene.add(this.mesh);
    }
    update(t, pos, scale) {
        this.mat.uniforms.uTime.value = t;
        this.mesh.position.set(pos, 0, 0);
        this.mesh.scale.setScalar(scale);
        this.mesh.visible = scale > 0.01;
    }
}

// ──────────────────────────────────────────────
// SHOCKWAVE SYSTEM
// ──────────────────────────────────────────────
const shockwaveVert = `
varying vec2 vUv;
void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const shockwaveFrag = `
varying vec2 vUv;
uniform float uRadius;
uniform vec3 uColor;
void main() {
    float d = length(vUv - 0.5) * 2.0;
    float ring = smoothstep(uRadius, uRadius - 0.05, d) * smoothstep(uRadius - 0.1, uRadius - 0.05, d);
    gl_FragColor = vec4(uColor * ring * 5.0, ring);
}
`;

export function createShockwave(scene, pos, color) {
    const geo = new THREE.PlaneGeometry(15, 15);
    const mat = new THREE.ShaderMaterial({
        vertexShader: shockwaveVert,
        fragmentShader: shockwaveFrag,
        uniforms: { uRadius: { value: 0 }, uColor: { value: new THREE.Color(color) } },
        transparent: true, blending: THREE.AdditiveBlending, depthWrite: false
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(pos, 0, 0);
    mesh.rotation.x = -Math.PI / 2;
    scene.add(mesh);
    return { mesh, mat, radius: 0 };
}

// ──────────────────────────────────────────────
// CINEMATIC POST-PROCESSING SHADER
// ──────────────────────────────────────────────
export const CinematicShader = {
    uniforms: {
        "tDiffuse": { value: null },
        "uTime": { value: 0 }
    },
    vertexShader: `
        varying vec2 vUv;
        void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
    `,
    fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform float uTime;
        varying vec2 vUv;
        void main() {
            vec2 uv = vUv;
            float chromatic = 0.002 * sin(uTime * 2.0);
            vec4 cr = texture2D(tDiffuse, uv + vec2(chromatic, 0.0));
            vec4 cg = texture2D(tDiffuse, uv);
            vec4 cb = texture2D(tDiffuse, uv - vec2(chromatic, 0.0));
            vec3 col = vec3(cr.r, cg.g, cb.b);
            float vignette = smoothstep(1.2, 0.5, length(uv - 0.5));
            col *= mix(0.8, 1.0, vignette);
            gl_FragColor = vec4(col, 1.0);
        }
    `
};
