import { useEffect, useRef } from "react";
import * as THREE from "three";
import { tmdbImageUrl } from "@/lib/tmdb/image";
import type { FollowedPerson } from "@/types/filmography";

const MAX_ORBITERS = 8;
const TILT = -0.45; // radians — gives the classic tilted-ellipse "solar system" look
const FACE_RADIUS = 40;
const BASE_RADIUS = 95;
const RADIUS_STEP = 90; // wide enough that neighboring faces (2x FACE_RADIUS) don't overlap

interface OrbitSceneProps {
  readonly people: readonly FollowedPerson[];
}

interface Orbiter {
  readonly mesh: THREE.Mesh;
  readonly radius: number;
  readonly angle: number;
  readonly speed: number;
  readonly personId: number;
}

export function OrbitScene({ people }: OrbitSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const orbiterPeople = people
    .filter((p) => p.profilePath !== null)
    .slice(0, MAX_ORBITERS);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || orbiterPeople.length === 0) return;

    const isDark = document.documentElement.classList.contains("dark");
    const lineColor = isDark ? 0x444444 : 0xdddddd;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 1000);
    camera.position.set(0, 0, 420);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    const group = new THREE.Group();
    group.rotation.x = TILT;
    scene.add(group);

    const loader = new THREE.TextureLoader();
    loader.crossOrigin = "anonymous";

    const orbiters: Orbiter[] = orbiterPeople.map((person, i) => {
      const radius = BASE_RADIUS + i * RADIUS_STEP;

      const ring = new THREE.Mesh(
        new THREE.RingGeometry(radius - 0.4, radius + 0.4, 64),
        new THREE.MeshBasicMaterial({
          color: lineColor,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.6,
        }),
      );
      group.add(ring);

      const faceMaterial = new THREE.MeshBasicMaterial({ color: 0xcccccc });
      const face = new THREE.Mesh(
        new THREE.CircleGeometry(FACE_RADIUS, 32),
        faceMaterial,
      );
      group.add(face);

      loader.load(tmdbImageUrl(person.profilePath!, 185), (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        faceMaterial.map = texture;
        faceMaterial.color.set(0xffffff);
        faceMaterial.needsUpdate = true;
      });

      return {
        mesh: face,
        radius,
        angle: (i * Math.PI * 2) / orbiterPeople.length,
        // Farther orbits move slower — a nod to Kepler, not literal physics.
        speed: 0.5 / Math.sqrt(radius),
        personId: person.tmdbId,
      };
    });

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const faceMeshes = orbiters.map((o) => o.mesh);

    function orbiterAt(event: MouseEvent): Orbiter | undefined {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObjects(faceMeshes)[0];
      return hit ? orbiters.find((o) => o.mesh === hit.object) : undefined;
    }

    function handleClick(event: MouseEvent) {
      const orbiter = orbiterAt(event);
      if (orbiter) window.location.href = `/person/${orbiter.personId}`;
    }

    function handlePointerMove(event: MouseEvent) {
      renderer.domElement.style.cursor = orbiterAt(event)
        ? "pointer"
        : "default";
    }

    renderer.domElement.addEventListener("click", handleClick);
    renderer.domElement.addEventListener("pointermove", handlePointerMove);

    function resize() {
      if (!container) return;
      const { width, height } = container.getBoundingClientRect();
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    }
    resize();
    window.addEventListener("resize", resize);

    let frameId: number;
    function animate(time: number) {
      const t = time * 0.001;
      for (const orbiter of orbiters) {
        const angle = orbiter.angle + t * orbiter.speed;
        orbiter.mesh.position.set(
          Math.cos(angle) * orbiter.radius,
          0,
          Math.sin(angle) * orbiter.radius,
        );
      }
      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    }
    frameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", resize);
      renderer.domElement.removeEventListener("click", handleClick);
      renderer.domElement.removeEventListener("pointermove", handlePointerMove);
      renderer.dispose();
      scene.traverse((obj) => {
        if (!(obj instanceof THREE.Mesh)) return;
        obj.geometry.dispose();
        const material = obj.material;
        if (Array.isArray(material)) material.forEach((m) => m.dispose());
        else material.dispose();
      });
      container.removeChild(renderer.domElement);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `orbiterPeople` is recomputed from `people` every render; the effect only needs to re-run when `people` itself changes identity.
  }, [people]);

  if (orbiterPeople.length === 0) return null;

  return <div ref={containerRef} className="h-80 w-full sm:h-96" />;
}
