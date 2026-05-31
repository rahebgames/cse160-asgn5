class ColorCube {
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
      -0.5, 0.5, 0.5, -0.5, -0.5, 0.5, 0.5, -0.5, 0.5,
      -0.5, 0.5, 0.5, 0.5, -0.5, 0.5, 0.5, 0.5, 0.5,
      //LEFT
      -0.5, 0.5, -0.5, -0.5, -0.5, -0.5, -0.5, -0.5, 0.5,
      -0.5, 0.5, -0.5, -0.5, -0.5, 0.5, -0.5, 0.5, 0.5,
      //RIGHT
      0.5, 0.5, 0.5, 0.5, -0.5, 0.5, 0.5, -0.5, -0.5,
      0.5, 0.5, 0.5, 0.5, -0.5, -0.5, 0.5, 0.5, -0.5,
      //TOP
      -0.5, 0.5, -0.5, -0.5, 0.5, 0.5, 0.5, 0.5, 0.5,
      -0.5, 0.5, -0.5, 0.5, 0.5, 0.5, 0.5, 0.5, -0.5,
      //BACK
      0.5, 0.5, -0.5, 0.5, -0.5, -0.5, -0.5, 0.5, -0.5,
      -0.5, 0.5, -0.5, 0.5, -0.5, -0.5, -0.5, -0.5, -0.5,
      //BOTTOM
      -0.5, -0.5, 0.5, -0.5, -0.5, -0.5, 0.5, -0.5, -0.5,
      -0.5, -0.5, 0.5, 0.5, -0.5, -0.5, 0.5, -0.5, 0.5
    ]);
  }

  setNormals() {
    this.normals = new Float32Array([
      // FRONT (Z = 1)
      0.0, 0.0, 1.0,   0.0, 0.0, 1.0,   0.0, 0.0, 1.0,
      0.0, 0.0, 1.0,   0.0, 0.0, 1.0,   0.0, 0.0, 1.0,

      // LEFT (X = -1)
      -1.0, 0.0, 0.0,  -1.0, 0.0, 0.0,  -1.0, 0.0, 0.0,
      -1.0, 0.0, 0.0,  -1.0, 0.0, 0.0,  -1.0, 0.0, 0.0,

      // RIGHT (X = 1)
      1.0, 0.0, 0.0,   1.0, 0.0, 0.0,   1.0, 0.0, 0.0,
      1.0, 0.0, 0.0,   1.0, 0.0, 0.0,   1.0, 0.0, 0.0,

      // TOP (Y = 1)
      0.0, 1.0, 0.0,   0.0, 1.0, 0.0,   0.0, 1.0, 0.0,
      0.0, 1.0, 0.0,   0.0, 1.0, 0.0,   0.0, 1.0, 0.0,

      // BACK (Z = -1)
      0.0, 0.0, -1.0,  0.0, 0.0, -1.0,  0.0, 0.0, -1.0,
      0.0, 0.0, -1.0,  0.0, 0.0, -1.0,  0.0, 0.0, -1.0,

      // BOTTOM (Y = -1)
      0.0, -1.0, 0.0,  0.0, -1.0, 0.0,  0.0, -1.0, 0.0,
      0.0, -1.0, 0.0,  0.0, -1.0, 0.0,  0.0, -1.0, 0.0
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
