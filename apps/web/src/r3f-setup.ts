import { extend } from '@react-three/fiber';
import * as THREE from 'three';

// Extend R3F with THREE.js objects that might be used declaratively
extend({
  // Add any THREE.js objects that need to be used as JSX elements
  // This prevents the "not part of the THREE namespace" errors
    Mesh: THREE.Mesh,
    Group: THREE.Group,
    Scene: THREE.Scene,
    Camera: THREE.Camera,
    PerspectiveCamera: THREE.PerspectiveCamera,
    OrthographicCamera: THREE.OrthographicCamera,
    AmbientLight: THREE.AmbientLight,
    DirectionalLight: THREE.DirectionalLight,
    PointLight: THREE.PointLight,
    SpotLight: THREE.SpotLight,
    HemisphereLight: THREE.HemisphereLight,
    MeshBasicMaterial: THREE.MeshBasicMaterial,
    MeshStandardMaterial: THREE.MeshStandardMaterial,
    MeshPhongMaterial: THREE.MeshPhongMaterial,
    BoxGeometry: THREE.BoxGeometry,
    SphereGeometry: THREE.SphereGeometry,
    PlaneGeometry: THREE.PlaneGeometry,
    CylinderGeometry: THREE.CylinderGeometry,
    ConeGeometry: THREE.ConeGeometry,
});

// Note: If you encounter "Button is not part of the THREE namespace" error,
// it might be because a component is trying to use a Button from a UI library
// within a Canvas context. Make sure UI components are outside the Canvas.