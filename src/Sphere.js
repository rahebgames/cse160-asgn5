class Sphere {
  constructor(matrix, color) {
    this.matrix = matrix;
    this.color = color;
    this.vertices = [];
    this.normals = [];
    this.vertexBuffer = null;
    this.normalBuffer = null;

    this.setVerticesAndNormals();

    this.vertexBuffer = gl.createBuffer();
    this.normalBuffer = gl.createBuffer();
    this.initBuffers();
  }

  setVerticesAndNormals() {
    let bands = 30;
    let radius = 15;

    for (let i = 0; i <= bands; i++) {
      let theta = (i / bands) * Math.PI; // Latitude (0 to PI)
      let sinTheta = Math.sin(theta);
      let cosTheta = Math.cos(theta);

      for (let j = 0; j <= bands; j++) {
        let phi = (j / bands) * 2 * Math.PI; // Longitude (0 to 2PI)
        let sinPhi = Math.sin(phi);
        let cosPhi = Math.cos(phi);

        // Vertex Position
        let x = radius * cosPhi * sinTheta;
        let y = radius * cosTheta;
        let z = radius * sinPhi * sinTheta;

        this.vertices.push(x, y, z);

        // Normal (Normalized position)
        this.normals.push(x / radius, y / radius, z / radius);
      }

      // Degenerate vertex to break the triangle strip row connection
      if (i < bands) {
        this.vertices.push(this.vertices[this.vertices.length - 3], this.vertices[this.vertices.length - 2], this.vertices[this.vertices.length - 1]);
        this.normals.push(this.normals[this.normals.length - 3], this.normals[this.normals.length - 2], this.normals[this.normals.length - 1]);
      }
    }
  }

  initBuffers() {
    if (!this.vertexBuffer || !this.normalBuffer) {
      console.log('Failed to create buffers for color cube', this.imagePath);
      return;
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.vertices), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.vertices), gl.STATIC_DRAW);

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

    gl.drawArrays(gl.TRIANGLE_FAN, 0, this.vertices.length / 3);
    gl.disableVertexAttribArray(g_shaderVars.a_Position);
    gl.disableVertexAttribArray(g_shaderVars.a_Normal);

    return oldImagePath;

  }

}
