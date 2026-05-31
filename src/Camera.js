class Camera {
  constructor(canvas) {
    this.speed = 0.15;
    this.panSpeed = 1;
    this.fov = 60;
    this.eye = new Vector3([0, 0, -2]);
    this.at = new Vector3([0, 0, 1]);
    this.up = new Vector3([0, 1, 0]);
    this.viewMatrix = new Matrix4();
    this.updateViewMatrix();
    this.projectionMatrix = new Matrix4();
    this.projectionMatrix.setPerspective(this.fov, canvas.width / canvas.height, 0.1, 1000);
  }

  updateViewMatrix() {
    this.viewMatrix.setLookAt(this.eye.elements[0], this.eye.elements[1], this.eye.elements[2], this.at.elements[0], this.at.elements[1], this.at.elements[2], this.up.elements[0], this.up.elements[1], this.up.elements[2]);
  }

  moveForward() {
    let forward = new Vector3(this.at.elements);
    forward.sub(this.eye);
    forward.normalize();
    forward.mul(this.speed);
    this.eye.add(forward);
    this.at.add(forward);
    this.updateViewMatrix();
  }

  moveLeft() {
    let forward = new Vector3(this.at.elements);
    forward.sub(this.eye);
    let side = Vector3.cross(this.up, forward);
    side.normalize();
    side.mul(this.speed);
    this.eye.add(side);
    this.at.add(side);
    this.updateViewMatrix();
  }

  moveBackwards() {
    let backwards = new Vector3(this.eye.elements);
    backwards.sub(this.at);
    backwards.normalize();
    backwards.mul(this.speed);
    this.eye.add(backwards);
    this.at.add(backwards);
    this.updateViewMatrix();
  }

  moveRight() {
    let forward = new Vector3(this.at.elements);
    forward.sub(this.eye);
    let side = Vector3.cross(forward, this.up);
    side.normalize();
    side.mul(this.speed);
    this.eye.add(side);
    this.at.add(side);
    this.updateViewMatrix();
  }

  panHorizontal(magnitude = 1) {
    let forward = new Vector3(this.at.elements);
    forward.sub(this.eye);
    let rotationMatrix = new Matrix4();
    rotationMatrix.setRotate(this.panSpeed * magnitude, this.up.elements[0], this.up.elements[1], this.up.elements[2]);
    let forwardPrime = rotationMatrix.multiplyVector3(forward);
    this.at.set(this.eye);
    this.at.add(forwardPrime);
    this.updateViewMatrix();
  }

  panVertical(magnitude = 1) {
    let forward = new Vector3(this.at.elements);
    forward.sub(this.eye);

    let rotationMatrix = Vector3.cross(forward, this.up).normalize();
    let rotateMatrix = new Matrix4().setRotate(this.panSpeed * magnitude, rotationMatrix.elements[0], rotationMatrix.elements[1], rotationMatrix.elements[2]);
    let forwardPrime = rotateMatrix.multiplyVector3(forward);
    this.at = new Vector3(this.eye.elements).add(forwardPrime);
    this.updateViewMatrix();
  }

  handleMouseDrag(deltaX, deltaY) {
    const [angleX, angleY] = this.transform.rotation;
    const newAngleY = angleY + dx * 0.2;
    const newAngleX = Math.max(-89, Math.min(89, angleX - dy * 0.2));

    this.transform.setRot(newAngleX, newAngleY, 0);
  }
}