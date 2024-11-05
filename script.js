const canvas = document.getElementById('glCanvas');
const gl = canvas.getContext('webgl');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let audioLevel = 0.5;       // Niveau général
let highFreqLevel = 0.5;    // Niveau des hautes fréquences
let noiseLevel = 1;

// Tableau pour stocker les sphères
let spheres = [
    //{ position: [-1.5, 0.0, 0.0], radius: 0.5 },
];

// Fonction pour ajouter une sphère
function addSphere() {
    // Ajoute une nouvelle sphère à des positions aléatoires avec un rayon aléatoire
    const x = (Math.random() - 0.5) * 4; // Position x aléatoire
    const y = (Math.random() - 0.5) * 4; // Position y aléatoire
    const radius = 0.3 + Math.random() * 0.5; // Rayon aléatoire
    spheres.push({ position: [x, y, 0], radius }); // Ajoute la sphère au tableau
}
// Écouteur d'événement pour le bouton
document.getElementById('addSphereButton').addEventListener('click', addSphere);

// Écouteur pour la sensibilité du microphone
document.getElementById('sensitivity').addEventListener('input', function() {
    const sensitivity = parseFloat(this.value);
    // Vous pouvez ajuster l'audioLevel ou d'autres paramètres basés sur la sensibilité ici
    noiseLevel = sensitivity; // Par exemple, vous pourriez l'utiliser pour moduler l'effet
});



// Création de shaders
function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        return shader;
    } else {
        console.error(gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
    }
}

function createProgram(gl, vertexSource, fragmentSource) {
    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (gl.getProgramParameter(program, gl.LINK_STATUS)) {
        return program;
    } else {
        console.error(gl.getProgramInfoLog(program));
        gl.deleteProgram(program);
    }
}

// Shader de vertex
const vertexShaderSource = `
    attribute vec2 a_position;
    void main() {
        gl_Position = vec4(a_position, 0, 1);
    }
`;

const fragmentShaderSource = `
    precision highp float;

    uniform float u_time;
    uniform float u_audioLevel;
    uniform float u_highFreqLevel;

    const float baseRadius = 0.5; // Rayon de base
    const float maxSize = 1.0;     // Taille maximale

    // Positions des sphères
    uniform vec3 spherePositions[10]; // Max 10 sphères
    uniform float sphereRadii[10];

    float distanceField(vec3 p) {
        float dist = 100.0; // Valeur par défaut pour la distance
        
        // Calcul de la distance pour chaque sphère
        for (int i = 0; i < 10; i++) {
            float deform = 0.1 * sin(10.0 * (p.y + float(i))) * u_audioLevel;
            float radius = baseRadius + deform + maxSize * u_audioLevel; // Taille variable
            float sphereDist = length(p - spherePositions[i]) - radius; // Distance de la sphère i
            dist = min(dist, sphereDist); // Prendre la plus courte distance
        }
        
        return dist; // Retourne la distance minimale
    }

    vec3 rainbowColor(float t) {
        return 0.5 + 0.5 * vec3(sin(t + 0.0), sin(t + 2.0), sin(t + 4.0)); // Couleurs arc-en-ciel
    }

    vec3 calculateLighting(vec3 normal, vec3 lightDir) {
        float lightIntensity = max(dot(normal, lightDir), 0.0);
        float audioInfluence = clamp(u_highFreqLevel * 3.0, 0.0, 1.0); // Limiter à [0, 1]
        vec3 baseColor = rainbowColor(lightIntensity * audioInfluence);
        return baseColor * lightIntensity * 2.0; // Zone sombre
    }

    vec3 calculateNormal(vec3 p) {
        float delta = 0.001;
        return normalize(vec3(
            distanceField(p + vec3(delta, 0.0, 0.0)) - distanceField(p - vec3(delta, 0.0, 0.0)),
            distanceField(p + vec3(0.0, delta, 0.0)) - distanceField(p - vec3(0.0, delta, 0.0)),
            distanceField(p + vec3(0.0, 0.0, delta)) - distanceField(p - vec3(0.0, 0.0, delta))
        ));
    }

    void main() {
        vec2 uv = gl_FragCoord.xy / vec2(${canvas.width}.0, ${canvas.height}.0) * 2.0 - 1.0;
        uv.x *= ${canvas.width}.0 / ${canvas.height}.0;

        vec3 rayOrigin = vec3(0.0, 0.0, 2.0);
        vec3 rayDir = normalize(vec3(uv, -1.0));

        float totalDistance = 0.0;
        const float maxDistance = 100.0;
        const float minDistance = 0.001;

        for (int i = 0; i < 100; i++) {
            vec3 p = rayOrigin + totalDistance * rayDir;
            float dist = distanceField(p);

            if (dist < minDistance) {
                vec3 normal = calculateNormal(p);
                vec3 lightDir = normalize(vec3(sin(u_time * 0.5), 1.0, cos(u_time * 0.5)));
                vec3 lightingColor = calculateLighting(normal, lightDir);

                // Contrôle de l'intensité finale de la couleur en fonction de l'audio
                float shade = 0.5 + 0.5 * sin(dot(p * 2.0, vec3(12.0, 0.5, 4.0)) + u_time);
                vec3 finalColor = lightingColor * shade * (0.6 + 0.4 * u_highFreqLevel);

                // S'assurer que la couleur ne devient jamais noire
                finalColor = max(finalColor, vec3(0.1));

                gl_FragColor = vec4(finalColor, 1.0);
                return;
            }
            totalDistance += dist;
            if (totalDistance >= maxDistance) break;
        }

        gl_FragColor = vec4(0.1, 0.1, 0.1, 1.0); // Fond noir
    }
`;

// Créer le programme et l'utiliser
const program = createProgram(gl, vertexShaderSource, fragmentShaderSource);
gl.useProgram(program);

const positionBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
const positions = new Float32Array([
    -1, -1,
     1, -1,
    -1,  1,
     1,  1,
]);
gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

const positionLocation = gl.getAttribLocation(program, 'a_position');
gl.enableVertexAttribArray(positionLocation);
gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

// Uniforms pour le temps et l'audio
const uTimeLocation = gl.getUniformLocation(program, 'u_time');
const uAudioLevelLocation = gl.getUniformLocation(program, 'u_audioLevel');
const uHighFreqLevelLocation = gl.getUniformLocation(program, 'u_highFreqLevel');

// Uniforms pour les sphères
const uSpherePositions = gl.getUniformLocation(program, 'spherePositions');
const uSphereRadii = gl.getUniformLocation(program, 'sphereRadii');

function render(time) {
    gl.uniform1f(uTimeLocation, time * 0.001);
    gl.uniform1f(uAudioLevelLocation, audioLevel);
    gl.uniform1f(uHighFreqLevelLocation, highFreqLevel);

    // Mettre à jour les positions et rayons des sphères
    const spherePositionsArray = new Float32Array(spheres.length * 3);
    const sphereRadiiArray = new Float32Array(spheres.length);
    
    spheres.forEach((sphere, index) => {
        spherePositionsArray.set(sphere.position, index * 3);
        sphereRadiiArray[index] = sphere.radius;
    });

    gl.uniform3fv(uSpherePositions, spherePositionsArray);
    gl.uniform1fv(uSphereRadii, sphereRadiiArray);

    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    requestAnimationFrame(render);
}

function initAudio() {
    navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
        const audioContext = new AudioContext();
        const analyser = audioContext.createAnalyser();
        const source = audioContext.createMediaStreamSource(stream);

        source.connect(analyser);
        analyser.fftSize = 256;

        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        function updateAudioLevel() {
            analyser.getByteFrequencyData(dataArray);
            let sum = 0;
            let highFreqSum = 0;
            const highFreqRange = Math.floor(dataArray.length * 0.75);

            for (let i = 0; i < dataArray.length; i++) {
                sum += dataArray[i];
                if (i >= highFreqRange) {
                    highFreqSum += dataArray[i];
                }
            }

            audioLevel = (sum / dataArray.length / 255)/noiseLevel; // Normaliser puis diviser pour atténuer
            highFreqLevel = (highFreqSum / (dataArray.length - highFreqRange) / 255)/noiseLevel; // Normaliser hautes fréquences
            requestAnimationFrame(updateAudioLevel);
        }
        
        updateAudioLevel();
    });
}

initAudio();
requestAnimationFrame(render);
