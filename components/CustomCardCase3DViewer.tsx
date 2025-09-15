import React, { useEffect, useRef, useState, Suspense, Component, ErrorInfo, ReactNode } from 'react';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { OrbitControls, Environment, useGLTF, Preload } from '@react-three/drei';
import { TextureLoader } from 'three';
import * as THREE from 'three';

interface CustomCardCase3DViewerProps {
  cardFrontImage: string;
  cardBackImage: string;
  className?: string;
  modelPath?: string;
}

// Error boundary for 3D viewer
class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_: Error) {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('3D Viewer Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-full text-cyber-purple">
          <p>Unable to load 3D preview</p>
        </div>
      );
    }

    return this.props.children;
  }
}

// Completely independent model component for custom cards
// REMOVED memo() to test if memoization is preventing texture updates
const CustomCardCaseModel = ({ 
  cardFrontImage, 
  cardBackImage,
  modelPath = '/card-slab-3d-custom.glb'
}: Omit<CustomCardCase3DViewerProps, 'className'>) => {
  // Use custom GLB file with proper path - ensure it's a relative path
  const cleanPath = modelPath.startsWith('http') || modelPath.startsWith('/Users') 
    ? '/card-slab-3d-custom.glb' 
    : (modelPath.startsWith('/') ? modelPath : `/${modelPath}`);
  const gltf = useGLTF(cleanPath);
  const modelRef = useRef<THREE.Group>(null);
  const [texturesReady, setTexturesReady] = React.useState(false);
  
  // Clone the scene to prevent sharing materials across instances
  const clonedScene = React.useMemo(() => {
    return gltf.scene.clone();
  }, [gltf.scene]);
  
  // Track created materials for proper disposal
  const materialsRef = useRef<{
    cardFront: THREE.MeshStandardMaterial | null;
    cardBack: THREE.MeshStandardMaterial | null;
    clearPlastic: THREE.MeshPhysicalMaterial | null;
    namePlate: THREE.MeshStandardMaterial | null;
    namePlateBack: THREE.MeshStandardMaterial | null;
  }>({
    cardFront: null,
    cardBack: null,
    clearPlastic: null,
    namePlate: null,
    namePlateBack: null,
  });
  // Clean texture paths to ensure they're proper URLs
  const cleanFrontImage = cardFrontImage.startsWith('blob:') || cardFrontImage.startsWith('http') || cardFrontImage.startsWith('data:')
    ? cardFrontImage 
    : (cardFrontImage.startsWith('/') ? cardFrontImage : `/${cardFrontImage}`);
  const cleanBackImage = cardBackImage.startsWith('blob:') || cardBackImage.startsWith('http') || cardBackImage.startsWith('data:')
    ? cardBackImage
    : (cardBackImage.startsWith('/') ? cardBackImage : `/${cardBackImage}`);
    
  // Load textures with proper error handling
  const [frontTexture, backTexture, namePlateTexture] = useLoader(
    TextureLoader,
    [
      cleanFrontImage || '/placeholder.jpg',
      cleanBackImage || '/redbackbleed111111.jpg',
      '/Topper_card_single_v2.webp'
    ],
    (loader) => {
      loader.setCrossOrigin('anonymous');
    }
  );
  
  // Configure textures
  useEffect(() => {
    frontTexture.colorSpace = THREE.SRGBColorSpace;
    frontTexture.anisotropy = 16;
    frontTexture.generateMipmaps = true;
    frontTexture.minFilter = THREE.LinearMipmapLinearFilter;
    frontTexture.magFilter = THREE.LinearFilter;
    
    backTexture.colorSpace = THREE.SRGBColorSpace;
    backTexture.anisotropy = 16;
    backTexture.generateMipmaps = true;
    backTexture.minFilter = THREE.LinearMipmapLinearFilter;
    backTexture.magFilter = THREE.LinearFilter;
    
    namePlateTexture.colorSpace = THREE.SRGBColorSpace;
    namePlateTexture.anisotropy = 16;
    namePlateTexture.generateMipmaps = true;
    namePlateTexture.minFilter = THREE.LinearMipmapLinearFilter;
    namePlateTexture.magFilter = THREE.LinearFilter;
    
    // Cleanup function to dispose textures when component unmounts or textures change
    return () => {
      frontTexture.dispose();
      backTexture.dispose();
      // Don't dispose nameplate texture as it's shared
    };
  }, [frontTexture, backTexture, namePlateTexture]);
  
  // Apply materials to the custom card model
  useEffect(() => {
    // Reset textures ready state when images change
    setTexturesReady(false);
    
    // Cleanup function to dispose old materials before creating new ones
    const disposeMaterials = () => {
      const materials = materialsRef.current;
      
      if (materials.cardFront) {
        materials.cardFront.map?.dispose();
        materials.cardFront.dispose();
        materials.cardFront = null;
      }
      if (materials.cardBack) {
        materials.cardBack.map?.dispose();
        materials.cardBack.dispose();
        materials.cardBack = null;
      }
      if (materials.clearPlastic) {
        materials.clearPlastic.dispose();
        materials.clearPlastic = null;
      }
      if (materials.namePlate) {
        materials.namePlate.map?.dispose();
        materials.namePlate.dispose();
        materials.namePlate = null;
      }
      if (materials.namePlateBack) {
        materials.namePlateBack.dispose();
        materials.namePlateBack = null;
      }
    };
    
    // Dispose old materials before creating new ones
    disposeMaterials();
    
    if (clonedScene) {
      clonedScene.traverse((child: THREE.Object3D) => {
        if (child instanceof THREE.Mesh) {
          // Apply front texture to card front mesh
          if (child.material && child.material.name === 'Card Front') {
            // Always create new material when textures change
            materialsRef.current.cardFront = new THREE.MeshStandardMaterial({
              map: frontTexture,
              transparent: false,
              side: THREE.DoubleSide,
            });
            
            frontTexture.repeat.set(2.15, 1.400);
            frontTexture.offset.set(0, 0);
            frontTexture.center.set(0.5, 0.5);
            frontTexture.rotation = 0;
            frontTexture.wrapS = THREE.RepeatWrapping;
            frontTexture.wrapT = THREE.RepeatWrapping;
            frontTexture.flipY = false;
            frontTexture.matrixAutoUpdate = true;
            
            child.material = materialsRef.current.cardFront;
            child.material.needsUpdate = true;
          } 
          // Apply back texture to card back mesh
          else if (child.material && child.material.name === 'Card Back') {
            // Always create new material when textures change
            materialsRef.current.cardBack = new THREE.MeshStandardMaterial({
              map: backTexture,
              transparent: false,
              side: THREE.DoubleSide,
            });
            
            backTexture.repeat.set(-0.42, 0.28);
            backTexture.offset.set(1, 0);
            backTexture.center.set(0.5, 0.5);
            backTexture.rotation = 0;
            backTexture.wrapS = THREE.RepeatWrapping;
            backTexture.wrapT = THREE.RepeatWrapping;
            backTexture.flipY = true;
            backTexture.matrixAutoUpdate = true;
            
            child.material = materialsRef.current.cardBack;
            child.material.needsUpdate = true;
          }
          // Apply clear plastic material
          else if (child.material && (
            child.material.name === 'Transparent plastic' || 
            child.material.name === 'TransparentPlastic' ||
            child.material.name === 'Transparent Plastic' ||
            child.material.name === 'transparent plastic' ||
            child.material.name?.toLowerCase().includes('transparent') ||
            child.material.name?.toLowerCase().includes('plastic') ||
            child.name === 'Mesh.012' ||
            child.name === 'Case'
          )) {
            // Always create new material when textures change
            materialsRef.current.clearPlastic = new THREE.MeshPhysicalMaterial({
              color: 0xffffff,
              transparent: true,
              opacity: 0.15,
              roughness: 0.01,
              metalness: 0.0,
              reflectivity: 1.0,
              envMapIntensity: 5.0,
              clearcoat: 1.0,
              clearcoatRoughness: 0.01,
              ior: 1.5,
              transmission: 0.8,
              thickness: 0.2,
              specularIntensity: 1.0,
              specularColor: 0xffffff,
            });
            
            child.material = materialsRef.current.clearPlastic;
            child.material.needsUpdate = true;
          }
          // Apply nameplate material
          else if (child.material && child.material.name === 'Name Plate') {
            // Always create new material when textures change
            materialsRef.current.namePlate = new THREE.MeshStandardMaterial({
              map: namePlateTexture,
              transparent: false,
              side: THREE.DoubleSide,
            });
            
            namePlateTexture.repeat.set(1, 1);
            namePlateTexture.offset.set(0, 0);
            namePlateTexture.center.set(0.5, 0.5);
            namePlateTexture.rotation = 0;
            namePlateTexture.wrapS = THREE.RepeatWrapping;
            namePlateTexture.wrapT = THREE.RepeatWrapping;
            namePlateTexture.flipY = false;
            namePlateTexture.matrixAutoUpdate = true;
            
            child.material = materialsRef.current.namePlate;
            child.material.needsUpdate = true;
          }
          else if (child.material && child.material.name === 'Name Plate Back') {
            // Always create new material when textures change
            materialsRef.current.namePlateBack = new THREE.MeshStandardMaterial({
              color: 0x000000,
              transparent: false,
              side: THREE.DoubleSide,
            });
            
            child.material = materialsRef.current.namePlateBack;
            child.material.needsUpdate = true;
          }
        }
      });
      
      // Mark textures as ready after a small delay to ensure they're properly applied
      setTimeout(() => {
        setTexturesReady(true);
      }, 100);
    }
    
    // Cleanup function when component unmounts or textures change
    return () => {
      disposeMaterials();
      
      // Also check if textures are ImageBitmap and need close()
      if (frontTexture.source?.data instanceof ImageBitmap) {
        frontTexture.source.data.close();
      }
      if (backTexture.source?.data instanceof ImageBitmap) {
        backTexture.source.data.close();
      }
      if (namePlateTexture.source?.data instanceof ImageBitmap) {
        namePlateTexture.source.data.close();
      }
    };
  }, [clonedScene, frontTexture, backTexture, namePlateTexture, cardFrontImage, cardBackImage]);
  
  // Use a more efficient rotation update
  useFrame((state, delta) => {
    if (modelRef.current) {
      modelRef.current.rotation.y += delta * 0.5; // Use delta for frame-independent rotation
    }
  });
  
  return (
    <primitive 
      ref={modelRef} 
      object={clonedScene} 
      scale={[1.5, 1.5, 1.5]} 
      position={[0, 0, 0]} 
      rotation={[0, Math.PI, 0]}
      visible={texturesReady}
    />
  );
};

CustomCardCaseModel.displayName = 'CustomCardCaseModel';

// Preload the custom model
if (typeof window !== 'undefined') {
  useGLTF.preload('/card-slab-3d-custom.glb');
  useGLTF.preload('/card-slab-3d-2.glb'); // Also preload the standard model as fallback
}

// Loading component matching limited edition style
const CustomLoader = () => (
  <div className="absolute inset-0 flex items-center justify-center bg-cyber-dark/20 z-10">
    <div className="text-center p-4">
      <div className="relative">
        <span className="text-sm font-mono text-cyber-purple/80 tracking-wider animate-pulse">
          Loading custom 3D preview...
        </span>
        <div className="absolute -bottom-1 left-0 h-0.5 bg-gradient-to-r from-transparent via-cyber-purple to-transparent w-full animate-pulse"></div>
      </div>
    </div>
  </div>
);

// Completely independent viewer component for custom cards
// REMOVED memo() to test if memoization is preventing texture updates
const CustomCardCase3DViewer = ({ 
  cardFrontImage, 
  cardBackImage, 
  className = '',
  modelPath = '/card-slab-3d-custom.glb'
}: CustomCardCase3DViewerProps) => {
  const [isLoaded, setIsLoaded] = useState(false);

  return (
    <div className={`relative w-full max-w-sm mx-auto font-mono ${className}`}>
      <div
        className="relative w-full overflow-hidden"
        style={{
          aspectRatio: "2.5 / 3.5",
        }}
      >
        {!isLoaded && <CustomLoader />}
        <ErrorBoundary>
          <Canvas 
          camera={{ position: [0, 0, 20], fov: 50 }}
          style={{ width: '100%', height: '100%' }}
          className="absolute inset-0"
          dpr={[1, 2]}
          performance={{ min: 0.5 }}
          onCreated={() => setIsLoaded(true)}
        >
          {/* Lighting setup matching limited edition */}
          <ambientLight intensity={0.3} />
          <directionalLight position={[5, 10, 5]} intensity={1.2} castShadow />
          <directionalLight position={[-5, 5, 3]} intensity={0.8} />
          <directionalLight position={[0, 2, -8]} intensity={0.6} />
          <pointLight position={[3, 3, 8]} intensity={0.5} />
          <pointLight position={[-3, -2, 6]} intensity={0.4} />
          <spotLight 
            position={[0, 8, 8]} 
            angle={0.3} 
            penumbra={0.5} 
            intensity={0.8}
            castShadow
          />
          
          <Suspense fallback={null}>
            <CustomCardCaseModel 
              cardFrontImage={cardFrontImage} 
              cardBackImage={cardBackImage}
              modelPath={modelPath}
            />
            <Environment preset="city" background={false} />
            <OrbitControls 
              enablePan={false}
              enableZoom={false}
              autoRotate
              autoRotateSpeed={1}
              minPolarAngle={Math.PI / 2.8}
              maxPolarAngle={Math.PI / 1.8}
              minDistance={15}
              maxDistance={25}
            />
            <Preload all />
          </Suspense>
        </Canvas>
        </ErrorBoundary>
      </div>
    </div>
  );
};

CustomCardCase3DViewer.displayName = 'CustomCardCase3DViewer';

export default CustomCardCase3DViewer;