import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

/* --- SETUP THREE.JS --- */
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111111);
scene.fog = new THREE.FogExp2(0x111111, 0.015); // Nebbia per atmosfera

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
// Posiziona la camera in alto e inclinata (Top-Down isometrico)
camera.position.set(0, 40, 30); 
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true; // Abilita ombre
document.body.appendChild(renderer.domElement);

// Luci
const ambientLight = new THREE.AmbientLight(0x404040, 2); // Luce ambientale soffusa
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 2);
dirLight.position.set(20, 50, 20);
dirLight.castShadow = true;
dirLight.shadow.mapSize.width = 2048;
dirLight.shadow.mapSize.height = 2048;
// Area ombre
dirLight.shadow.camera.left = -50;
dirLight.shadow.camera.right = 50;
dirLight.shadow.camera.top = 50;
dirLight.shadow.camera.bottom = -50;
scene.add(dirLight);

// Pavimento (Griglia)
const gridHelper = new THREE.GridHelper(100, 50, 0x00ffff, 0x222222);
scene.add(gridHelper);

const planeGeo = new THREE.PlaneGeometry(100, 100);
const planeMat = new THREE.MeshStandardMaterial({ color: 0x000000, roughness: 0.8 });
const floor = new THREE.Mesh(planeGeo, planeMat);
floor.rotation.x = -Math.PI / 2; // Ruota per renderlo orizzontale
floor.receiveShadow = true;
scene.add(floor);

/* --- INPUT HANDLING (Identico al 2D) --- */
const keys = { w: false, a: false, s: false, d: false };
const input = { moveX: 0, moveY: 0, aimX: 0, aimY: 0, isFiring: false, usingGamepad: false };
const mouseInput = { x: 0, y: 0, isDown: false, active: false }; // active traccia se il mouse è stato usato

// Joypad & Keyboard Listeners
window.addEventListener('keydown', e => { if(keys.hasOwnProperty(e.key.toLowerCase())) keys[e.key.toLowerCase()] = true; if(e.code==='KeyW') keys.w=true; if(e.code==='KeyS') keys.s=true; if(e.code==='KeyA') keys.a=true; if(e.code==='KeyD') keys.d=true; });
window.addEventListener('keyup', e => { if(keys.hasOwnProperty(e.key.toLowerCase())) keys[e.key.toLowerCase()] = false; if(e.code==='KeyW') keys.w=false; if(e.code==='KeyS') keys.s=false; if(e.code==='KeyA') keys.a=false; if(e.code==='KeyD') keys.d=false; });

// Mouse Raycaster (Per mirare esattamente dove punti col mouse in 3D)
const raycaster = new THREE.Raycaster();
const mousePlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0); // Piano matematico a Y=0

window.addEventListener('mousemove', e => {
    mouseInput.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouseInput.y = -(e.clientY / window.innerHeight) * 2 + 1;
    mouseInput.active = true;
    input.usingGamepad = false;
});
window.addEventListener('mousedown', () => mouseInput.isDown = true);
window.addEventListener('mouseup', () => mouseInput.isDown = false);

/* --- TOUCH CONTROLS (Mobile) --- */
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
const stickLeftZone = document.getElementById('stick-left-zone');
const stickRightZone = document.getElementById('stick-right-zone');
const stickLeft = document.getElementById('stick-left');
const stickRight = document.getElementById('stick-right');

if (isMobile) {
    stickLeftZone.style.display = 'block';
    stickRightZone.style.display = 'block';
}

const touchInput = {
    active: false,
    left: { active: false, x: 0, y: 0, identifier: null, startX: 0, startY: 0 },
    right: { active: false, x: 0, y: 0, identifier: null, startX: 0, startY: 0 }
};

function handleTouch(e, type) {
    e.preventDefault();
    touchInput.active = true;
    const touches = e.changedTouches;

    for (let i = 0; i < touches.length; i++) {
        const t = touches[i];
        
        // Logica semplificata joystick
        if (type === 'start') {
            if (t.clientX < window.innerWidth / 2) {
                touchInput.left.active = true; touchInput.left.identifier = t.identifier; touchInput.left.startX = t.clientX; touchInput.left.startY = t.clientY;
            } else {
                touchInput.right.active = true; touchInput.right.identifier = t.identifier; touchInput.right.startX = t.clientX; touchInput.right.startY = t.clientY;
            }
        } else if (type === 'move') {
            if (t.identifier === touchInput.left.identifier) {
                const dx = t.clientX - touchInput.left.startX;
                const dy = t.clientY - touchInput.left.startY;
                const angle = Math.atan2(dy, dx);
                const dist = Math.min(Math.hypot(dx, dy), 40);
                touchInput.left.x = (Math.cos(angle) * dist) / 40;
                touchInput.left.y = (Math.sin(angle) * dist) / 40;
                stickLeft.style.transform = `translate(-50%, -50%) translate(${touchInput.left.x * 40}px, ${touchInput.left.y * 40}px)`;
            } else if (t.identifier === touchInput.right.identifier) {
                const dx = t.clientX - touchInput.right.startX;
                const dy = t.clientY - touchInput.right.startY;
                const angle = Math.atan2(dy, dx);
                const dist = Math.min(Math.hypot(dx, dy), 40);
                touchInput.right.x = (Math.cos(angle) * dist) / 40;
                touchInput.right.y = (Math.sin(angle) * dist) / 40;
                stickRight.style.transform = `translate(-50%, -50%) translate(${touchInput.right.x * 40}px, ${touchInput.right.y * 40}px)`;
            }
        } else if (type === 'end') {
            if (t.identifier === touchInput.left.identifier) { touchInput.left.active = false; touchInput.left.x = 0; touchInput.left.y = 0; stickLeft.style.transform = `translate(-50%, -50%)`; }
            if (t.identifier === touchInput.right.identifier) { touchInput.right.active = false; touchInput.right.x = 0; touchInput.right.y = 0; stickRight.style.transform = `translate(-50%, -50%)`; }
        }
    }
}
window.addEventListener('touchstart', e => handleTouch(e, 'start'), {passive: false});
window.addEventListener('touchmove', e => handleTouch(e, 'move'), {passive: false});
window.addEventListener('touchend', e => handleTouch(e, 'end'), {passive: false});

/* --- GAME LOGIC --- */

// Helpers
function createCube(color, x, z, size) {
    const geo = new THREE.BoxGeometry(size, size, size);
    const mat = new THREE.MeshStandardMaterial({ color: color, emissive: color, emissiveIntensity: 0.5 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, size/2, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    return mesh;
}

class Player {
    constructor() {
        this.mesh = createCube(0x00ffff, 0, 0, 1.5);
        this.speed = 0.4;
        
        // Canna del fucile (visiva)
        const gunGeo = new THREE.BoxGeometry(0.4, 0.4, 1.5);
        const gunMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
        this.gun = new THREE.Mesh(gunGeo, gunMat);
        this.gun.position.set(0.5, 0, 0.8);
        this.mesh.add(this.gun); // Attacca la pistola al giocatore
    }

    update() {
        // Movimento
        if (input.moveX !== 0 || input.moveY !== 0) {
            this.mesh.position.x += input.moveX * this.speed;
            this.mesh.position.z += input.moveY * this.speed;

            // Limiti mappa (-50 a 50)
            this.mesh.position.x = Math.max(-48, Math.min(48, this.mesh.position.x));
            this.mesh.position.z = Math.max(-48, Math.min(48, this.mesh.position.z));
        }

        // Camera Follow (Smooth)
        camera.position.x += (this.mesh.position.x - camera.position.x) * 0.1;
        camera.position.z += (this.mesh.position.z + 20 - camera.position.z) * 0.1;

        // Rotazione (Aiming)
        let angle = 0;
        
        // Se si usa il mouse, calcoliamo l'intersezione col piano 3D
        if (!input.usingGamepad && !touchInput.active && mouseInput.active) {
            raycaster.setFromCamera(new THREE.Vector2(mouseInput.x, mouseInput.y), camera);
            const intersect = new THREE.Vector3();
            raycaster.ray.intersectPlane(mousePlane, intersect);
            angle = Math.atan2(intersect.z - this.mesh.position.z, intersect.x - this.mesh.position.x);
        } else {
            // Se si usa pad o touch
            if (Math.abs(input.aimX) > 0.1 || Math.abs(input.aimY) > 0.1) {
                angle = Math.atan2(input.aimY, input.aimX);
            }
        }
        
        // Applica rotazione (In Three.js l'asse Y è quello verticale per girarsi)
        this.mesh.rotation.y = -angle + Math.PI / 2; // Correzione di 90 gradi per mesh cubo
    }
}

class Projectile {
    constructor(x, z, angle) {
        this.mesh = new THREE.Mesh(
            new THREE.SphereGeometry(0.3, 8, 8),
            new THREE.MeshBasicMaterial({ color: 0xffff00 })
        );
        this.mesh.position.set(x, 1, z);
        scene.add(this.mesh);
        
        const speed = 0.8;
        this.velocity = {
            x: Math.cos(angle) * speed,
            z: Math.sin(angle) * speed
        };
        this.alive = true;
    }

    update() {
        this.mesh.position.x += this.velocity.x;
        this.mesh.position.z += this.velocity.z;

        // Fuori dai bordi
        if (Math.abs(this.mesh.position.x) > 50 || Math.abs(this.mesh.position.z) > 50) {
            this.alive = false;
        }
    }

    remove() {
        scene.remove(this.mesh);
        this.mesh.geometry.dispose();
        this.mesh.material.dispose();
    }
}

class Enemy {
    constructor(multiplier) {
        // Spawn random sui bordi
        let x, z;
        if (Math.random() < 0.5) {
            x = Math.random() < 0.5 ? -48 : 48;
            z = (Math.random() - 0.5) * 96;
        } else {
            x = (Math.random() - 0.5) * 96;
            z = Math.random() < 0.5 ? -48 : 48;
        }

        const colorHue = Math.random() * 0.2 + 0.3; // Verde/Giallo zombie
        const color = new THREE.Color().setHSL(colorHue, 1, 0.5);
        
        this.mesh = createCube(color, x, z, 1.5);
        this.speed = (0.05 + Math.random() * 0.05) * multiplier;
        this.alive = true;
    }

    update(playerPos) {
        const angle = Math.atan2(playerPos.z - this.mesh.position.z, playerPos.x - this.mesh.position.x);
        this.mesh.position.x += Math.cos(angle) * this.speed;
        this.mesh.position.z += Math.sin(angle) * this.speed;
        
        this.mesh.rotation.y = -angle;

        // Animazione "saltino" o "respiro"
        this.mesh.scale.y = 1 + Math.sin(Date.now() * 0.01) * 0.1;
    }

    remove() {
        scene.remove(this.mesh);
        this.mesh.geometry.dispose();
        this.mesh.material.dispose();
    }
}

class Particle {
    constructor(x, z, color) {
        this.mesh = new THREE.Mesh(
            new THREE.BoxGeometry(0.3, 0.3, 0.3),
            new THREE.MeshBasicMaterial({ color: color })
        );
        this.mesh.position.set(x, 1, z);
        scene.add(this.mesh);
        
        this.velX = (Math.random() - 0.5) * 0.5;
        this.velZ = (Math.random() - 0.5) * 0.5;
        this.velY = Math.random() * 0.5; // Salta in aria
        this.life = 1.0;
    }

    update() {
        this.mesh.position.x += this.velX;
        this.mesh.position.z += this.velZ;
        this.mesh.position.y += this.velY;
        this.velY -= 0.05; // Gravità
        
        if (this.mesh.position.y < 0) this.mesh.position.y = 0; // Rimbalzo su pavimento

        this.life -= 0.05;
        this.mesh.scale.setScalar(this.life);
    }

    remove() {
        scene.remove(this.mesh);
        this.mesh.geometry.dispose();
        this.mesh.material.dispose();
    }
}

/* --- GAME STATE --- */
let player;
let projectiles = [];
let enemies = [];
let particles = [];
let gameActive = false;
let score = 0;
let round = 1;
let spawnInterval;
let lastShotTime = 0;

function initGame() {
    // Pulisci scena vecchia
    projectiles.forEach(p => p.remove());
    enemies.forEach(e => e.remove());
    particles.forEach(p => p.remove());
    if (player) scene.remove(player.mesh);

    player = new Player();
    projectiles = [];
    enemies = [];
    particles = [];
    score = 0;
    round = 1;
    
    document.getElementById('scoreEl').innerText = `Punti: ${score}`;
    document.getElementById('roundEl').innerText = `Round: ${round}`;
    document.getElementById('modal').style.display = 'none';
    
    gameActive = true;
    startRound();
}

function startRound() {
    let toSpawn = round * 5 + 5;
    const speedMult = 1 + (round * 0.1);
    
    clearInterval(spawnInterval);
    spawnInterval = setInterval(() => {
        if (!gameActive) return;
        if (toSpawn > 0) {
            enemies.push(new Enemy(speedMult));
            toSpawn--;
        } else {
            clearInterval(spawnInterval);
        }
    }, Math.max(500, 1500 - round * 100));
}

function gameOver() {
    gameActive = false;
    document.getElementById('modal').style.display = 'block';
    document.getElementById('modal-score').innerText = `Round: ${round} | Score: ${score}`;
    clearInterval(spawnInterval);
}

/* --- MAIN LOOP --- */
function animate() {
    requestAnimationFrame(animate);

    if (gameActive) {
        // 1. INPUT UPDATE
        input.moveX = 0; input.moveY = 0; input.isFiring = false;

        const pad = navigator.getGamepads ? navigator.getGamepads()[0] : null;
        if (pad) {
            input.usingGamepad = true;
            if (Math.abs(pad.axes[0]) > 0.1) input.moveX = pad.axes[0];
            if (Math.abs(pad.axes[1]) > 0.1) input.moveY = pad.axes[1];
            if (Math.abs(pad.axes[2]) > 0.1 || Math.abs(pad.axes[3]) > 0.1) {
                input.aimX = pad.axes[2];
                input.aimY = pad.axes[3];
                if (pad.buttons[7].pressed || pad.buttons[0].pressed) input.isFiring = true;
            }
        }
        
        if (keys.w || keys.s || keys.a || keys.d) {
            input.usingGamepad = false;
            if (keys.w) input.moveY = -1;
            if (keys.s) input.moveY = 1;
            if (keys.a) input.moveX = -1;
            if (keys.d) input.moveX = 1;
            // Normalizza per non correre veloce in diagonale
            const len = Math.hypot(input.moveX, input.moveY);
            if (len > 0) { input.moveX /= len; input.moveY /= len; }
        }

        if (touchInput.active) {
            input.usingGamepad = false;
            if (touchInput.left.active) { input.moveX = touchInput.left.x; input.moveY = touchInput.left.y; }
            if (touchInput.right.active) { 
                input.aimX = touchInput.right.x; input.aimY = touchInput.right.y; 
                if (Math.hypot(input.aimX, input.aimY) > 0.5) input.isFiring = true;
            }
        } else if (!input.usingGamepad && mouseInput.isDown) {
            input.isFiring = true;
        }

        // 2. SHOOTING
        const now = Date.now();
        if (input.isFiring && now - lastShotTime > 150) {
            // Calcola angolo mira attuale
            let fireAngle = player.mesh.rotation.y + Math.PI/2; // Correggi offset rotazione mesh
             // Se mira col mouse, ricalcola preciso
             if (!input.usingGamepad && !touchInput.active && mouseInput.active) {
                 raycaster.setFromCamera(new THREE.Vector2(mouseInput.x, mouseInput.y), camera);
                 const intersect = new THREE.Vector3();
                 raycaster.ray.intersectPlane(mousePlane, intersect);
                 fireAngle = Math.atan2(intersect.z - player.mesh.position.z, intersect.x - player.mesh.position.x);
             } else if (Math.abs(input.aimX) > 0 || Math.abs(input.aimY) > 0) {
                 fireAngle = Math.atan2(input.aimY, input.aimX);
             }

            projectiles.push(new Projectile(player.mesh.position.x, player.mesh.position.z, fireAngle));
            lastShotTime = now;
        }

        // 3. UPDATES
        player.update();

        // Proiettili
        for (let i = projectiles.length - 1; i >= 0; i--) {
            const p = projectiles[i];
            p.update();
            if (!p.alive) { p.remove(); projectiles.splice(i, 1); }
        }

        // Nemici
        let enemiesAlive = 0;
        for (let i = enemies.length - 1; i >= 0; i--) {
            const e = enemies[i];
            e.update(player.mesh.position);
            enemiesAlive++;

            // Collisione Player
            const distP = Math.hypot(player.mesh.position.x - e.mesh.position.x, player.mesh.position.z - e.mesh.position.z);
            if (distP < 2) gameOver(); // Raggio 1.5 + 0.5 margine

            // Collisione Bullet
            for (let j = projectiles.length - 1; j >= 0; j--) {
                const p = projectiles[j];
                const distB = Math.hypot(p.mesh.position.x - e.mesh.position.x, p.mesh.position.z - e.mesh.position.z);
                if (distB < 1.8) { // Hitbox
                    // Particle explosion
                    for(let k=0; k<5; k++) particles.push(new Particle(e.mesh.position.x, e.mesh.position.z, e.mesh.material.color));
                    
                    e.remove(); enemies.splice(i, 1);
                    p.remove(); projectiles.splice(j, 1);
                    
                    score += 100;
                    document.getElementById('scoreEl').innerText = `Punti: ${score}`;
                    enemiesAlive--;
                    break;
                }
            }
        }

        // Round Logic
        if (enemiesAlive === 0 && enemies.length === 0) {
             // Hack rapido per check fine spawn
             // (in una versione completa useremmo un contatore spawn separato meglio, ma qui l'intervallo fa il lavoro)
             // Se non ci sono nemici vivi, attendiamo il prossimo spawn, se l'intervallo è finito...
             // Qui controlliamo solo se sono tutti morti.
        }
        
        // Un semplice check: se l'array nemici è vuoto e il round deve avanzare (logica semplificata)
        // Per ora usiamo il metodo di prima: spawnInterval si ferma da solo.
        // Se l'intervallo è fermo E zero nemici:
        // (Nota: per semplicità in questa demo 3D, se uccidi tutto e non spawna niente per 2 sec, nuovo round)
        if (enemies.length === 0 && !spawnInterval._destroyed) { 
             // Logic handled inside interval usually, but here:
        }

        // Particles
        for (let i = particles.length - 1; i >= 0; i--) {
            const pt = particles[i];
            pt.update();
            if (pt.life <= 0) { pt.remove(); particles.splice(i, 1); }
        }
    }

    renderer.render(scene, camera);
}

// Round check loop separato
setInterval(() => {
    if (gameActive && enemies.length === 0) {
        // Se non sta spawnando nulla da un po'... (Hack logico per brevità)
        // Reset round
        round++;
        document.getElementById('roundEl').innerText = `Round: ${round}`;
        document.getElementById('roundEl').style.color = 'yellow';
        setTimeout(()=>document.getElementById('roundEl').style.color='white', 1000);
        startRound();
    }
}, 3000);

document.getElementById('startBtn').addEventListener('click', initGame);
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();