// Based on ColoredPoint.js (c) 2012 matsuda

// Vertex shader program
let VSHADER_SOURCE = `
  attribute vec4 a_Position;
  attribute vec4 a_Normal;
  attribute vec2 a_TexCoord;

  varying vec3 v_Position;
  varying vec3 v_Normal;
  varying vec2 v_TexCoord;
  varying vec4 v_VertPos;

  uniform mat4 u_ModelMatrix;
  uniform mat4 u_ViewMatrix;
  uniform mat4 u_ProjectionMatrix;
  uniform mat4 u_NormalMatrix;

  void main() {
    gl_Position = u_ProjectionMatrix * u_ViewMatrix * u_ModelMatrix * a_Position;
    v_Position = vec3(u_ModelMatrix * a_Position);
    v_Normal = normalize(vec3(u_NormalMatrix * a_Normal));
    v_TexCoord = a_TexCoord;
    v_VertPos = u_ModelMatrix * a_Position;
  }`

// Fragment shader program
let FSHADER_SOURCE = `
  precision mediump float;

  varying vec3 v_Position;
  varying vec3 v_Normal;
  varying vec2 v_TexCoord;
  varying vec4 v_VertPos;

  uniform vec4 u_BaseColor;
  uniform sampler2D u_Sampler0;
  uniform float u_TexColorWeight;
  uniform int u_ViewType;
  uniform vec3 u_LightPos;
  uniform vec3 u_CameraPos;

  float getFakeLight() {
    return clamp(dot(normalize(vec3(8.0, 10.0, -13.0) - v_Position), normalize(v_Normal)), 0.0, 1.0);
  }

  void main() {
    if (u_ViewType == 0) {
      gl_FragColor = (1.0 - u_TexColorWeight) * u_BaseColor + u_TexColorWeight * texture2D(u_Sampler0, v_TexCoord);
      vec3 lightVector = u_LightPos-vec3(v_VertPos);
      float r=length(lightVector);
      vec3 L = normalize(lightVector);
      vec3 N = normalize(v_Normal);
      float nDotL = max(dot(N,L), 0.0);
      vec3 R = reflect(-L,N);
      vec3 E = normalize(u_CameraPos-vec3(v_VertPos));
      float specular = pow(max(dot(E,R), 0.0), 10.0);
      vec3 diffuse = vec3(gl_FragColor) * nDotL * 0.7;
      vec3 ambient = vec3(gl_FragColor) * 0.3;
      gl_FragColor = vec4(specular+diffuse+ambient, 1.0);
    } else if (u_ViewType == 1) {
      gl_FragColor = (1.0 - u_TexColorWeight) * u_BaseColor + u_TexColorWeight * texture2D(u_Sampler0, v_TexCoord);
    } else if (u_ViewType == 2) {
      gl_FragColor = vec4((v_Normal+1.0)/2.0, 1.0);
    } 
  }`

let gl;
let g_canvas;
let g_shaderVars = {};

let g_shapes = [];
let g_breakables = [];
let g_globalAngleX = 0;
let g_globalAngleY = 0;
let g_lastPos = [0, 0];

let g_wingParts = [];

let g_wingAngles = [0, 0, 0];

let g_animationToggle = true;
let g_startTime = performance.now() / 1000.0;
let g_seconds = performance.now() / 1000.0 - g_startTime;

let g_fpsElement;
let g_fpsQueue = [];

let g_camera;
let g_lightPos = [0, 1, -2];
let g_light;

function main() {
  let [canvas, new_gl] = setupWebGL();
  if (!new_gl) return;
  gl = new_gl;
  gl.enable(gl.DEPTH_TEST);

  g_canvas = canvas;
  g_camera = new Camera(g_canvas);

  if (connectVariablesToGLSL() == false) return;

  createMoogle();
  createWorld();


  setupUI();

  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.uniform1i(g_shaderVars.u_ViewType, 0);

  //renderAllShapes();
  requestAnimationFrame(tick);
}

function setupWebGL() {
  // Retrieve <canvas> element
  let canvas = document.getElementById("webgl");

  // Get the rendering context for WebGL
  let gl = canvas.getContext("webgl", { preserveDrawingBuffer: true });
  if (!gl) console.log("Failed to get the rendering context for WebGL");
  else {
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  }

  return [canvas, gl];
}

function connectVariablesToGLSL() {
  // Initialize shaders
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log("Failed to intialize shaders.");
    return false;
  }

  let a_Position = gl.getAttribLocation(gl.program, "a_Position");
  if (a_Position < 0) {
    console.log("Failed to get the storage location of a_Position");
    return false;
  }
  g_shaderVars.a_Position = a_Position;

  let u_ModelMatrix = gl.getUniformLocation(gl.program, "u_ModelMatrix");
  if (!u_ModelMatrix) {
    console.log("Failed to get the storage location of u_ModelMatrix");
    return false;
  }
  g_shaderVars.u_ModelMatrix = u_ModelMatrix;

  let u_ViewMatrix = gl.getUniformLocation(gl.program, "u_ViewMatrix");
  if (!u_ViewMatrix) {
    console.log("Failed to get the storage location of u_ViewMatrix");
    return false;
  }
  g_shaderVars.u_ViewMatrix = u_ViewMatrix;

  let u_ProjectionMatrix = gl.getUniformLocation(gl.program, "u_ProjectionMatrix");
  if (!u_ProjectionMatrix) {
    console.log("Failed to get the storage location of u_ProjectionMatrix");
    return false;
  }
  g_shaderVars.u_ProjectionMatrix = u_ProjectionMatrix;

  var a_TexCoord = gl.getAttribLocation(gl.program, 'a_TexCoord');
  if (a_TexCoord < 0) {
    console.log('Failed to get the storage location of a_TexCoord');
    return false;
  }
  g_shaderVars.a_TexCoord = a_TexCoord;

  let u_BaseColor = gl.getUniformLocation(gl.program, "u_BaseColor");
  if (!u_BaseColor) {
    console.log("Failed to get the storage location of u_BaseColor");
    return false;
  }
  g_shaderVars.u_BaseColor = u_BaseColor;

  let u_Sampler0 = gl.getUniformLocation(gl.program, 'u_Sampler0');
  if (!u_Sampler0) {
    console.log('Failed to get the storage location of u_Sampler0');
    return false;
  }
  g_shaderVars.u_Sampler0 = u_Sampler0;

  let u_TexColorWeight = gl.getUniformLocation(gl.program, 'u_TexColorWeight');
  if (!u_TexColorWeight) {
    console.log('Failed to get the storage location of u_TexColorWeight');
    return false;
  }
  g_shaderVars.u_TexColorWeight = u_TexColorWeight;

  let u_ViewType = gl.getUniformLocation(gl.program, 'u_ViewType'); console.log(u_ViewType);
  if (!u_ViewType) {
    console.log('Failed to get the storage location of u_ViewType');
    return false;
  }
  g_shaderVars.u_ViewType = u_ViewType;

  let u_NormalMatrix = gl.getUniformLocation(gl.program, 'u_NormalMatrix');
  if (!u_NormalMatrix) {
    console.log('Failed to get the storage location of u_NormalMatrix');
    return false;
  }
  g_shaderVars.u_NormalMatrix = u_NormalMatrix;

  let a_Normal = gl.getAttribLocation(gl.program, 'a_Normal');
  if (!a_Normal) {
    console.log('Failed to get the storage location of a_Normal');
    return false;
  }
  g_shaderVars.a_Normal = a_Normal

  let u_LightPos = gl.getUniformLocation(gl.program, 'u_LightPos');
  if (!u_LightPos) {
    console.log('Failed to get the storage location of u_LightPos');
    return false;
  }
  g_shaderVars.u_LightPos = u_LightPos;

  let u_CameraPos = gl.getUniformLocation(gl.program, 'u_CameraPos');
  if (!u_CameraPos) {
    console.log('Failed to get the storage location of u_CameraPos');
    return false;
  }
  g_shaderVars.u_CameraPos = u_CameraPos;

  return true;
}

function setupUI() {
  g_canvas.onmousemove = function (e) {
    if (document.pointerLockElement === g_canvas) {
      g_camera.panHorizontal(-e.movementX);
      g_camera.panVertical(-e.movementY);
    }
  }

  g_canvas.onmousedown = function (e) {
    if (document.pointerLockElement) {
      changeBlock(g_camera.at.elements[0], g_camera.at.elements[1], g_camera.at.elements[2]);
    } else {
      g_canvas.requestPointerLock();
    }
  }

  g_fpsElement = document.getElementById("fps");

  const shadedButton = document.getElementById("shaded");
  shadedButton.addEventListener('click', () => {
    gl.uniform1i(g_shaderVars.u_ViewType, 0);
  });

  const unshadedButton = document.getElementById("unshaded");
  unshadedButton.addEventListener('click', () => {
    gl.uniform1i(g_shaderVars.u_ViewType, 1);
  });

  const normalButton = document.getElementById("normal");
  normalButton.addEventListener('click', () => {
    gl.uniform1i(g_shaderVars.u_ViewType, 2);
  });

  const lightPosSlider = document.getElementById("lightPos");
  lightPosSlider.addEventListener("mousemove", function (e) {
    if (e.buttons == 1) {
      g_lightPos[0] = this.value;
    }
  })

  document.onkeydown = function (e) {
    switch (e.code) {
      case "KeyW":
        g_camera.moveForward();
        break;
      case "KeyA":
        g_camera.moveLeft();
        break;
      case "KeyS":
        g_camera.moveBackwards();
        break;
      case "KeyD":
        g_camera.moveRight();
        break;
      case "KeyQ":
        g_camera.panHorizontal();
        break;
      case "KeyE":
        g_camera.panHorizontal(-1);
        break;
      case "Escape":
        if (document.pointerLockElement === g_canvas) {
          document.exitPointerLock();
        }
        break;
    }

  }
}

// inspired by code by Ronan Wong
function coordsEventtoGL(e) {
  let x = e.clientX;
  let y = e.clientY;
  let rect = e.target.getBoundingClientRect();

  x = ((x - rect.left) - g_canvas.width / 2) / (g_canvas.width / 2);
  y = (g_canvas.height / 2 - (y - rect.top)) / (g_canvas.height / 2);
  return [x, y];
}

function color255to1(color) {
  return [color[0] / 255.0, color[1] / 255.0, color[2] / 255.0, color[3] / 255.0];
}

function initTextures(n) {
  var texture = gl.createTexture();   // Create a texture object
  if (!texture) {
    console.log('Failed to create the texture object');
    return false;
  }

  var image = new Image();  // Create the image object
  if (!image) {
    console.log('Failed to create the image object');
    return false;
  }
  // Register the event handler to be called on loading an image
  image.onload = function () { loadTexture(n, texture, image); };
  // Tell the browser to load an image
  image.src = 'dirt.jpg';

  return true;
}

function loadTexture(n, texture, image) {
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1); // Flip the image's y axis
  // Enable texture unit0
  gl.activeTexture(gl.TEXTURE0);
  // Bind the texture object to the target
  gl.bindTexture(gl.TEXTURE_2D, texture);

  // Set the texture parameters
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  // Set the texture image
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);

  // Set the texture unit 0 to the sampler
  gl.uniform1i(g_shaderVars.u_Sampler0, 0);

  gl.clear(gl.COLOR_BUFFER_BIT);   // Clear <canvas>

  gl.drawArrays(gl.TRIANGLE_STRIP, 0, n); // Draw the rectangle
}

function createWorld() {
  let matrix;
  let groundHeight = -2.5
  let x_disp = -2;
  let z_disp = 0;
  let cubeGroundHeight = groundHeight + 0.5;
  let wallImagePath = "../assets/dice.png";
  let map = [
    [5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
    [0, 5, 5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5, 5, 5, 0, 0, 0, 0, 5, 5, 0, 0, 0, 5, 0, 0, 0, 0, 0, 5],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5, 5, 0, 0, 0, 5, 0, 0, 0, 0, 0, 5],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5, 0, 0, 0, 0, 0, 0, 5],
    [0, 0, 0, 0, 5, 5, 0, 0, 0, 0, 5, 5, 5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5, 0, 0, 0, 5],
    [0, 5, 5, 5, 5, 5, 5, 0, 0, 0, 5, 0, 5, 5, 5, 0, 5, 5, 5, 0, 0, 5, 0, 0, 0, 0, 0, 5, 5, 5, 5, 5],

    [5, 5, 5, 5, 5, 5, 0, 0, 0, 0, 5, 0, 0, 0, 0, 5, 5, 5, 5, 5, 5, 0, 0, 0, 0, 5, 0, 0, 0, 0, 0, 5],
    [5, 0, 0, 0, 0, 5, 0, 0, 0, 0, 5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5, 0, 0, 0, 0, 5, 0, 0, 0, 0, 0, 5],
    [5, 0, 0, 0, 0, 5, 0, 0, 0, 0, 5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5, 0, 0, 0, 0, 5, 0, 0, 0, 0, 0, 5],
    [5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5, 0, 0, 0, 0, 5, 0, 0, 0, 0, 0, 5],
    [5, 5, 5, 0, 0, 0, 0, 0, 0, 5, 0, 5, 5, 5, 0, 5, 5, 5, 5, 5, 5, 5, 0, 5, 5, 5, 0, 5, 5, 5, 0, 5],

    [5, 0, 0, 0, 0, 0, 0, 0, 0, 5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5],
    [5, 0, 0, 0, 5, 0, 0, 0, 5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5],
    [5, 0, 0, 0, 5, 5, 5, 5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5],
    [5, 0, 0, 0, 5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5],
    [5, 5, 5, 5, 5, 0, 5, 5, 5, 5, 5, 0, 5, 5, 5, 5, 5, 0, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 0, 5, 5],

    [5, 0, 0, 0, 0, 5, 0, 0, 0, 0, 5, 0, 0, 0, 0, 5, 0, 0, 0, 0, 5, 0, 0, 0, 0, 5, 5, 5, 0, 0, 0, 5],
    [5, 0, 0, 0, 0, 5, 0, 0, 0, 0, 5, 0, 0, 0, 0, 5, 0, 0, 0, 0, 5, 0, 0, 0, 0, 5, 5, 5, 0, 0, 0, 5],
    [5, 0, 0, 0, 0, 5, 0, 0, 0, 0, 5, 0, 0, 0, 0, 5, 0, 0, 0, 0, 5, 0, 0, 0, 0, 5, 5, 0, 0, 0, 0, 5],
    [5, 0, 0, 0, 0, 5, 0, 0, 0, 0, 5, 0, 0, 0, 0, 5, 0, 0, 0, 0, 5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5],
    [5, 5, 0, 5, 5, 5, 0, 5, 5, 5, 0, 5, 5, 5, 0, 5, 5, 5, 0, 5, 5, 5, 5, 5, 0, 0, 0, 0, 5, 5, 5, 5],

    [5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5, 5],
    [5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5, 0, 0, 0, 0, 0, 5],
    [5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5, 5, 0, 0, 0, 5, 5],
    [5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5, 0, 0, 0, 0, 0, 5],
    [5, 5, 5, 0, 5, 5, 5, 0, 5, 5, 5, 0, 5, 5, 5, 0, 5, 5, 0, 0, 0, 5, 5, 0, 5, 5, 5, 0, 0, 0, 5, 5],

    [5, 0, 0, 0, 0, 5, 0, 0, 0, 0, 5, 0, 0, 0, 0, 5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5, 5, 0, 0, 0, 5, 5],
    [5, 0, 0, 0, 0, 5, 0, 0, 0, 0, 5, 0, 0, 0, 0, 5, 0, 0, 0, 5, 5, 0, 0, 0, 5, 5, 0, 0, 0, 0, 0, 5],
    [5, 0, 0, 0, 0, 5, 0, 0, 0, 0, 5, 0, 0, 0, 0, 5, 0, 0, 0, 0, 5, 0, 0, 0, 5, 5, 0, 0, 0, 0, 0, 5],
    [5, 0, 0, 0, 0, 5, 0, 0, 0, 0, 5, 0, 0, 0, 0, 5, 5, 0, 0, 0, 5, 5, 0, 0, 0, 5, 0, 0, 0, 0, 0, 5],
    [5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 0, 0, 0, 0, 0, 5]
  ];

  // ground
  matrix = new Matrix4();
  matrix.setTranslate(15.5 + x_disp, groundHeight, 15.5 + z_disp);
  matrix.scale(32, 0.01, 32);
  color = color255to1([0, 100, 0, 255]);
  pushColorCube(matrix, color);

  for (let i = 0; i < map.length; i++) {
    for (let j = 0; j < map[i].length; j++) {
      for (let h = 0; h < map[i][j]; h++) {
        let newCube = pushTextureCube(wallImagePath, true);
        newCube.setTranslate(i + x_disp, cubeGroundHeight + h, j + z_disp);
      }
    }
  }

  // sky
  let sky = pushTextureCube('../assets/sky.png');
  sky.setScale(1000, 1000, 1000);

  // teapot
  let teapot = new ObjModel("../assets/teapot.obj", [1, 1, 0, 1]);
  teapot.setTranslate(-1, -2.5, 0);
  teapot.setScale(0.3, 0.3, 0.3);
  g_shapes.push(teapot);

  // moogle start text
  let startText = new ObjModel("../assets/moogle_dialogue.obj", [1, 0.5, 0, 1]);
  startText.setTranslate(0, 1, -0.2);
  startText.setRotation(0, 90, 0);
  startText.setScale(0.3, 0.3, 0.3);
  g_shapes.push(startText);

  // end maze text
  let endText = new ObjModel("../assets/dialogue_end.obj", [1, 0.5, 0, 1]);
  endText.setTranslate(36, 0, 28);
  endText.setRotation(0, 180, 0);
  endText.setScale(1, 1, 1);
  g_shapes.push(endText);

  // sphere
  let sphere = new ObjModel("../assets/sphere.obj", [1, 1, 1, 1]);
  sphere.setTranslate(1, 0, 0);
  sphere.setScale(0.3, 0.3, 0.3);
  g_shapes.push(sphere);

  // light
  matrix = new Matrix4();
  matrix.setTranslate(g_lightPos[0], g_lightPos[1], g_lightPos[2]);
  matrix.scale(-1, -1, -1);
  color = color255to1([1, 1, 0, 1]);
  g_light = pushColorCube(matrix, color);
}

function createMoogle() {
  let wing1Parts = [];
  let wing2Parts = [];
  let wing3Parts = [];

  let matrix;
  let color;
  let newShape;
  let matrixStack;
  let transformMatrix;

  let bodyColor = color255to1([224, 206, 191, 255])
  let noseColor = color255to1([144, 118, 108, 255])
  let innerEarColor = color255to1([179, 152, 138, 255]);
  let antennaColor = color255to1([102, 98, 95, 255]);
  let pompomColor = color255to1([245, 144, 78, 255]);
  let wingColor = color255to1([117, 112, 129, 255]);

  let wing1Angle = 30;
  let wing2Angle = 30;
  let wing3Angle = 110;

  // body
  matrix = new Matrix4();
  matrix.setTranslate(0, -0.25, 0);
  matrix.scale(0.45, 0.45, 0.45);
  color = bodyColor;
  pushColorCube(matrix, color);

  // head
  matrix = new Matrix4();
  matrix.setTranslate(0, 0.2, 0);
  matrix.scale(0.48, 0.48, 0.48);
  color = bodyColor;
  pushColorCube(matrix, color);

  // nose
  matrix = new Matrix4();
  matrix.setTranslate(0, 0.1, -0.25);
  matrix.scale(0.05, 0.1, 0.05);
  color = noseColor;
  pushColorCube(matrix, color);

  // left eye
  matrix = new Matrix4();
  matrix.setTranslate(-0.15, 0.2, -0.25);
  matrix.rotate(60, 0, 0, 1);
  matrix.scale(0.02, 0.12, 0.02);
  color = noseColor;
  pushColorCube(matrix, color);

  // right eye
  matrix = new Matrix4();
  matrix.setTranslate(0.15, 0.2, -0.25);
  matrix.rotate(-60, 0, 0, 1);
  matrix.scale(0.02, 0.12, 0.02);
  color = noseColor;
  pushColorCube(matrix, color);

  // left ear
  matrix = new Matrix4();
  matrix.setTranslate(-0.23, 0.48, 0);
  matrix.rotate(35, 0, 0, 1);
  matrix.rotate(180, 0, 1, 0);
  matrix.scale(0.2, 0.2, 0.2);
  color = bodyColor;
  pushTetrahedron(matrix, color);

  // left inner ear
  matrix = new Matrix4();
  matrix.setTranslate(-0.22, 0.46, -0.04);
  matrix.rotate(35, 0, 0, 1);
  matrix.rotate(180, 0, 1, 0);
  matrix.scale(0.15, 0.15, 0.15);
  color = innerEarColor;
  pushTetrahedron(matrix, color);

  // right ear
  matrix = new Matrix4();
  matrix.setTranslate(0.23, 0.48, 0);
  matrix.rotate(-35, 0, 0, 1);
  matrix.rotate(180, 0, 1, 0);
  matrix.scale(0.2, 0.2, 0.2);
  color = bodyColor;
  pushTetrahedron(matrix, color);

  // right inner ear
  matrix = new Matrix4();
  matrix.setTranslate(0.22, 0.46, -0.04);
  matrix.rotate(-35, 0, 0, 1);
  matrix.rotate(180, 0, 1, 0);
  matrix.scale(0.15, 0.15, 0.15);
  color = innerEarColor;
  pushTetrahedron(matrix, color);

  // left arm
  matrix = new Matrix4();
  matrix.setTranslate(-0.25, -0.19, 0);
  matrix.rotate(130, 0, 0, 1);
  matrix.rotate(180, 0, 1, 0);
  matrix.scale(0.23, 0.23, 0.23);
  color = bodyColor;
  pushTetrahedron(matrix, color);

  // right arm
  matrix = new Matrix4();
  matrix.setTranslate(0.25, -0.19, 0);
  matrix.rotate(-130, 0, 0, 1);
  matrix.rotate(180, 0, 1, 0);
  matrix.scale(0.23, 0.23, 0.23);
  color = bodyColor;
  pushTetrahedron(matrix, color);

  // left leg
  matrix = new Matrix4();
  matrix.setTranslate(-0.1, -0.55, -0.01);
  matrix.rotate(180, 0, 0, 1);
  matrix.scale(0.23, 0.23, 0.46);
  color = bodyColor;
  pushTetrahedron(matrix, color);

  // right leg
  matrix = new Matrix4();
  matrix.setTranslate(0.1, -0.55, -0.01);
  matrix.rotate(180, 0, 0, 1);
  matrix.scale(0.23, 0.23, 0.46);
  color = bodyColor;
  pushTetrahedron(matrix, color);

  // antenna
  matrix = new Matrix4();
  matrix.setTranslate(0, 0.5, 0);
  matrix.scale(0.03, 0.2, 0.03);
  color = antennaColor;
  pushColorCube(matrix, color);

  // pompom
  matrix = new Matrix4();
  matrix.setTranslate(0, 0.7, 0);
  matrix.scale(0.2, 0.2, 0.2);
  color = pompomColor;
  pushColorCube(matrix, color);

  // left wing inner
  matrix = new Matrix4();
  matrix.setTranslate(-0.15, -0.2, 0.25);
  matrix.rotate(-10, 0, 0, 1);
  matrix.rotate(wing1Angle, 0, 1, 0);
  matrix.rotate(20, 1, 0, 0);
  matrix.scale(0.1, 0.2, 0.05);
  color = wingColor;
  newShape = pushColorCube(matrix, color);
  newShape.side = 1;
  newShape.startMatrix = new Matrix4(matrix);
  wing1Parts.push(newShape);
  matrixStack = matrix;

  // left wing middle
  matrix = new Matrix4(matrixStack);
  transformMatrix = new Matrix4();
  transformMatrix.translate(-1, 0.02, 0.05);
  transformMatrix.rotate(wing2Angle, 0, 1, 0);
  matrix.multiply(transformMatrix)
  color = wingColor;
  newShape = pushColorCube(matrix, color);
  newShape.side = 1;
  newShape.matrixStack = matrixStack;
  newShape.transformMatrix = new Matrix4(transformMatrix);
  wing2Parts.push(newShape);
  matrixStack = matrix;

  // left wing outer
  matrix = new Matrix4(matrixStack);
  transformMatrix = new Matrix4();
  transformMatrix.translate(-1.2, 0, 0.12);
  transformMatrix.rotate(wing3Angle, 0, 1, 0);
  transformMatrix.scale(1, 1.25, 1.5);
  matrix.multiply(transformMatrix)
  color = wingColor;
  newShape = pushColorCube(matrix, color);
  newShape.side = 1;
  newShape.matrixStack = matrixStack;
  newShape.transformMatrix = new Matrix4(transformMatrix);
  wing3Parts.push(newShape);

  // right wing inner
  matrix = new Matrix4();
  matrix.setTranslate(0.15, -0.2, 0.25);
  matrix.rotate(10, 0, 0, 1);
  matrix.rotate(-wing1Angle, 0, 1, 0);
  matrix.rotate(20, 1, 0, 0);
  matrix.scale(0.1, 0.2, 0.05);
  color = wingColor;
  newShape = pushColorCube(matrix, color);
  newShape.side = -1;
  newShape.startMatrix = new Matrix4(matrix);
  wing1Parts.push(newShape);
  matrixStack = matrix;

  // right wing middle
  matrix = new Matrix4(matrixStack);
  transformMatrix = new Matrix4();
  transformMatrix.setTranslate(1, 0.02, 0.05);
  transformMatrix.rotate(-wing2Angle, 0, 1, 0);
  matrix.multiply(transformMatrix)
  color = wingColor;
  newShape = pushColorCube(matrix, color);
  newShape.side = -1;
  newShape.matrixStack = matrixStack;
  newShape.transformMatrix = new Matrix4(transformMatrix);
  wing2Parts.push(newShape);
  matrixStack = matrix;

  // right wing outer
  matrix = new Matrix4(matrixStack);
  transformMatrix = new Matrix4();
  transformMatrix.translate(1.2, 0, 0.12);
  transformMatrix.rotate(-wing3Angle, 0, 1, 0);
  transformMatrix.scale(1, 1.25, 1.5);
  matrix.multiply(transformMatrix)
  color = wingColor;
  newShape = pushColorCube(matrix, color);
  newShape.side = -1;
  newShape.matrixStack = matrixStack;
  newShape.transformMatrix = new Matrix4(transformMatrix);
  wing3Parts.push(newShape);

  g_wingParts = [wing1Parts, wing2Parts, wing3Parts];
}

// my version of updateAnimationAngles
function updateMoogle() {
  // if (g_wingParts[0] == null) return;
  let newAngle;
  for (shape of g_wingParts[0]) {
    shape.matrix.set(shape.startMatrix);

    if (g_animationToggle) newAngle = Math.sin(g_seconds * 4) * 45 * shape.side;
    else newAngle = g_wingAngles[0] * shape.side;
    shape.matrix.rotate(newAngle, 0, 1, 0);
  }

  for (shape of g_wingParts[1]) {
    shape.matrix.set(shape.matrixStack);
    shape.matrix.multiply(shape.transformMatrix);

    if (g_animationToggle) newAngle = Math.sin(g_seconds * 3) * 30 * shape.side;
    else newAngle = g_wingAngles[1] * shape.side;
    shape.matrix.rotate(newAngle, 0, 1, 0);
  }

  for (shape of g_wingParts[2]) {
    shape.matrix.set(shape.matrixStack);
    shape.matrix.multiply(shape.transformMatrix);

    if (g_animationToggle) newAngle = Math.sin(g_seconds * 2) * 15 * shape.side;
    else newAngle = g_wingAngles[2] * shape.side;
    shape.matrix.rotate(newAngle, 0, 1, 0);
  }
}

function pushColorCube(matrix, color) {
  let newCube = new ColorCube(matrix, color);
  g_shapes.push(newCube);
  return newCube;
}

function pushTextureCube(imagePath, breakable = false) {
  let newCube = new TextureCube(imagePath);
  newCube.setImage();
  if (breakable) { g_breakables.push(newCube); }
  else { g_shapes.push(newCube); }
  return newCube;
}

function pushTetrahedron(matrix, color) {
  g_shapes.push(new Tetrahedron(matrix, color));
}

function changeBlock(x, y, z) {
  let posX = Math.round(x);
  let posY = Math.round(y);
  let posZ = Math.round(z);

  console.log(g_breakables.length);
  for (let i = 0; i < g_breakables.length; i++) {
    let currShape = g_breakables[i];
    if (currShape.pos.x === posX && currShape.pos.y === posY && currShape.pos.z === posZ) {
      g_breakables.splice(i, 1);
      return;
    }
  }
  let newCube = pushTextureCube("../assets/dice.png", true);
  newCube.setTranslate(posX, posY, posZ);
}

function tick() {
  let now = performance.now();
  g_seconds = now / 1000.0 - g_startTime;

  // fps tracker by https://www.growingwiththeweb.com/2017/12/fast-simple-js-fps-counter.html
  let duration = now - g_startTime;
  while (g_fpsQueue.length > 0 && g_fpsQueue[0] <= now - 1000) {
    g_fpsQueue.shift();
  }
  g_fpsQueue.push(now);
  let fps = g_fpsQueue.length;
  g_fpsElement.innerText = "ms: " + Math.floor(duration) + " fps: " + fps;

  updateMoogle();

  let maxDistance = 100;
  let speed = 20.0;
  let newY = maxDistance - Math.abs(((duration + (maxDistance * 2)) / speed) % (maxDistance * 2) - maxDistance);
  let newZ = maxDistance - Math.abs((duration / speed) % (maxDistance * 2) - maxDistance);
  g_lightPos[1] = newY - 50.0;
  g_lightPos[2] = newZ - 50.0;
  g_light.matrix.setTranslate(g_lightPos[0], g_lightPos[1], g_lightPos[2]);
  g_light.matrix.scale(-1, -1, -1);

  renderAllShapes();

  requestAnimationFrame(tick);
}

// my version of renderScene
function renderAllShapes() {
  gl.uniformMatrix4fv(g_shaderVars.u_ViewMatrix, false, g_camera.viewMatrix.elements);
  gl.uniformMatrix4fv(g_shaderVars.u_ProjectionMatrix, false, g_camera.projectionMatrix.elements);
  gl.uniform3f(g_shaderVars.u_LightPos, g_lightPos[0], g_lightPos[1], g_lightPos[2]);
  gl.uniform3fv(g_shaderVars.u_CameraPos, g_camera.eye.elements);

  // Clear <canvas>
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  let oldImagePath;

  for (let i = 0; i < g_shapes.length; i++) {
    oldImagePath = g_shapes[i].render(oldImagePath);
  }
  for (let i = 0; i < g_breakables.length; i++) {
    oldImagePath = g_breakables[i].render(oldImagePath);
  }
}
