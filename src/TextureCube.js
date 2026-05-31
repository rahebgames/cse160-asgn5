class TextureCube {
  constructor(imagePath) {
    this.vertices = null;
    this.uvs = null;
    this.normals = null;
    this.vertexBuffer = null;
    this.uvBuffer = null;
    this.normalBuffer = null;
    this.texture = null;
    this.imagePath = imagePath;

    this.pos = {x: 0, y: 0, z: 0};
    this.rot = {x: 0, y: 0, z: 0};
    this.scl = {x: 1, y: 1, z: 1};
    this.matrix = new Matrix4();

    this.unappliedTransform = false;
    this.textureLoaded = false;

    this.setVertices();
    this.setUvs();
    this.setNormals();

    this.vertexBuffer = gl.createBuffer();
    this.uvBuffer = gl.createBuffer();
    this.normalBuffer = gl.createBuffer();
    this.texture = gl.createTexture();
    this.initBuffers();
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

  setUvs() {
    // prettier-ignore
    // bottom right, top right, top left, bottom right, top left, bottom left
    this.uvs = new Float32Array([
      // FRONT
      0.5, 0.25, 0.5, 0.5, 0.25, 0.5, 0.5, 0.25, 0.25, 0.5, 0.25, 0.25,
      // LEFT
      0.75, 0, 0.75, 0.25, 0.5, 0.25, 0.75, 0, 0.5, 0.25, 0.5, 0,
      // RIGHT
      0.5, 0.75, 0.5, 0.5, 0.75, 0.5, 0.5, 0.75, 0.75, 0.5, 0.75, 0.75,
      // TOP
      0.25, 0.25, 0.25, 0.5, 0, 0.5, 0.25, 0.25, 0, 0.5, 0, 0.25,
      // BACK
      0.75, 0.5, 0.75, 0.25, 1, 0.5, 1, 0.5, 0.75, 0.25, 1, 0.25,
      // BOTTOM
      0.75, 0.25, 0.75, 0.5, 0.5, 0.5, 0.75, 0.25, 0.5, 0.5, 0.5, 0.25,
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
    if (!this.vertexBuffer || !this.uvBuffer || !this.normalBuffer) {
      console.log('Failed to create buffers for texture cube', this.imagePath);
      return;
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.vertices, gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.uvBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.uvs, gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.normals, gl.STATIC_DRAW);

  }

  setImage() {
    if (!this.imagePath) return;

    let cached = TextureCube.textureCache.get(this.imagePath);
    if (!cached) {
      const texture = gl.createTexture();
      const promise = new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";

        img.onload = () => {
          gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
          gl.activeTexture(gl.TEXTURE0);

          gl.bindTexture(gl.TEXTURE_2D, texture);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
          gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGBA,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            img
          );

          cached.loaded = true;
          resolve(texture);
        };

        img.onerror = () => reject(new Error(`Failed to load image ${this.imagePath}`));
        img.src = this.imagePath;
      });

      cached = { texture, promise, loaded: false };
      TextureCube.textureCache.set(this.imagePath, cached);
    }

    this.texture = cached.texture;
    this.loadPromise = cached.promise;

    if (cached.loaded) {
      this.textureLoaded = true;
    } else {
      cached.promise.then(() => {
        this.textureLoaded = true;
      }).catch(() => {});
    }
  }

  render(oldImagePath) {
    if (this.imagePath != oldImagePath && this.textureLoaded) {
      gl.bindTexture(gl.TEXTURE_2D, this.texture);
    }

    this.applyTransform();

    gl.uniformMatrix4fv(g_shaderVars.u_ModelMatrix, false, this.matrix.elements);
    gl.uniform1f(g_shaderVars.u_TexColorWeight, 1);

    if (!this.vertexBuffer || !this.uvBuffer) {
      console.log("Failed to create the buffer object for texture cube");
      return -1;
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.vertexAttribPointer(g_shaderVars.a_Position, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(g_shaderVars.a_Position);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.uvBuffer);
    gl.vertexAttribPointer(g_shaderVars.a_TexCoord, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(g_shaderVars.a_TexCoord);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
    gl.vertexAttribPointer(g_shaderVars.a_Normal, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(g_shaderVars.a_Normal);

    let normalMatrix = new Matrix4().setInverseOf(this.matrix);
    normalMatrix.transpose();
    gl.uniformMatrix4fv(g_shaderVars.u_NormalMatrix, false, normalMatrix.elements);

    gl.drawArrays(gl.TRIANGLES, 0, this.vertices.length / 3);
    gl.disableVertexAttribArray(g_shaderVars.a_Position);
    gl.disableVertexAttribArray(g_shaderVars.a_TexCoord);
    gl.disableVertexAttribArray(g_shaderVars.a_Normal);

    return this.imagePath;
  }
}

TextureCube.textureCache = new Map();
