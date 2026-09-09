import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { MovieDetailsDialog } from "@/components/filmography/MovieDetailsDialog";
import { InfoIcon } from "lucide-react";
import { fetchSimilarMovies } from "@/lib/movieData";
import { tmdbImageUrl } from "@/lib/tmdb/image";
import type { TrendingMovie } from "@/types/movie";

// A force-directed take on movie-map.com/rec: instead of a static page of
// plain-text titles positioned by a precomputed embedding, this fetches
// TMDB's own "similar movies" ranking live. Unlike the reference (and an
// earlier version of this component), clicking a related movie doesn't
// replace the map — it *expands* it: that movie becomes its own hub with
// its own ring of similar titles, added onto the existing graph, so you can
// click your way several movies deep without losing where you came from.

interface Node {
  readonly id: number;
  readonly title: string;
  readonly posterPath: string | null;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

interface Edge {
  readonly a: number;
  readonly b: number;
  readonly targetDist: number;
}

const WIDTH = 800;
const HEIGHT = 520;
const CENTER_X = WIDTH / 2;
const CENTER_Y = HEIGHT / 2;
const MIN_EDGE_DIST = 80;
const EDGE_RANGE = 160; // rank 0 sits at MIN_EDGE_DIST, the last rank at MIN_EDGE_DIST + EDGE_RANGE
const REPULSION = 9000;
const DAMPING = 0.82;
const GRAVITY = 0.001; // weak pull toward canvas center so the graph doesn't drift off-screen as it grows
const SETTLE_VELOCITY = 0.05;
const MAX_TICKS_PER_EXPANSION = 300;
const MAX_NODES = 80; // keeps the O(n^2) repulsion pass and the SVG cheap as the map grows

function targetDistFor(rank: number, count: number): number {
  return MIN_EDGE_DIST + (rank / Math.max(1, count - 1)) * EDGE_RANGE;
}

export function MovieMap() {
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<readonly TrendingMovie[]>(
    [],
  );
  const [nodes, setNodes] = useState<readonly Node[]>([]);
  const [edges, setEdges] = useState<readonly Edge[]>([]);
  const [focusedId, setFocusedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [detailsMovieId, setDetailsMovieId] = useState<number | null>(null);

  const nodesRef = useRef<Node[]>([]);
  const edgesRef = useRef<Edge[]>([]);
  const expandedRef = useRef<Set<number>>(new Set());
  const [simGeneration, setSimGeneration] = useState(0);

  const [viewBox, setViewBox] = useState({ x: 0, y: 0, w: WIDTH, h: HEIGHT });
  const panRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    startBox: { x: number; y: number };
  } | null>(null);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setSearchResults([]);
      return;
    }
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/search-movie?q=${encodeURIComponent(trimmed)}`,
        );
        if (!res.ok) throw new Error("request failed");
        const data = (await res.json()) as {
          results: readonly TrendingMovie[];
        };
        setSearchResults(data.results.slice(0, 8));
      } catch {
        setSearchResults([]);
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [query]);

  function focusOn(id: number, x: number, y: number) {
    setFocusedId(id);
    setViewBox((prev) => {
      const w = Math.max(prev.w * 0.85, WIDTH * 0.3);
      const h = w * (HEIGHT / WIDTH);
      return { x: x - w / 2, y: y - h / 2, w, h };
    });
  }

  // Expands the graph from `id` (already present as a node) with its
  // similar movies — new nodes/edges are added on top of whatever's already
  // there, never replacing it. Re-clicking an already-expanded node just
  // refocuses the view on it instead of re-fetching.
  async function expand(id: number) {
    const originNode = nodesRef.current.find((n) => n.id === id);
    if (originNode) focusOn(id, originNode.x, originNode.y);

    if (expandedRef.current.has(id)) return;
    expandedRef.current.add(id);

    if (nodesRef.current.length >= MAX_NODES) return;

    setLoading(true);
    const similar = await fetchSimilarMovies(id);
    setLoading(false);

    const origin = nodesRef.current.find((n) => n.id === id);
    if (!origin) return; // shouldn't happen, but don't crash the map over it

    let added = false;
    similar.forEach((movie, i) => {
      const dist = targetDistFor(i, similar.length);
      let node = nodesRef.current.find((n) => n.id === movie.tmdbMovieId);
      if (!node) {
        if (nodesRef.current.length >= MAX_NODES) return;
        const angle = Math.random() * Math.PI * 2;
        node = {
          id: movie.tmdbMovieId,
          title: movie.title,
          posterPath: movie.posterPath,
          x: origin.x + Math.cos(angle) * dist,
          y: origin.y + Math.sin(angle) * dist,
          vx: 0,
          vy: 0,
        };
        nodesRef.current.push(node);
      }
      const edgeExists = edgesRef.current.some(
        (e) =>
          (e.a === id && e.b === node!.id) || (e.a === node!.id && e.b === id),
      );
      if (!edgeExists) {
        edgesRef.current.push({ a: id, b: node.id, targetDist: dist });
      }
      added = true;
    });

    if (added) {
      setNodes([...nodesRef.current]);
      setEdges([...edgesRef.current]);
      setSimGeneration((g) => g + 1);
    }
  }

  async function startFrom(movie: TrendingMovie) {
    setQuery("");
    setSearchResults([]);
    const alreadyThere = nodesRef.current.some(
      (n) => n.id === movie.tmdbMovieId,
    );
    if (!alreadyThere) {
      nodesRef.current.push({
        id: movie.tmdbMovieId,
        title: movie.title,
        posterPath: movie.posterPath,
        x:
          nodesRef.current.length === 0
            ? CENTER_X
            : CENTER_X + (Math.random() - 0.5) * 60,
        y:
          nodesRef.current.length === 0
            ? CENTER_Y
            : CENTER_Y + (Math.random() - 0.5) * 60,
        vx: 0,
        vy: 0,
      });
      setNodes([...nodesRef.current]);
    }
    await expand(movie.tmdbMovieId);
  }

  function resetMap() {
    nodesRef.current = [];
    edgesRef.current = [];
    expandedRef.current = new Set();
    setNodes([]);
    setEdges([]);
    setFocusedId(null);
    setViewBox({ x: 0, y: 0, w: WIDTH, h: HEIGHT });
  }

  // Force simulation: repel every node pair, pull each edge toward its
  // target distance (closer = more similar, per whichever hub added it), a
  // weak centering gravity so the graph doesn't wander off, damp, and stop
  // once it settles rather than animating forever. Re-runs (without
  // resetting existing positions) whenever expand() adds nodes/edges.
  useEffect(() => {
    if (nodesRef.current.length === 0) return;
    let tick = 0;
    let raf: number;

    function step() {
      const current = nodesRef.current;
      const currentEdges = edgesRef.current;
      const byId = new Map(current.map((n) => [n.id, n]));
      const fx = new Map<number, number>(current.map((n) => [n.id, 0]));
      const fy = new Map<number, number>(current.map((n) => [n.id, 0]));

      for (let i = 0; i < current.length; i++) {
        for (let j = i + 1; j < current.length; j++) {
          const a = current[i];
          const b = current[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const distSq = Math.max(dx * dx + dy * dy, 1);
          const force = REPULSION / distSq;
          const dist = Math.sqrt(distSq);
          const fxv = (dx / dist) * force;
          const fyv = (dy / dist) * force;
          fx.set(a.id, fx.get(a.id)! + fxv);
          fy.set(a.id, fy.get(a.id)! + fyv);
          fx.set(b.id, fx.get(b.id)! - fxv);
          fy.set(b.id, fy.get(b.id)! - fyv);
        }
      }

      for (const edge of currentEdges) {
        const a = byId.get(edge.a);
        const b = byId.get(edge.b);
        if (!a || !b) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.max(Math.hypot(dx, dy), 1);
        const pull = (dist - edge.targetDist) * 0.02;
        const fxv = (dx / dist) * pull;
        const fyv = (dy / dist) * pull;
        fx.set(a.id, fx.get(a.id)! + fxv);
        fy.set(a.id, fy.get(a.id)! + fyv);
        fx.set(b.id, fx.get(b.id)! - fxv);
        fy.set(b.id, fy.get(b.id)! - fyv);
      }

      let maxSpeed = 0;
      for (const n of current) {
        const gx = (CENTER_X - n.x) * GRAVITY;
        const gy = (CENTER_Y - n.y) * GRAVITY;
        n.vx = (n.vx + fx.get(n.id)! + gx) * DAMPING;
        n.vy = (n.vy + fy.get(n.id)! + gy) * DAMPING;
        n.x += n.vx;
        n.y += n.vy;
        maxSpeed = Math.max(maxSpeed, Math.abs(n.vx), Math.abs(n.vy));
      }

      setNodes([...current]);
      tick++;
      if (tick < MAX_TICKS_PER_EXPANSION && maxSpeed > SETTLE_VELOCITY) {
        raf = requestAnimationFrame(step);
      }
    }

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [simGeneration]);

  function handleWheel(e: React.WheelEvent<SVGSVGElement>) {
    e.preventDefault();
    const scale = e.deltaY > 0 ? 1.1 : 0.9;
    setViewBox((prev) => {
      const w = Math.min(Math.max(prev.w * scale, WIDTH * 0.25), WIDTH * 3);
      const h = w * (HEIGHT / WIDTH);
      return {
        x: prev.x + (prev.w - w) / 2,
        y: prev.y + (prev.h - h) / 2,
        w,
        h,
      };
    });
  }

  function handlePointerDown(e: React.PointerEvent<SVGSVGElement>) {
    // Only start panning when the gesture begins on the empty background —
    // capturing the pointer here for a press that started on a node would
    // redirect that node's own pointerup/click to the <svg> instead, so
    // clicking a node to expand/focus silently did nothing.
    if (e.target !== e.currentTarget) return;
    panRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      startBox: { x: viewBox.x, y: viewBox.y },
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: React.PointerEvent<SVGSVGElement>) {
    const pan = panRef.current;
    if (!pan || pan.pointerId !== e.pointerId) return;
    const scale = viewBox.w / e.currentTarget.clientWidth;
    setViewBox((prev) => ({
      ...prev,
      x: pan.startBox.x - (e.clientX - pan.startX) * scale,
      y: pan.startBox.y - (e.clientY - pan.startY) * scale,
    }));
  }

  function handlePointerUp(e: React.PointerEvent<SVGSVGElement>) {
    if (panRef.current?.pointerId === e.pointerId) panRef.current = null;
  }

  const focusedNode = nodes.find((n) => n.id === focusedId) ?? null;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {nodes.length > 0 && (
          <Button type="button" size="sm" variant="outline" onClick={resetMap}>
            Reset map
          </Button>
        )}
        <div className="relative min-w-48 flex-1">
          <Input
            placeholder={
              nodes.length > 0
                ? "Add another movie…"
                : "Search a movie to start…"
            }
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {searchResults.length > 0 && (
            <div className="absolute top-full left-0 z-10 mt-1 w-full space-y-1 rounded-lg border bg-popover p-1 shadow-lg">
              {searchResults.map((movie) => (
                <button
                  key={movie.tmdbMovieId}
                  type="button"
                  onClick={() => void startFrom(movie)}
                  className="focus-ring block w-full truncate rounded px-2 py-1.5 text-left text-sm hover:bg-accent"
                >
                  {movie.title}
                  {movie.releaseYear && (
                    <span className="text-muted-foreground">
                      {" "}
                      ({movie.releaseYear})
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
        {focusedNode && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setDetailsMovieId(focusedNode.id)}
          >
            View {focusedNode.title}
          </Button>
        )}
      </div>

      {nodes.length === 0 && !loading && (
        <p className="text-sm text-muted-foreground">
          Search a movie above to map out what's similar to it. Click any result
          on the map to pull in its own similar movies too — the map keeps
          growing, nothing gets replaced.
        </p>
      )}

      {loading && nodes.length === 0 && (
        <Skeleton className="h-[400px] w-full rounded-lg" />
      )}

      {nodes.length > 0 && (
        <svg
          viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
          className="h-[400px] w-full touch-none rounded-lg border bg-muted/20"
          onWheel={handleWheel}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        >
          {edges.map((edge) => {
            const a = nodes.find((n) => n.id === edge.a);
            const b = nodes.find((n) => n.id === edge.b);
            if (!a || !b) return null;
            return (
              <line
                key={`${edge.a}-${edge.b}`}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke="currentColor"
                className="text-muted-foreground/25"
                strokeWidth={1}
              />
            );
          })}
          <defs>
            {nodes.map((node) => {
              const size = node.id === focusedId ? 56 : 40;
              const h = size * 1.5;
              return (
                <clipPath key={`clip-${node.id}`} id={`poster-clip-${node.id}`}>
                  <rect width={size} height={h} y={-((h - size) / 2)} rx={6} />
                </clipPath>
              );
            })}
          </defs>
          {nodes.map((node) => {
            const isFocused = node.id === focusedId;
            const isExpanded = expandedRef.current.has(node.id);
            const size = isFocused ? 56 : 40;
            const h = size * 1.5;
            const posterY = -((h - size) / 2);
            return (
              <g
                key={node.id}
                transform={`translate(${node.x - size / 2}, ${node.y - size / 2})`}
                className="cursor-pointer"
                onClick={() => void expand(node.id)}
              >
                {isFocused && (
                  <rect
                    width={size + 4}
                    height={h + 4}
                    x={-2}
                    y={posterY - 2}
                    rx={8}
                    className="fill-none stroke-foreground"
                    strokeWidth={2}
                  />
                )}
                {node.posterPath ? (
                  <image
                    href={tmdbImageUrl(node.posterPath, 92)}
                    width={size}
                    height={h}
                    y={posterY}
                    preserveAspectRatio="xMidYMid slice"
                    clipPath={`url(#poster-clip-${node.id})`}
                    opacity={isExpanded ? 1 : 0.85}
                  />
                ) : (
                  <rect
                    width={size}
                    height={h}
                    y={posterY}
                    rx={6}
                    className="fill-muted"
                  />
                )}
                <title>{node.title}</title>

                {/* Clicking a poster expands the map from it — this is the
                    only way to peek at cast/ratings/watchlist for a node
                    you don't want to expand (yet). stopPropagation keeps
                    the click from also triggering the parent <g>'s expand. */}
                <foreignObject
                  x={size - 18}
                  y={posterY - 4}
                  width={22}
                  height={22}
                  className="overflow-visible"
                >
                  <button
                    type="button"
                    aria-label={`View details for ${node.title}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setDetailsMovieId(node.id);
                    }}
                    className="focus-ring flex size-[22px] items-center justify-center rounded-full border bg-background text-foreground shadow"
                  >
                    <InfoIcon className="size-3" />
                  </button>
                </foreignObject>
              </g>
            );
          })}
        </svg>
      )}

      {nodes.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Scroll to zoom, drag to pan. Click a poster to pull in what's similar
          to it — the highlighted one is your current focus.
          {nodes.length >= MAX_NODES && " Map is at its size limit."}
        </p>
      )}

      {detailsMovieId !== null && (
        <MovieDetailsDialog
          movieId={detailsMovieId}
          open={detailsMovieId !== null}
          onOpenChange={(open) => !open && setDetailsMovieId(null)}
        />
      )}
    </div>
  );
}
