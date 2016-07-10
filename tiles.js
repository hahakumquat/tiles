window.setTimeout(function() {
    fade(document.getElementById("title"));
    fade(document.getElementById("info"));
}, 5000);

var scene, camera, renderer, light;

// tile location information
document.getElementById("container").setAttribute("style","width:90%");
document.getElementById("container").setAttribute("style","height:90%");
var WIDTH = document.getElementById("container").offsetWidth;
var HEIGHT = window.innerHeight;
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
var red = ["black", "#771122", "red", "#ffeeee", "white", "#ff7777", "white"];
var orange = ["black", "#250101", "#370000", "#aa4400", "white", "orange", "white", "#eeee33", "white"];
var yellow = ["black", "#775511", "#ffff44", "white", "yellow", "white"];
var green = ["black", "#007733", "white", "#11ff33", "white"];
var blue = ["black", "#003377", "white", "#00ffff", "white"];
var pink = ["black", "#662233","magenta", "white", "pink", "pink", "white"];
var grads = [red, orange, yellow, green, blue, pink];

// animation related things
var ctr = Math.floor(Math.random() * grads.length);
var ctx, tex;
var levels = 30;
var queue = [];
var timer = 0;
var shape = true;

init();

function init() {
    
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(30, WIDTH/HEIGHT, 1, WIDTH * 2);
    camera.position.z = WIDTH;
    scene.add(camera);
    
    tex = genTexture(grads[ctr]);

    var geom = new THREE.BoxGeometry(DIMENSION - 4, DIMENSION - 4);
    genMeshes(geom);

    renderer = new THREE.WebGLRenderer();
    renderer.setSize(WIDTH, HEIGHT);
    document.getElementById("container").appendChild(renderer.domElement);

    document.addEventListener("mousemove", disturb, false);

    document.body.onkeyup = function(e) {
        if (e.keyCode == 32) {
            var geom;
            if (shape)
                geom = new THREE.SphereGeometry(DIMENSION/1.5, 15);
            else
                geom = new THREE.BoxGeometry(DIMENSION - 4, DIMENSION - 4);
            genMeshes(geom);
            shape = !shape;
        }
    }
    
    document.addEventListener("click", function(e) {
        setGradient(ctx, grads[ ++ctr % grads.length]);
        tex.needsUpdate = true;
        disturb(e, true);
    }, false);
    
    animate();
}

function genMeshes(geom) {

    tileArray.forEach(function(t) {
        scene.remove(t);
    });
    tileArray = [];
    
    for (var k = 0; k < rows; k++) {
        for (var j = 0; j < cols; j++) {
            
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
            square.position.setX((j - (cols - 1)/ 2) * DIMENSION);
            square.position.setY(Math.floor(rows / 2 - k) * DIMENSION);
            square.row = k;
            square.col = j;
            square.ripple = -1;
            square.adjacents = getAdjacents(k, j);
            scene.add(square);
            tileArray.push(square);
        }
    }
}

function fade(element) {
    var op = 1;  // initial opacity
    var timer = setInterval(function () {
        if (op <= 0.1){
            clearInterval(timer);
            element.style.display = 'none';
        }
        element.style.opacity = op;
        element.style.filter = 'alpha(opacity=' + op * 100 + ")";
        op -= op * 0.1;
    }, 50);
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

    // splitting up coniditons like this allows easy access for pretty patterns
    if (row > 0) {
        if (col > 0)
            arr.push([row - 1, col - 1]);
        if (col < cols - 1)
            arr.push([row - 1, col + 1]);

    }
    if (row < rows - 1) {
        if (col > 0) 
            arr.push([row + 1, col - 1]);
        if (col < cols - 1)
            arr.push([row + 1, col + 1]);
    }
    
    if (row > 0)
        arr.push([row - 1, col]);
    if (row < rows - 1)
        arr.push([row + 1, col]);
    if (col > 0)
        arr.push([row, col - 1]);
    if (col < cols - 1)
        arr.push([row, col + 1]);
    
    return arr;
}

function disturb(e, click) {
    mouse.x = e.clientX / WIDTH * 2 - 1;
    mouse.y = e.clientY / HEIGHT * -2 + 1;

    raycaster.setFromCamera(mouse, camera);

    var intersects = raycaster.intersectObjects(tileArray);
    if (intersects.length > 0) {
        var mesh = intersects[0].object;
        if (click)
            propagate([mesh], levels);
        else
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
        adjMesh.rotation.x += 0.2;
    });
}

function propagate(queue, dist) {

    var flag = Math.floor(Math.random() * 3);
    
    while (dist > 0) {
        for (var k = 0, c = queue.length; k < c; k++) {
            var mesh = queue.shift();
            if (mesh.ripple < 0) {
                mesh.ripple = (levels - dist) * 2;
                mesh.adjacents.forEach(function(ind) {
                    var adjMesh = tileArray[ind[0] * cols + ind[1]];
                    switch(flag) {
                        // Diamond effect
                    case 0:
                        if (ind[0] === mesh.row || ind[1] === mesh.col) {
                            queue.push(adjMesh);
                        }
                        break;
                        // Checkerboard effect
                    case 1:
                        if (ind[0] !== mesh.row && ind[1] !== mesh.col) {
                            queue.push(adjMesh);
                        }
                        break;
                        // tendril effect
                    case 2:
                        var factor = Math.floor(Math.random() * NUMSQUARES);
                        var mod = Math.floor(Math.random() * factor);
                        if (ind[0] % factor == mod || ind[1] % factor == mod) {
                            queue.push(adjMesh);
                        }
                        break;
                        // block effect
                    default:
                        queue.push(adjMesh);
                        break;
                    }
                });
            }
        }
        dist--;
    }
}

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
        if (t.scale.z > 1)
            t.scale.z /= 1.1;
        else t.position.z = 0;
        if (t.rotation.x > 0.05) 
            t.rotation.x /= 1.1;
        else
            t.rotation.x = 0;
        
        if (t.ripple == 0) 
            t.rotation.x = Math.PI;
        if (t.ripple >= 0) 
            t.ripple--;
        
        t.material.uniforms.rotation.value = t.rotation.x;
        t.position.z = Math.min(camera.position.z / 3, t.rotation.x / Math.PI * WIDTH / 8);
    });

    if (timer > 300) {
        timer = 0;
        propagate([tileArray[Math.floor(Math.random() * tileArray.length)]], levels);
        propagate([tileArray[Math.floor(Math.random() * tileArray.length)]], levels);
        propagate([tileArray[Math.floor(Math.random() * tileArray.length)]], levels);
        propagate([tileArray[Math.floor(Math.random() * tileArray.length)]], levels);
    }
    timer++;
    renderer.render(scene, camera);
}
