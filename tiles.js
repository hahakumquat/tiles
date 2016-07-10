var scene, camera, renderer, light;

// tile location information
var WIDTH = window.innerWidth * .9;
var HEIGHT = WIDTH / 2;
var tileArray = [];
var NUMSQUARES = 30;
var DIMENSION = WIDTH / NUMSQUARES;
var rows = Math.ceil(NUMSQUARES * HEIGHT / WIDTH);
var cols = NUMSQUARES;
var start = Date.now();

// Mouse location
var mouse = {};
var raycaster = new THREE.Raycaster();

// gradients
var fire = ["black", "#250101", "#370000", "#aa4400", "white", "orange", "white", "#eeee33", "white"];
var water = ["black", "#003377", "#00ffff", "white"];
var grass = ["black", "#007733", "#11ff33", "white"];
var soft = ["black", "#662233","magenta", "pink", "white"];
var grads = [fire, water, grass, soft];

// animation related things
var ctr = Math.floor(Math.random() * grads.length);
var ctx, tex;
var levels = 5;
var queue = [];

init();

function init() {
    
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(30, WIDTH/HEIGHT, 1, 1 + DIMENSION + WIDTH);
    camera.position.z = WIDTH;
    scene.add(camera);
    
    tex = genTexture(grads[ctr]);
    
    for (var k = 0; k < rows; k++) {
        for (var j = 0; j < cols; j++) {
            var geom = new THREE.PlaneGeometry(DIMENSION - 2, DIMENSION - 2);
            mat = new THREE.ShaderMaterial({
                uniforms: {
                    texture: { type: "t", value: tex },
                    rotation: { type: "f", value: 0. },
                },
                vertexShader: document.getElementById("vertexshader").textContent,
                fragmentShader: document.getElementById("fragmentshader").textContent,
                side: THREE.DoubleSide
            });
            
            var square = new THREE.Mesh(geom, mat);
            square.position.setX((-cols / 2 + j) * DIMENSION);
            square.position.setY((rows / 2 - k) * DIMENSION);
            square.row = k;
            square.col = j;
            square.ripple = -1;
            square.adjacents = getAdjacents(k, j);
            scene.add(square);
            tileArray.push(square);
        }
    }

    renderer = new THREE.WebGLRenderer();
    renderer.setSize(WIDTH, HEIGHT);
    document.body.appendChild(renderer.domElement);

    document.addEventListener("mousemove", disturb, false);
    document.addEventListener("click", function(e) {
        setGradient(ctx, grads[ ++ctr % grads.length]);
        tex.needsUpdate = true;
        disturb(e);
    }, false);
    animate();
}

function genTexture(colors) {
    var canvas = document.createElement("canvas");
    canvas.height = 256;
    canvas.width = 256;
    ctx = canvas.getContext("2d");
    
    setGradient(ctx, colors); 

    var tex = new THREE.Texture(canvas);
    tex.needsUpdate = true;
    return tex;
}

function getAdjacents(row, col) {
    var arr = []; 
    if (row > 0) {
        if (col > 0)
            arr.push([row - 1, col - 1]);
        if (col < cols - 1)
            arr.push([row - 1, col + 1]);
        arr.push([row - 1, col]);
    }
    if (row < rows - 1) {
        if (col > 0) 
            arr.push([row + 1, col - 1]);
        if (col < cols - 1)
            arr.push([row + 1, col + 1]);
        arr.push([row + 1, col]);
    }
    if (col > 0) {
        arr.push([row, col - 1]);
    }
    if (col < cols - 1) {
        arr.push([row, col + 1]);
    }
    return arr;
}

function disturb(e) {
    mouse.x = e.clientX / WIDTH * 2 - 1;
    mouse.y = e.clientY / HEIGHT * -2 + 1;

    raycaster.setFromCamera(mouse, camera);

    var intersects = raycaster.intersectObjects(tileArray);
    if (intersects.length > 0) {
        var mesh = intersects[0].object;
        
        mesh.rotation.x = Math.PI;

        // propagate([mesh], levels);
        flare(mesh);
    }
}

function flare(mesh) {
    mesh.adjacents.forEach(function(ind) {
        var adjMesh = tileArray[ind[0] * cols + ind[1]];
        adjMesh.adjacents.forEach(function(iind) {
            var aadjMesh = tileArray[iind[0] * cols + iind[1]];
            aadjMesh.rotation.x += 0.1;
        });
        adjMesh.rotation.x += 0.3;
    });
}

// function propagate(queue, dist) {
    
//     while (dist > 0) {
//         for (var k = 0, c = queue.length; k < c; k++) {
//             var mesh = queue.shift();
//             mesh.ripple = Math.min(mesh.ripple, dist);
//             mesh.adjacents.forEach(function(ind) {
//                 var adjMesh = tileArray[ind[0] * cols + ind[1]];
//                 queue.push(adjMesh);
//             });
//         }
//         dist--;
//     }
// }

function setGradient(ctx, colors) {
    var grad = ctx.createLinearGradient(0, 256, 0, 0);
    for (var k = 0, stops = colors.length - 1; k < stops; k++) {
        grad.addColorStop(k / stops, colors[k]);
    }
    grad.addColorStop(1., colors[colors.length - 1]);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);
    return grad;
}

function animate() {
    
    requestAnimationFrame(animate);
    tileArray.forEach(function(t) {
        // if (t.ripple == 0) {
        //     t.rotation.x = Math.PI;
        // }
        // if (t.ripple >= 0) {
        //     t.ripple--;
        // }
        if (t.rotation.x > 0.1) {
            t.rotation.x /= 1.1;
        }
        else {
            t.rotation.x = 0;
        }
        t.material.uniforms.rotation.value = t.rotation.x;
    });
    
    renderer.render(scene, camera);
}
