"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Sphere, MeshDistortMaterial, Float } from "@react-three/drei";
import * as THREE from "three";

/**
 * Animated Orb component
 */
function Orb({ color, position, scale, distort, speed }: any) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  // Rotate slowly over time
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = state.clock.elapsedTime * 0.1 * speed;
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.15 * speed;
    }
  });

  return (
    <Float speed={speed} rotationIntensity={1.5} floatIntensity={2}>
      <Sphere ref={meshRef} args={[1, 64, 64]} position={position} scale={scale}>
        <MeshDistortMaterial
          color={color}
          envMapIntensity={0.5}
          clearcoat={0.8}
          clearcoatRoughness={0}
          metalness={0.8}
          roughness={0.2}
          distort={distort}
          speed={speed * 2}
          transparent={true}
          opacity={0.6}
        />
      </Sphere>
    </Float>
  );
}

/**
 * Floating abstract background to represent the "Spin/Washing" energy
 * in a premium dark aesthetic.
 */
function Scene() {
  const { viewport } = useThree();
  
  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1.5} color="#00d4ff" />
      <directionalLight position={[-10, -10, -5]} intensity={1.5} color="#7c3aed" />
      
      {/* Primary Cyan Orb */}
      <Orb 
        color="#00d4ff" 
        position={[viewport.width / 4, viewport.height / 4, -2]} 
        scale={viewport.width / 6} 
        distort={0.4} 
        speed={1} 
      />
      
      {/* Secondary Violet Orb */}
      <Orb 
        color="#7c3aed" 
        position={[-viewport.width / 3, -viewport.height / 5, -5]} 
        scale={viewport.width / 5} 
        distort={0.6} 
        speed={1.5} 
      />

      {/* Tertiary Emerald Orb */}
      <Orb 
        color="#10b981" 
        position={[viewport.width / 3, -viewport.height / 3, -8]} 
        scale={viewport.width / 8} 
        distort={0.3} 
        speed={0.8} 
      />
    </>
  );
}

export function ThreeBackground() {
  return (
    <div className="fixed inset-0 z-[-1] overflow-hidden bg-gradient-to-br from-[#0a0a0f] to-[#12121a]">
      <Canvas
        camera={{ position: [0, 0, 10], fov: 45 }}
        dpr={[1, 2]}
        gl={{ alpha: false, antialias: true, powerPreference: "high-performance" }}
      >
        <Scene />
      </Canvas>
      {/* Subtle overlay to blend 3D with the page */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[60px]" />
    </div>
  );
}
