import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { Bounds, ContactShadows, Environment, OrbitControls, useGLTF } from "@react-three/drei";

function Model({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  return <primitive object={scene} />;
}

export default function ModelScene({ url }: { url: string }) {
  return (
    <Canvas dpr={[1, 2]} camera={{ position: [0, 0.5, 3.2], fov: 40 }}>
      <ambientLight intensity={0.7} />
      <directionalLight position={[3, 5, 2]} intensity={1.1} />
      <Suspense fallback={null}>
        <Bounds fit clip observe margin={1.2}>
          <Model url={url} />
        </Bounds>
        <Environment preset="city" />
      </Suspense>
      <ContactShadows position={[0, -1, 0]} opacity={0.35} blur={2.6} far={4} />
      <OrbitControls enablePan={false} minDistance={1.5} maxDistance={6} />
    </Canvas>
  );
}
