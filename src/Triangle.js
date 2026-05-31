class Tetrahedron {
  constructor(matrix, color) {
    this.matrix = matrix;
    this.color = color;
    this.vertices = null;
    this.normals = null;
    this.vertexBuffer = null;
    this.normalBuffer = null;
    
    this.setVertices();
    this.setNormals();
  
    this.vertexBuffer = gl.createBuffer();
    this.normalBuffer = gl.createBuffer();
    this.initBuffers();
  }

  setVertices() {
    // prettier-ignore
    this.vertices = new Float32Array([
      //FRONT
      -0.5,-0.5,0.5, 0.5,-0.5,0.5, 0,0.5,0,
      //LEFT
      0,-0.5,-0.5, -0.5,-0.5,0.5, 0,0.5,0,
      //RIGHT
      0.5,-0.5,0.5, 0,-0.5,-0.5, 0,0.5,0,
      //BOTTOM
      -0.5,-0.5,0.5, 0,-0.5,-0.5, 0.5,-0.5,0.5
    ]);
  }

  setNormals() {
    this.normals = new Float32Array([
      // FRONT 
      0.0, 0.447, 0.894, 0.0, 0.447, 0.894,
      // LEFT 
      -0.756, 0.378, -0.534, -0.756, 0.378, -0.534,
      // RIGHT 
      0.756, 0.378, -0.534, 0.756, 0.378, -0.534,
      // BOTTOM 
      0.0, -1.0, 0.0, 0.0, -1.0, 0.0
    ]);
  }

  initBuffers() {
    if (!this.vertexBuffer || !this.normalBuffer) {
      console.log('Failed to create buffers for color cube', this.imagePath);
      return;
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.vertices, gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.normals, gl.STATIC_DRAW);

  }

  render(oldImagePath) {
    gl.uniformMatrix4fv(g_shaderVars.u_ModelMatrix, false, this.matrix.elements);
    gl.uniform1f(g_shaderVars.u_TexColorWeight, 0);
    gl.uniform4fv(g_shaderVars.u_BaseColor, this.color);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.vertexAttribPointer(g_shaderVars.a_Position, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(g_shaderVars.a_Position);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
    gl.vertexAttribPointer(g_shaderVars.a_Normal, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(g_shaderVars.a_Normal);

    let normalMatrix = new Matrix4().setInverseOf(this.matrix);
    normalMatrix.transpose();
    gl.uniformMatrix4fv(g_shaderVars.u_NormalMatrix, false, normalMatrix.elements);

    gl.drawArrays(gl.TRIANGLES, 0, this.vertices.length / 3);
    gl.disableVertexAttribArray(g_shaderVars.a_Position);
    gl.disableVertexAttribArray(g_shaderVars.a_Normal);

    return oldImagePath;

  }

  darkenColor(mod) {
    return [this.color[0]*mod, this.color[1]*mod, this.color[2]*mod, this.color[3]];
  }
}

let g_triangleVertexBuffer = null;

function getTriangleBuffer() {
  if (!g_triangleVertexBuffer) {
    g_triangleVertexBuffer = gl.createBuffer();
    if (!g_triangleVertexBuffer) {
      console.log('Failed to create the triangle buffer object');
      return null;
    }
  }
  return g_triangleVertexBuffer;
}

function drawTriangle(vertices) {
  const vertexBuffer = getTriangleBuffer();
  if (!vertexBuffer) return -1;

  const vertices_array = new Float32Array(vertices);
  const n = 3; // The number of vertices

  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, vertices_array, gl.DYNAMIC_DRAW);
  gl.vertexAttribPointer(g_shaderVars.a_Position, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(g_shaderVars.a_Position);
  gl.drawArrays(gl.TRIANGLES, 0, n);
  gl.disableVertexAttribArray(g_shaderVars.a_Position);
}

function drawTriangleTexture(vertices) {
  return drawTriangle(vertices);
}
