// part of https://github.com/rc-dukes/dash fork of https://github.com/mattbradley/dash
export default class TDSModel {
  constructor() {
    this.base64data = base64data;
    this.wheels = ['Toyota_RA7', 'Toyota_RA8', 'Toyota_RA9', 'Toyota_R10'];
    this.carColor = 0x0088ff;
    this.wheelColor = 0xff8800;
  }

  skin(object) {
    const carMaterial = new THREE.MeshToonMaterial({
      color: this.carColor
    });
    const wheelMaterial = new THREE.MeshToonMaterial({
      color: this.wheelColor
    });

    // color the wheels as configured
    object.traverse(child => {
      if (child instanceof THREE.Mesh) {
        child.layers.set(3);
        child.material = this.wheels.includes(child.name) ? wheelMaterial : carMaterial;

        if (child.name == this.wheels[0])
          this.lfWheel3D = child;
        else if (child.name == this.wheels[1])
          this.rfWheel3D = child;
      }
    });

    [this.lfWheel3D, this.rfWheel3D].forEach(wheel => {
      wheel.geometry.computeBoundingBox();
      wheel.geometry.center();
      wheel.position.setY(wheel.position.y - 36);
      wheel.position.setZ(wheel.position.z + 36);
    });
  }
}

const base64data =