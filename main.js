import './style.css'
import * as THREE from 'three'; 
import { ObjectLoader, PointLight } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';


//setting keycodes
const KEYS = {
  'a': 65,
  's': 83,
  'w': 87,
  'd': 68,
};


function clamp(x, a, b) {
  return Math.min(Math.max(x, a), b);

}


// Input controller. initializes user controls. 
class UserInputController {
  constructor(target) {
    this.target_ = target || document;
    this.initialize_();    
  }

    initialize_() {
      this.current_ = {
        leftMB: false,
        rightMB: false,
        mouseXDelta: 0,
        mouseYDelta: 0,
        mouseX: 0,
        mouseY: 0,
      };

      this.previous_ = null;
      this.keys_ = {};
      this.previousKeys_ = {};

      this.target_.addEventListener('mousedown', (e) => this.onMouseDown_(e), false);
      this.target_.addEventListener('mousemove', (e) => this.onMouseMove_(e), false);
      this.target_.addEventListener('mouseup', (e) => this.onMouseUp_(e), false);
      this.target_.addEventListener('keydown', (e) => this.onKeyDown_(e), false);
      this.target_.addEventListener('keyup', (e) => this.onKeyUp_(e), false);
    }

    onMouseMove_(e) {
      this.current_.mouseX = e.pageX - window.innerWidth / 2;
      this.current_.mouseY = e.pageY - window.innerHeight / 2;
  
      if (this.previous_ === null) {
        this.previous_ = {...this.current_};
      }
  
      this.current_.mouseXDelta = this.current_.mouseX - this.previous_.mouseX;
      this.current_.mouseYDelta = this.current_.mouseY - this.previous_.mouseY;
    }
  
    onMouseDown_(e) {
      this.onMouseMove_(e);
  
      switch (e.button) {
        case 0: {
          this.current_.leftButton = true;
          break;
        }
        case 2: {
          this.current_.rightButton = true;
          break;
        }
      }
    }
  
    onMouseUp_(e) {
      this.onMouseMove_(e);
  
      switch (e.button) {
        case 0: {
          this.current_.leftButton = false;
          break;
        }
        case 2: {
          this.current_.rightButton = false;
          break;
        }
      }
    }
  
    key(keyCode) {
      return !!this.keys_[keyCode];
    }
  
    onKeyDown_(e) {
      this.keys_[e.keyCode] = true;
      
    }
  
    onKeyUp_(e) {
      this.keys_[e.keyCode] = false;
    }
  
  
    isReady() {
      return this.previous_ !== null;
    }

    update(_) {
      if (this.previous_ !== null) {
        this.current_.mouseXDelta = this.current_mouseX -
        this.previous_.mouseX;
        this.current_.mouseYDelta = this.current_mouseY -
        this.previous_.mouseY;

        this.previous_ = {...this.current_};
      }
    }  
  };


//class creating the first person pespective
//view for the user.
class FirstPersonPerspective {
  constructor (camera, objects) {
    this.camera_ = camera;
    this.input_ = new UserInputController();
    this.rotation_ = new THREE.Quaternion();
    this.translation_ = new THREE.Vector3();
    this.phi_ = 0;
    this.phiSpeed_ = 0;
    this.theta_ = 0;
    this.thetaSpeed_ = 0;
    this.objects_ = objects;
  }

  update(timeElapsedS) {
    this.updateRotation_(timeElapsedS);
    this.updateCamera_(timeElapsedS);
    this.updateTranslation_(timeElapsedS);
    this.input_.update(timeElapsedS);
  }

  updateCamera_(_) {
    this.camera_.quaternion.copy (this.rotation_);
    this.camera_.position.copy(this.translation_);

    const forward = new THREE.Vector3(0, 0, -1);
    forward.applyQuaternion(this.rotation_);

    const dir = forward.clone();

    forward.multiplyScalar(100);
    forward.add(this.translation_);

    let closest = forward;
    const result = new THREE.Vector3();
    const ray = new THREE.Ray(this.translation_, dir);
    for (let i = 0; i < this.objects_.length; ++i ) {
      if (ray.intersectBox(this.objects_[i], result)) {
        if (result.distanceTo(ray.origin) < 
        closest.distanceTo(ray.origin)) {
          closest = forward.clone();

        }
      }
    }
    this.camera_.lookAt(closest);
  }


  updateTranslation_(timeElapsedS) {
    const forwardVel = (this.input_.key(KEYS.w) ? 1 : 0) + 
    (this.input_.key(KEYS.s) ? -1 : 0)
    const strafeVel = (this.input_.key(KEYS.a) ? 1 : 0) +
    (this.input_.key(KEYS.d) ? -1 : 0)

    const qx = new THREE.Quaternion();
    qx.setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.phi_);

    const forward = new THREE.Vector3(0, 0, -1);
    forward.applyQuaternion(qx);
    forward.multiplyScalar(forwardVel + timeElapsedS * 10);

    const left = new THREE.Vector3(-1, 0, 0);
    left.applyQuaternion(qx);
    left.multiplyScalar(strafeVel * timeElapsedS * 10);

    this.translation_.add(forward);
    this.translation_.add(left);

  }
  
  //updates rotation speed and angle 
  updateRotation_(timeElapsedS) {
    const xh = this.input_.current_.mouseXDelta / window.innerWidth;
    const yh = this.input_.current_.mouseYDelta / window.innerHeight;

    this.phi_ += -xh * this.phiSpeed_;
    this.theta_ = clamp(this.theta_ + -yh * this.thetaSpeed_,
       -Math.PI / 3, Math.PI / 3 );

    const qx = new THREE.Quaternion();
    qx.setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.phi_);
    const qz = new THREE.Quaternion(new THREE.Vector3(1, 0, 0),
     this.theta_);

    const q = new THREE.Quaternion();
    q.multiply(qx);
    q.multiply(qz);

    this.rotation_.copy(q);
  }
}

//main class 
class RoomModuleTestingDemo {
  constructor() {
    this.initialize_();
  }

  initialize_() {
    this.initializeRenderer_();
    //this.initializeRayCaster_();
    this.initializeLights_();
    this.initializeScene_();
    //this.initializePostFX_();
    this.initializeDemo_();
    //this.initializeAudio_();
    this.previousRAF_ = null;
    this.raf_();
    this.onWindowResize_();
  }

  initializeAudio_() {

    this.listener_ = new THREE.AudioListener();
    this.camera_.add(this.listener_);
    const sound = new THREE.PositionalAudio(this.listener_); 
    this.speakerMesh1_.add(sound);
    this.speakerMesh2_.add(sound);
    const audioLoader = new THREE.AudioLoader();
    audioLoader.load('assets/audio/somebody.mp3',
     (buffer) => {
      setTimeout(() => {
        sound.setBuffer(buffer);
        sound.setLoop(false);
        sound.setVolume(0.3);
        sound.setRefDistance(1 * 0.85);
        sound.play(onclick);
      
      });
    });
  }

  initializeDemo_() {
    this.fpCamera_ = new FirstPersonPerspective(
      this.camera_, this.objects_);
  }

  initializeRenderer_() {
    this.threejs_ = new THREE.WebGLRenderer({
      antialias: true,
    });

    this.threejs_.setPixelRatio(window.devicePixelRatio);
    this.threejs_.setSize(window.innerWidth / window.innerHeight);
    this.threejs_.physicallyCorrectLights = true;
    this.threejs_.outputEncoding = THREE.sRGBEncoding

    document.body.appendChild(this.threejs_.domElement);

    window.addEventListener('resize', () => {
      this.onWindowResize_();
    }, false);

    const fov = 60;
    const aspect = 1920 / 1080;
    const near = 1.0; 
    const far = 50.0;
    this.camera_ = new THREE.PerspectiveCamera(fov, aspect, near, far);
    this.camera_.position.set(0, 5, 0);
    
    this.scene_ = new THREE.Scene();
    this.uiCamera_ = new THREE.OrthographicCamera(
      -1, 1, 1 * aspect, -1 * aspect, 1, 1000);
    this.uiScene_ = new THREE.Scene();

    const size = 10;
    const divisions = 10;
    const gridHelper = new THREE.GridHelper( size, divisions );
    this.scene_.add( gridHelper );
  }

  initializeScene_() {
    
  var roomMesh, 
  tableTestTwo, 
  speakerTest, 
  speakerTwoTest,
  recordPlayer;

  const models = [
    {
      url: 'assets/roomAssets/roomMesh.glb',
      position: [0, 0, 0],
      name: roomMesh,
    },
    {
      url: 'assets/roomAssets/tableTestTwo.glb',
      position: [-1.6, 0.7, -10],
      name: tableTestTwo,
    },
    {
      url: 'assets/roomAssets/speakerTest.glb',
      position: [0, 0.2, -10],
      name: speakerTest,
    },
    {
      url: 'assets/roomAssets/speakerTwoTest.glb',
      position: [0, 0.2, -10.23],
      name: speakerTwoTest,
    },
   
    {
      url: 'assets/roomAssets/recordPlayer.glb',
      position: [-3.83, -0.67, -13.6],
      name: recordPlayer,
    },
    
  ]

  const objectLoader = new GLTFLoader()
  Promise.all(models.map(async model => {
    const gltf = await objectLoader.loadAsync(model.url)
    gltf.scene.name = model.name
    gltf.scene.position.set(...model.position)
    this.scene_.add(gltf.scene)
    console.log(models)
      
    }));

  const speaker1 = new THREE.Mesh(
    new THREE.BoxGeometry(0, 0, 0)
  );
  speaker1.position.set(-5, 0, -10.5)
  this.scene_.add(speaker1)

  const speaker2 = new THREE.Mesh(
    new THREE.BoxGeometry(0, 0, 0)
  );
  speaker2.position.set(-5, 0, -10.5)
  this.scene_.add(speaker2)
  this.speakerMesh1_ = speaker1;
  this.speakerMesh2_ = speaker2;
  
  const meshes = [];
  this.objects_ = [];

  for (let i = 0; i < meshes.length; ++i) {
    const b = new THREE.Box3();
    b.setFromObject(meshes[i]);
    this.objects_.push(b);
  }
}

initializeLights_() {
  const distance = 100.0;
  const angle = Math.PI / 4.0;
  const penumbra = 0.5;
  const decay = 1.0;

  let light = new THREE.PointLight(
      0x808080, 75.0, distance, angle, penumbra, decay);
  //light.castShadow = true;
  light.shadow.bias = -0.00001;
  light.shadow.mapSize.width = 4096;
  light.shadow.mapSize.height = 4096;
  light.shadow.camera.near = 1;
  light.shadow.camera.far = 100;

  light.position.set(0, 30, -10);
  light.lookAt(0, 0, 0);
  this.scene_.add(light);

  const upColor = 0xFFFF80;
  const downColor = 0x808080;
  light = new THREE.HemisphereLight(upColor, downColor, 0.3);
  light.color.setHSL( 0.6, 1, 0.6 );
  light.groundColor.setHSL( 0.095, 1, 0.75 );
  light.position.set(0, 0, 10);
  this.scene_.add(light);
  
}

  onWindowResize_() {

    this.camera_.aspect = window.innerWidth / window.innerHeight;
    this.camera_.updateProjectionMatrix();

    this.uiCamera_.left = -this.camera_.aspect;
    this.uiCamera_.right = this.camera_.aspect;
    this.uiCamera_.updateProjectionMatrix();

    this.threejs_.setSize(window.innerWidth, window.innerHeight);


  }

  raf_() {
    requestAnimationFrame((t) => {
      if (this.previousRAF_ === null) {
        this.previousRAF_ = t;
      }

      this.step_(t - this.previousRAF_);
      this.threejs_.autoClear = true;
      this.threejs_.render(this.scene_, this.camera_);
      this.threejs_.autoClear = false;
      this.threejs_.render(this.uiScene_, this.uiCamera_);
      this.previousRAF_ = t;
      this.raf_();
    });
  }

  step_(timeElapsed) {
    const timeElapsedS = timeElapsed * 0.001;

    // this.controls_.update(timeElapsedS);
    this.fpCamera_.update(timeElapsedS);
  }
}

let _APP = null;

window.addEventListener('DOMContentLoaded', () => {
  const _Setup = () => {
    _APP = new RoomModuleTestingDemo();
    document.body.removeEventListener('click', _Setup);
  };
  document.body.addEventListener('click', _Setup);
});




