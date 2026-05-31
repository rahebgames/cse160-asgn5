class ObjModel {
  constructor(modelPath, color) {
    this.vertices = [];
    this.normals = [];
    this.modelPath = modelPath;
    this.color = color;

    this.pos = { x: 0, y: 0, z: 0 };
    this.rot = { x: 0, y: 0, z: 0 };
    this.scl = { x: 1, y: 1, z: 1 };
    this.matrix = new Matrix4();

    this.vertexBuffer = null;
    this.normalBuffer = null;
    this.vertexArray = null;
    this.normalArray = null;

    this.unappliedTransform = false;
    this.isFullyLoaded = false;

    this.loadPromise = this.getFileContent();
  }

  async getFileContent() {
    try {
      const response = await fetch(this.modelPath);
      if (!response.ok) throw new Error(`Could not load file "${this.modelPath}". Are you sure the file name/path are correct?`);

      const fileContent = await response.text();
      await this.parseModel(fileContent);
    } catch (e) {
      throw new Error(`Something went wrong when loading ${this.modelPath}. Error: ${e}`);
    }
  }

  async parseModel(fileContent) {
    const lines = fileContent.split("\n");
    const allVertices = [];
    const allNormals = [];

    const chunkSize = 200;
    for (let offset = 0; offset < lines.length; offset += chunkSize) {
      const end = Math.min(lines.length, offset + chunkSize);
      for (let i = offset; i < end; i++) {
        const line = lines[i];
        const tokens = line.split(" ");

        if (tokens[0] == 'v') {
          allVertices.push(parseFloat(tokens[1]), parseFloat(tokens[2]), parseFloat(tokens[3]));
        } else if (tokens[0] == "vn") {
          allNormals.push(parseFloat(tokens[1]), parseFloat(tokens[2]), parseFloat(tokens[3]));
        } else if (tokens[0] == "f") {
          for (const face of [tokens[1], tokens[2], tokens[3]]) {
            const indices = face.split("//");
            const vertexIndex = (parseInt(indices[0]) - 1) * 3;
            const normalIndex = (parseInt(indices[1]) - 1) * 3;

            this.vertices.push(
              allVertices[vertexIndex],
              allVertices[vertexIndex + 1],
              allVertices[vertexIndex + 2]
            );

            this.normals.push(
              allNormals[normalIndex],
              allNormals[normalIndex + 1],
              allNormals[normalIndex + 2]
            );
          }
        }
      }

      if (end < lines.length) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }

    this.vertexArray = new Float32Array(this.vertices);
    this.normalArray = new Float32Array(this.normals);

    this.vertexBuffer = gl.createBuffer();
    this.normalBuffer = gl.createBuffer();

    if (!this.vertexBuffer || !this.normalBuffer) {
      console.log("Failed to create buffers for", this.modelPath);
      return;
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.vertexArray, gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.normalArray, gl.STATIC_DRAW);

    this.isFullyLoaded = true;
  }

  setTranslate(x, y, z) {
    this.pos.x = x;
    this.pos.y = y;
    this.pos.z = z;
    this.unappliedTransform = true;
  }

  setRotation(x, y, z) {
    this.rot.x = x;
    this.rot.y = y;
    this.rot.z = z;
    this.unappliedTransform = true;
  }

  setScale(x, y, z) {
    this.scl.x = x;
    this.scl.y = y;
    this.scl.z = z;
    this.unappliedTransform = true;
  }

  translate(x, y, z) {
    this.pos.x += x;
    this.pos.y += y;
    this.pos.z += z;
    this.unappliedTransform = true;
  }

  rotate(x, y, z) {
    this.rot.x += x;
    this.rot.y += y;
    this.rot.z += z;
    this.unappliedTransform = true;
  }

  scale(x, y, z) {
    this.scl.x += x;
    this.scl.y += y;
    this.scl.z += z;
    this.unappliedTransform = true;
  }

  applyTransform() {
    if (this.unappliedTransform) {
      this.matrix.setIdentity();

      this.matrix.translate(this.pos.x, this.pos.y, this.pos.z);
      this.unappliedTranslation = false;

      this.matrix.rotate(this.rot.x, 1, 0, 0);
      this.matrix.rotate(this.rot.y, 0, 1, 0);
      this.matrix.rotate(this.rot.z, 0, 0, 1);
      this.unappliedRotation = false;

      this.matrix.scale(this.scl.x, this.scl.y, this.scl.z);
      this.unappliedScale = false;
    }
  }

  render(oldImagePath) {
    if (!this.isFullyLoaded) { return; }

    this.applyTransform();

    gl.uniformMatrix4fv(g_shaderVars.u_ModelMatrix, false, this.matrix.elements);
    gl.uniform1f(g_shaderVars.u_TexColorWeight, 0.5);
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

    gl.disableVertexAttribArray(g_shaderVars.a_Normal);

    return oldImagePath;
  }
}
