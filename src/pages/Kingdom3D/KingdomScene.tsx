import {
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentRef,
  type RefObject,
} from "react";
import {
  Canvas,
  useFrame,
  useThree,
  type ThreeEvent,
} from "@react-three/fiber";
import { Html, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import type { Building } from "../../types";

const MAT = {
  stone: new THREE.MeshStandardMaterial({ color: "#9ba7af", roughness: 0.82 }),
  stoneDark: new THREE.MeshStandardMaterial({ color: "#5e6871", roughness: 0.9 }),
  stoneWarm: new THREE.MeshStandardMaterial({ color: "#b69b5f", roughness: 0.8 }),
  royal: new THREE.MeshStandardMaterial({ color: "#5b3d86", emissive: "#5b3d86", emissiveIntensity: 0.2, roughness: 0.7 }),
  roof: new THREE.MeshStandardMaterial({ color: "#8f2a35", roughness: 0.65 }),
  roofDark: new THREE.MeshStandardMaterial({ color: "#4d1d26", roughness: 0.7 }),
  gold: new THREE.MeshStandardMaterial({ color: "#f0c76d", metalness: 0.75, roughness: 0.25 }),
  accent: new THREE.MeshStandardMaterial({ color: "#6cc8d0", emissive: "#6cc8d0", emissiveIntensity: 0.2, roughness: 0.55 }),
  wood: new THREE.MeshStandardMaterial({ color: "#825e3b", roughness: 0.92 }),
  woodDark: new THREE.MeshStandardMaterial({ color: "#593f2e", roughness: 0.92 }),
  foliage: new THREE.MeshStandardMaterial({ color: "#2f7a3c", roughness: 0.9 }),
  foliageSoft: new THREE.MeshStandardMaterial({ color: "#4f9f54", roughness: 0.9 }),
  grass: new THREE.MeshStandardMaterial({ color: "#4d7a49", roughness: 1 }),
  road: new THREE.MeshStandardMaterial({ color: "#434b57", roughness: 1 }),
  wall: new THREE.MeshStandardMaterial({ color: "#7d86a0", roughness: 0.95 }),
  water: new THREE.MeshStandardMaterial({ color: "#2a7aa7", roughness: 0.2, metalness: 0.18, transparent: true, opacity: 0.9 }),
  crystal: new THREE.MeshStandardMaterial({ color: "#b9fffc", emissive: "#8eddff", emissiveIntensity: 0.8, roughness: 0.35 }),
  torch: new THREE.MeshStandardMaterial({ color: "#f6d08d", emissive: "#f0b34d", emissiveIntensity: 1.6, roughness: 0.2 }),
};

function SkyDome() {
  return (
    <group>
      <mesh position={[0, 30, -18]}>
        <sphereGeometry args={[80, 32, 32]} />
        <meshStandardMaterial color="#0d1520" side={THREE.BackSide} />
      </mesh>
      <mesh position={[0, 55, -42]}>
        <sphereGeometry args={[25, 24, 24]} />
        <meshBasicMaterial color="#dfe7f1" transparent opacity={0.15} />
      </mesh>
    </group>
  );
}

function KingdomBase({ size = 34 }: { size?: number }) {
  return (
    <group>
      <mesh position={[0, -1.05, 0]} receiveShadow>
        <cylinderGeometry args={[size + 6.5, size + 8.5, 2.1, 48]} />
        <meshStandardMaterial color="#3c4b3a" roughness={0.9} />
      </mesh>
      <mesh position={[0, -0.1, 0]} receiveShadow>
        <cylinderGeometry args={[size + 1.5, size + 2.2, 0.9, 48]} />
        <meshStandardMaterial color="#7e8b7f" roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.35, 0]} receiveShadow>
        <cylinderGeometry args={[size, size * 0.88, 0.8, 48]} />
        <meshStandardMaterial color="#a8b3a1" roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.8, 0]} receiveShadow>
        <cylinderGeometry args={[size * 0.9, size * 0.78, 0.5, 48]} />
        <meshStandardMaterial color="#d4c8a8" roughness={0.95} />
      </mesh>
      <mesh position={[0, 2.2, 0]}>
        <torusGeometry args={[size * 0.78, 0.42, 16, 64]} />
        <meshStandardMaterial color="#d0b46c" metalness={0.6} roughness={0.25} />
      </mesh>
    </group>
  );
}

function KingdomRoads() {
  const roads = [
    { pos: [0, 0.15, 0], scale: [42, 0.5, 4.2], rot: 0 },
    { pos: [0, 0.15, 0], scale: [4.2, 0.5, 42], rot: 0 },
    { pos: [10, 0.15, 0], scale: [10, 0.5, 3.8], rot: 0.28 },
    { pos: [-11, 0.15, 0], scale: [10, 0.5, 3.8], rot: -0.28 },
    { pos: [0, 0.15, 12], scale: [10, 0.5, 3.8], rot: 0.16 },
    { pos: [0, 0.15, -12], scale: [10, 0.5, 3.8], rot: -0.16 },
  ];

  return (
    <group>
      {roads.map((road, index) => (
        <mesh
          key={index}
          position={road.pos as [number, number, number]}
          rotation={[0, road.rot, 0]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={road.scale as [number, number, number]} />
          <meshStandardMaterial color="#525b66" roughness={1} />
        </mesh>
      ))}

      {[-12, 12].map((x) => (
        <mesh key={x} position={[x, 0.1, 0]} rotation={[0, Math.PI / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[29, 0.2, 1.1]} />
          <meshStandardMaterial color="#d9c28a" roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

function KingdomWalls() {
  const size = 33;
  const segments = [
    { pos: [0, 1.2, size], scale: [size * 2.2, 2.4, 1.5] },
    { pos: [0, 1.2, -size], scale: [size * 2.2, 2.4, 1.5] },
    { pos: [size, 1.2, 0], scale: [1.5, 2.4, size * 2.2] },
    { pos: [-size, 1.2, 0], scale: [1.5, 2.4, size * 2.2] },
  ];

  return (
    <group>
      {segments.map((segment, index) => (
        <mesh key={index} position={segment.pos as [number, number, number]} scale={segment.scale as [number, number, number]} castShadow receiveShadow>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="#8c93a2" roughness={0.9} />
        </mesh>
      ))}

      {[
        [size, size],
        [size, -size],
        [-size, size],
        [-size, -size],
      ].map(([x, z], index) => (
        <group key={index} position={[x, 0, z]}>
          <mesh position={[0, 2.8, 0]} castShadow>
            <cylinderGeometry args={[1.7, 2.3, 5.6, 10]} />
            <meshStandardMaterial color="#8f96a8" roughness={0.9} />
          </mesh>
          <mesh position={[0, 6, 0]} castShadow>
            <coneGeometry args={[1.8, 2.5, 10]} />
            <meshStandardMaterial color="#7a2c39" roughness={0.7} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function House({ position, scale = 1, tone = 0 }: { position: [number, number, number]; scale?: number; tone?: number }) {
  const roofColor = tone % 2 === 0 ? MAT.roof : MAT.roofDark;
  const wallColor = tone % 2 === 0 ? MAT.stone : MAT.stoneWarm;
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 1.2, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.3, 2.4, 1.9]} />
        <meshStandardMaterial color={wallColor.color.getHexString()} roughness={0.82} />
      </mesh>
      <mesh position={[0, 2.8, 0]} castShadow>
        <coneGeometry args={[1.8, 1.8, 4]} />
        <meshStandardMaterial color={roofColor.color.getHexString()} roughness={0.65} />
      </mesh>
      <mesh position={[0.3, 1.8, 0.95]}>
        <boxGeometry args={[0.4, 0.55, 0.08]} />
        <meshStandardMaterial color="#f7d67a" emissive="#f7d67a" emissiveIntensity={0.35} />
      </mesh>
    </group>
  );
}

function ResidentialDistrict() {
  const houses: Array<{ position: [number, number, number]; scale: number; tone: number }> = [
    { position: [-15, 0, -10], scale: 1.2, tone: 0 },
    { position: [-12, 0, -15], scale: 1.1, tone: 1 },
    { position: [-18, 0, -3], scale: 1.3, tone: 0 },
    { position: [-20, 0, 7], scale: 1.15, tone: 1 },
    { position: [-8, 0, -18], scale: 1.2, tone: 0 },
    { position: [14, 0, -15], scale: 1.3, tone: 1 },
    { position: [18, 0, -7], scale: 1.1, tone: 0 },
    { position: [16, 0, 11], scale: 1.2, tone: 1 },
    { position: [8, 0, 17], scale: 1.1, tone: 0 },
    { position: [-2, 0, 18], scale: 1.25, tone: 1 },
  ];

  return (
    <group>
      {houses.map((house, index) => (
        <House key={index} position={house.position} scale={house.scale} tone={house.tone} />
      ))}
      <mesh position={[0, 0.2, 16]} castShadow receiveShadow>
        <cylinderGeometry args={[5.4, 5.8, 0.35, 24]} />
        <meshStandardMaterial color="#d6cfa2" roughness={0.94} />
      </mesh>
      <mesh position={[0, 0.6, 16]} castShadow>
        <cylinderGeometry args={[0.22, 0.22, 2.6, 8]} />
        <meshStandardMaterial color="#b89d52" metalness={0.7} roughness={0.4} />
      </mesh>
      <mesh position={[0, 2.5, 16]} castShadow>
        <sphereGeometry args={[0.54, 16, 16]} />
        <meshStandardMaterial color="#f0d680" emissive="#f8d782" emissiveIntensity={0.9} />
      </mesh>
      {[-2.5, 0, 2.5].map((x, index) => (
        <mesh key={index} position={[x, 0.6, 19]} castShadow>
          <cylinderGeometry args={[0.25, 0.25, 1.5, 8]} />
          <meshStandardMaterial color="#7e6858" roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

function MilitaryDistrict() {
  const dummyPositions = [
    [-22, 0, 18],
    [-18, 0, 20],
    [-14, 0, 18],
  ];

  return (
    <group>
      <mesh position={[-24, 1.1, 0]} castShadow receiveShadow>
        <boxGeometry args={[9, 2.2, 5.5]} />
        <meshStandardMaterial color="#7e6a4b" roughness={0.9} />
      </mesh>
      <mesh position={[-24, 2.9, 0]} castShadow>
        <coneGeometry args={[4.2, 2.8, 6]} />
        <meshStandardMaterial color="#8f2a35" roughness={0.7} />
      </mesh>

      {dummyPositions.map((pos, index) => (
        <group key={index} position={pos as [number, number, number]}>
          <mesh position={[0, 1.6, 0]} castShadow>
            <cylinderGeometry args={[0.25, 0.3, 2.7, 8]} />
            <meshStandardMaterial color="#6a605d" roughness={0.95} />
          </mesh>
          <mesh position={[0, 3.1, 0]} castShadow>
            <sphereGeometry args={[0.38, 12, 12]} />
            <meshStandardMaterial color="#c3b39d" roughness={1} />
          </mesh>
          <mesh position={[0.8, 2.2, 0]} rotation={[0, 0, -0.8]} castShadow>
            <boxGeometry args={[1.3, 0.12, 0.1]} />
            <meshStandardMaterial color="#d6bf7b" />
          </mesh>
        </group>
      ))}

      {[-25.5, -21.5, -17.5].map((x, index) => (
        <mesh key={index} position={[x, 0.8, 6.8]} castShadow>
          <boxGeometry args={[0.35, 1.6, 0.35]} />
          <meshStandardMaterial color="#8b8379" roughness={0.9} />
        </mesh>
      ))}
      <mesh position={[-20.5, 0.85, 9.4]} castShadow>
        <boxGeometry args={[3.6, 1.7, 2.5]} />
        <meshStandardMaterial color="#5c5b5d" roughness={0.9} />
      </mesh>
    </group>
  );
}

function FarmDistrict() {
  const plots = Array.from({ length: 6 }, (_, index) => ({
    x: 18 + (index % 3) * 6,
    z: 18 + Math.floor(index / 3) * 6,
  }));

  return (
    <group>
      {plots.map((plot, index) => (
        <group key={index} position={[plot.x, 0, plot.z]}>
          <mesh position={[0, 0.15, 0]} receiveShadow>
            <boxGeometry args={[5.2, 0.18, 4.2]} />
            <meshStandardMaterial color="#7ca765" roughness={1} />
          </mesh>
          {[-1.6, 0, 1.6].map((offset, rowIndex) => (
            <mesh key={rowIndex} position={[offset, 0.32, 0]} castShadow>
              <boxGeometry args={[0.22, 0.3, 3.6]} />
              <meshStandardMaterial color="#3d6d2f" roughness={0.95} />
            </mesh>
          ))}
        </group>
      ))}
      <mesh position={[24, 1.1, 12]} castShadow receiveShadow>
        <boxGeometry args={[6.2, 2.2, 4.2]} />
        <meshStandardMaterial color="#7d5a38" roughness={0.9} />
      </mesh>
      <mesh position={[24, 3.1, 12]} castShadow>
        <coneGeometry args={[3.2, 2.6, 5]} />
        <meshStandardMaterial color="#8c5f39" roughness={0.75} />
      </mesh>
    </group>
  );
}

function ResearchDistrict() {
  return (
    <group>
      <mesh position={[26, 6.4, -18]} castShadow>
        <cylinderGeometry args={[2.6, 3.2, 12.8, 16]} />
        <meshStandardMaterial color="#6d7f97" roughness={0.82} />
      </mesh>
      <mesh position={[26, 13.8, -18]} castShadow>
        <coneGeometry args={[3.1, 4.3, 16]} />
        <meshStandardMaterial color="#3b7fa7" emissive="#3b7fa7" emissiveIntensity={0.2} roughness={0.6} />
      </mesh>
      <mesh position={[26, 16.3, -18]} castShadow>
        <sphereGeometry args={[0.7, 16, 16]} />
        <meshStandardMaterial color="#baf9ff" emissive="#7cf1ff" emissiveIntensity={1.5} />
      </mesh>
      <mesh position={[20, 0.7, -24]} castShadow receiveShadow>
        <boxGeometry args={[5.6, 1.4, 4.2]} />
        <meshStandardMaterial color="#d9d9d4" roughness={0.9} />
      </mesh>
      <mesh position={[22.3, 2.2, -24]} castShadow>
        <cylinderGeometry args={[0.16, 0.16, 3.5, 8]} />
        <meshStandardMaterial color="#d4c88e" metalness={0.7} roughness={0.3} />
      </mesh>
    </group>
  );
}

function RoyalCastle() {
  return (
    <group position={[0, 0, 0]}>
      <mesh position={[0, 2.55, 0]} castShadow receiveShadow>
        <boxGeometry args={[11, 5.1, 11]} />
        <meshStandardMaterial color="#afb8c0" roughness={0.8} />
      </mesh>
      <mesh position={[0, 5.5, 0]} castShadow>
        <boxGeometry args={[8.4, 2.1, 8.4]} />
        <meshStandardMaterial color="#d4d9de" roughness={0.7} />
      </mesh>
      {[
        [4.4, 4.4],
        [-4.4, 4.4],
        [4.4, -4.4],
        [-4.4, -4.4],
      ].map(([x, z], index) => (
        <group key={index} position={[x, 0, z]}>
          <mesh position={[0, 3.6, 0]} castShadow>
            <cylinderGeometry args={[1.2, 1.5, 7.2, 12]} />
            <meshStandardMaterial color="#7d868d" roughness={0.85} />
          </mesh>
          <mesh position={[0, 7.6, 0]} castShadow>
            <coneGeometry args={[1.7, 2.5, 12]} />
            <meshStandardMaterial color="#8f2a35" roughness={0.7} />
          </mesh>
          <mesh position={[0, 9.5, 0]} castShadow>
            <coneGeometry args={[0.7, 1.5, 10]} />
            <meshStandardMaterial color="#f0c76d" emissive="#f0c76d" emissiveIntensity={0.75} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 7.2, 0]} castShadow>
        <cylinderGeometry args={[0.8, 0.8, 8.4, 12]} />
        <meshStandardMaterial color="#f0c76d" metalness={0.7} roughness={0.25} />
      </mesh>
      <mesh position={[0, 11.8, 0]} castShadow>
        <coneGeometry args={[1.6, 3.2, 12]} />
        <meshStandardMaterial color="#f0c76d" metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh position={[0, 0.9, 6.2]} castShadow receiveShadow>
        <boxGeometry args={[4.6, 1.8, 3.2]} />
        <meshStandardMaterial color="#6a5f62" roughness={0.8} />
      </mesh>
      <mesh position={[0, 1.6, 7.3]} castShadow>
        <boxGeometry args={[1.3, 2.8, 0.4]} />
        <meshStandardMaterial color="#2d2e30" />
      </mesh>
      {[-1.5, 1.5].map((x) => (
        <mesh key={x} position={[x, 6.1, 8.2]} castShadow>
          <boxGeometry args={[0.85, 2.2, 0.2]} />
          <meshStandardMaterial color="#f8d777" emissive="#f8d777" emissiveIntensity={0.7} />
        </mesh>
      ))}
      {[-3.5, 0, 3.5].map((x, index) => (
        <mesh key={index} position={[x, 0.8, -8.2]} castShadow>
          <boxGeometry args={[1.3, 1.6, 1.3]} />
          <meshStandardMaterial color="#e3d0a2" roughness={0.9} />
        </mesh>
      ))}
      {[-4.6, 4.6].map((x) => (
        <mesh key={x} position={[x, 1.4, 0]} castShadow>
          <boxGeometry args={[1.1, 2.8, 1.1]} />
          <meshStandardMaterial color="#d9dce2" roughness={0.8} />
        </mesh>
      ))}
    </group>
  );
}

function KingdomDecorations() {
  const trees = Array.from({ length: 24 }, (_, index) => {
    const angle = (index / 24) * Math.PI * 2;
    const radius = 24 + (index % 5) * 4.5;
    return {
      x: Math.cos(angle) * radius,
      z: Math.sin(angle) * radius,
      scale: 0.9 + (index % 4) * 0.3,
    };
  });

  return (
    <group>
      {trees.map((tree, index) => (
        <group key={index} position={[tree.x, 0, tree.z]} scale={tree.scale}>
          <mesh position={[0, 1.2, 0]} castShadow>
            <cylinderGeometry args={[0.3, 0.38, 2.5, 8]} />
            <meshStandardMaterial color="#7d4d36" roughness={0.9} />
          </mesh>
          <mesh position={[0, 2.6, 0]} castShadow>
            <coneGeometry args={[1.1, 2.4, 10]} />
            <meshStandardMaterial color="#2f7a3c" roughness={0.9} />
          </mesh>
          <mesh position={[0.6, 2.2, 0.2]} castShadow>
            <coneGeometry args={[0.8, 1.8, 10]} />
            <meshStandardMaterial color="#3e8f47" roughness={0.9} />
          </mesh>
        </group>
      ))}

      {[
        [-7.5, 8],
        [7.5, 8.5],
        [0, -8.5],
        [8.5, -8],
        [-8.5, -6.5],
      ].map(([x, z], index) => (
        <group key={index} position={[x, 0, z]}>
          <mesh position={[0, 0.8, 0]} castShadow receiveShadow>
            <boxGeometry args={[2.7, 1.6, 2.8]} />
            <meshStandardMaterial color="#d9b989" roughness={0.96} />
          </mesh>
          <mesh position={[0, 2.2, 0]} castShadow>
            <cylinderGeometry args={[0.15, 0.15, 2.8, 8]} />
            <meshStandardMaterial color="#f0c76d" emissive="#f0c76d" emissiveIntensity={0.8} />
          </mesh>
        </group>
      ))}

      <mesh position={[0, 0.3, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[6.2, 6.8, 0.5, 28]} />
        <meshStandardMaterial color="#d2c3a0" roughness={0.95} />
      </mesh>
      {[-3, 0, 3].map((x) => (
        <mesh key={x} position={[x, 0.9, 0]} castShadow>
          <cylinderGeometry args={[0.38, 0.38, 2.2, 10]} />
          <meshStandardMaterial color="#f0c76d" emissive="#f0c76d" emissiveIntensity={0.4} />
        </mesh>
      ))}
    </group>
  );
}

function KingdomLighting() {
  return (
    <group>
      <ambientLight intensity={0.75} color="#dfe9ff" />
      <directionalLight color="#fff2d7" intensity={1.7} position={[28, 30, 18]} castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
      <directionalLight color="#7cd9ea" intensity={0.4} position={[-30, 18, -18]} />
      <pointLight color="#f0c76d" intensity={0.9} position={[0, 18, 0]} distance={80} />
    </group>
  );
}

function SelectedGlow({ selected, x, z }: { selected: boolean; x: number; z: number }) {
  if (!selected) return null;
  return (
    <group position={[x, 0.05, z]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <ringGeometry args={[3.8, 5.1, 48]} />
        <meshBasicMaterial color="#a3e635" transparent opacity={0.5} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

function BuildingMesh({
  b,
  selected,
  onSelect,
}: {
  b: Building;
  selected: boolean;
  onSelect: () => void;
}) {
  const [x, z] = b.position;
  const commonProps = {
    onClick: (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      onSelect();
    },
    castShadow: true,
    receiveShadow: true,
  };

  const body =
    b.type === "Royal Palace" ? (
      <RoyalCastle />
    ) : b.type === "Warrior Barracks" ? (
      <group position={[x, 0, z]}>
        <mesh {...commonProps} position={[0, 1.7, 0]}>
          <boxGeometry args={[5.5, 3.4, 4.5]} />
          <meshStandardMaterial color="#7e6043" roughness={0.9} />
        </mesh>
        <mesh {...commonProps} position={[0, 4.3, 0]}>
          <coneGeometry args={[3.1, 2.4, 6]} />
          <meshStandardMaterial color="#8f2a35" roughness={0.7} />
        </mesh>
      </group>
    ) : b.type === "Defense Towers" ? (
      <group position={[x, 0, z]}>
        <mesh {...commonProps} position={[0, 2.2, 0]}>
          <cylinderGeometry args={[1.8, 2.2, 4.4, 12]} />
          <meshStandardMaterial color="#8d95a0" roughness={0.8} />
        </mesh>
        <mesh {...commonProps} position={[0, 5.2, 0]}>
          <coneGeometry args={[2.2, 2.4, 12]} />
          <meshStandardMaterial color="#7a2c39" roughness={0.7} />
        </mesh>
      </group>
    ) : b.type === "Granary" ? (
      <group position={[x, 0, z]}>
        <mesh {...commonProps} position={[0, 1.6, 0]}>
          <cylinderGeometry args={[2.2, 2.8, 3.2, 12]} />
          <meshStandardMaterial color="#b9a67a" roughness={0.85} />
        </mesh>
        <mesh {...commonProps} position={[0, 3.8, 0]}>
          <coneGeometry args={[2.6, 2.8, 10]} />
          <meshStandardMaterial color="#8f5c39" roughness={0.8} />
        </mesh>
      </group>
    ) : b.type === "Training Yard" ? (
      <group position={[x, 0, z]}>
        <mesh {...commonProps} position={[0, 0.15, 0]}>
          <cylinderGeometry args={[3.7, 4.3, 0.3, 20]} />
          <meshStandardMaterial color="#4a4d52" roughness={1} />
        </mesh>
        {[-1.2, 0, 1.2].map((offset, idx) => (
          <mesh key={idx} {...commonProps} position={[offset, 0.35, 0]}>
            <cylinderGeometry args={[0.35, 0.35, 0.2, 12]} />
            <meshStandardMaterial color="#a3e635" emissive="#a3e635" emissiveIntensity={0.35} />
          </mesh>
        ))}
      </group>
    ) : b.type.toLowerCase().includes("mine") ? (
      <group position={[x, 0, z]}>
        <mesh {...commonProps} position={[0, 1.2, 0]}>
          <boxGeometry args={[4.8, 2.4, 4]} />
          <meshStandardMaterial color="#5c6168" roughness={0.9} />
        </mesh>
        <mesh {...commonProps} position={[1.6, 0.4, 2.1]}>
          <coneGeometry args={[0.7, 1.2, 10]} />
          <meshStandardMaterial color="#f0c76d" roughness={0.3} metalness={0.6} />
        </mesh>
      </group>
    ) : b.type.toLowerCase().includes("research") ? (
      <group position={[x, 0, z]}>
        <mesh {...commonProps} position={[0, 3.4, 0]}>
          <cylinderGeometry args={[1.6, 2.2, 6.8, 12]} />
          <meshStandardMaterial color="#6e7a85" roughness={0.8} />
        </mesh>
        <mesh {...commonProps} position={[0, 7.5, 0]}>
          <coneGeometry args={[2.4, 2.8, 12]} />
          <meshStandardMaterial color="#4478a1" roughness={0.65} />
        </mesh>
      </group>
    ) : b.type.toLowerCase().includes("housing") || b.type.toLowerCase().includes("house") ? (
      <group position={[x, 0, z]}>
        <mesh {...commonProps} position={[0, 1.5, 0]}>
          <boxGeometry args={[3, 3, 3]} />
          <meshStandardMaterial color="#c2baa6" roughness={0.92} />
        </mesh>
        <mesh {...commonProps} position={[0, 4.2, 0]}>
          <coneGeometry args={[2.2, 2.6, 4]} />
          <meshStandardMaterial color="#8c2d31" roughness={0.7} />
        </mesh>
      </group>
    ) : b.type.toLowerCase().includes("farm") ? (
      <group position={[x, 0, z]}>
        <mesh {...commonProps} position={[0, 0.2, 0]}>
          <boxGeometry args={[5.5, 0.3, 4.8]} />
          <meshStandardMaterial color="#7aa764" roughness={1} />
        </mesh>
      </group>
    ) : b.type.toLowerCase().includes("port") || b.type.toLowerCase().includes("harbor") ? (
      <group position={[x, 0, z]}>
        <mesh {...commonProps} position={[0, 0.8, 0]}>
          <boxGeometry args={[6.5, 1.6, 3.6]} />
          <meshStandardMaterial color="#6d4e39" roughness={0.9} />
        </mesh>
      </group>
    ) : b.type.toLowerCase().includes("road") ? (
      <group position={[x, 0, z]}>
        <mesh {...commonProps} position={[0, 0.2, 0]}>
          <boxGeometry args={[9, 0.25, 2.8]} />
          <meshStandardMaterial color="#3d3a3c" roughness={1} />
        </mesh>
      </group>
    ) : (
      <group position={[x, 0, z]}>
        <mesh {...commonProps} position={[0, 1.8, 0]}>
          <boxGeometry args={[3.2, 3.6, 3.2]} />
          <meshStandardMaterial color="#b6bec3" roughness={0.82} />
        </mesh>
        <mesh {...commonProps} position={[0, 4.4, 0]}>
          <coneGeometry args={[2.4, 2.2, 6]} />
          <meshStandardMaterial color="#7f2d35" roughness={0.72} />
        </mesh>
      </group>
    );

  return (
    <group position={[0, 0, 0]}>
      {body}
      <SelectedGlow selected={selected} x={x} z={z} />
      {selected && (
        <Html position={[x, 7.5, z]} center occlude distanceFactor={18}>
          <div className="whitespace-nowrap rounded-md border border-lime-400/60 bg-black/75 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-lime-300 shadow-lg">
            {b.type}
          </div>
        </Html>
      )}
    </group>
  );
}

function DemoKingdomLabel() {
  return (
    <Html position={[0, 18, 0]} center distanceFactor={18}>
      <div className="rounded-full border border-amber-300/60 bg-[#131a1f]/90 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.32em] text-amber-200 shadow-xl">
        DEMO KINGDOM
      </div>
    </Html>
  );
}

function CameraRig({
  controlsRef,
  reset,
  preset,
}: {
  controlsRef: RefObject<ComponentRef<typeof OrbitControls>>;
  reset: number;
  preset: "overview" | "castle" | "default";
}) {
  const { camera } = useThree();
  const [target, setTarget] = useState<{ pos: [number, number, number]; lookAt: [number, number, number] } | null>(null);

  const presets = useMemo<Record<"overview" | "castle" | "default", { pos: [number, number, number]; lookAt: [number, number, number] }>>(() => ({
    overview: { pos: [28, 27, 31], lookAt: [0, 2, 0] },
    castle: { pos: [16, 16, 15], lookAt: [0, 5, 0] },
    default: { pos: [32, 23, 34], lookAt: [0, 2, 0] },
  }), []);

  useEffect(() => {
    const next = presets[preset];
    if (!next) return;
    setTarget(next);
    if (controlsRef.current) {
      controlsRef.current.target.set(next.lookAt[0], next.lookAt[1], next.lookAt[2]);
      controlsRef.current.update();
    }
  }, [controlsRef, preset, presets, reset]);

  useFrame(() => {
    if (!target) return;
    camera.position.lerp(new THREE.Vector3(...target.pos), 0.08);
    camera.lookAt(new THREE.Vector3(...target.lookAt));
    if (camera.position.distanceTo(new THREE.Vector3(...target.pos)) < 0.3) {
      setTarget(null);
    }
  });

  return null;
}

export interface KingdomSceneProps {
  kingdom: {
    id: string;
    population: number;
    buildings: Building[];
  };
  isDemoPreview?: boolean;
  previewSeed?: number;
  selectedBuildingId: string | null;
  onSelectBuilding: (id: string) => void;
  resetSignal: number;
  cameraPreset?: "overview" | "castle" | "default";
}

export default function KingdomScene({
  kingdom,
  isDemoPreview = false,
  previewSeed = 0,
  selectedBuildingId,
  onSelectBuilding,
  resetSignal,
  cameraPreset = "overview",
}: KingdomSceneProps) {
  const controlsRef = useRef<ComponentRef<typeof OrbitControls>>(null);
  const size = 32;

  const visibleBuildings = isDemoPreview
    ? [
        { id: "demo-royal-castle", kingdomId: kingdom.id, type: "Royal Palace", category: "civil", level: 5, progress: 100, progressRequired: 100, position: [0, 0], description: "Royal fortification and ceremonial seat of the kingdom." },
        { id: "demo-barracks", kingdomId: kingdom.id, type: "Warrior Barracks", category: "military", level: 3, progress: 80, progressRequired: 100, position: [-16, 0], description: "Training and martial preparation for the royal guard." },
        { id: "demo-walls", kingdomId: kingdom.id, type: "Defense Towers", category: "defense", level: 4, progress: 100, progressRequired: 100, position: [14, -10], description: "Defensive towers guarding the western gate." },
        { id: "demo-granary", kingdomId: kingdom.id, type: "Granary", category: "civil", level: 2, progress: 60, progressRequired: 100, position: [16, 10], description: "Granary storing food reserves and trade goods." },
        { id: "demo-training", kingdomId: kingdom.id, type: "Training Yard", category: "training", level: 3, progress: 70, progressRequired: 100, position: [-18, 16], description: "Training grounds for drills and martial skill." },
        { id: "demo-research", kingdomId: kingdom.id, type: "Research Tower", category: "infrastructure", level: 4, progress: 100, progressRequired: 100, position: [21, -18], description: "Knowledge and observatory tower for strategic insight." },
        { id: "demo-housing", kingdomId: kingdom.id, type: "Housing Block", category: "civil", level: 3, progress: 80, progressRequired: 100, position: [-10, 14], description: "Residential district for guildsmen and artisans." },
        { id: "demo-farm", kingdomId: kingdom.id, type: "Farm District", category: "civil", level: 2, progress: 60, progressRequired: 100, position: [18, 18], description: "Fields supplying the kingdom's stores." },
      ] as Building[]
    : kingdom.buildings.length > 0
      ? kingdom.buildings
      : [
        { id: "demo-royal-castle", kingdomId: kingdom.id, type: "Royal Palace", category: "civil", level: 5, progress: 100, progressRequired: 100, position: [0, 0], description: "Royal fortification and ceremonial seat of the kingdom." },
        { id: "demo-barracks", kingdomId: kingdom.id, type: "Warrior Barracks", category: "military", level: 3, progress: 80, progressRequired: 100, position: [-16, 0], description: "Training and martial preparation for the royal guard." },
      ] as Building[];

  return (
    <Canvas
      shadows
      dpr={[1, 1.5]}
      camera={{ position: [32, 23, 34], fov: 42 }}
      onCreated={({ gl }) => {
        gl.setClearColor("#0d1418");
      }}
      className="h-full w-full rounded-[28px]"
    >
      <color attach="background" args={["#0b1218"]} />
      <fog attach="fog" args={["#0b1218", 58, 120]} />
      <Suspense fallback={null}>
        <KingdomLighting />
        <SkyDome />
        <group>
          <KingdomBase size={size} />
          <KingdomRoads />
          <KingdomWalls />
          <RoyalCastle />
          <ResidentialDistrict />
          <MilitaryDistrict />
          <FarmDistrict />
          <ResearchDistrict />
          <KingdomDecorations />
          {visibleBuildings.map((building) => (
            <BuildingMesh
              key={building.id}
              b={building}
              selected={selectedBuildingId === building.id}
              onSelect={() => onSelectBuilding(building.id)}
            />
          ))}
          {isDemoPreview && <DemoKingdomLabel />}
        </group>
      </Suspense>
      <OrbitControls
        ref={controlsRef}
        enablePan
        enableZoom
        maxPolarAngle={Math.PI / 2.2}
        minDistance={15}
        maxDistance={90}
        target={[0, 3, 0]}
      />
      <CameraRig controlsRef={controlsRef} reset={resetSignal} preset={cameraPreset} />
    </Canvas>
  );
}
