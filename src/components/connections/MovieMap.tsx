import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { MovieDetailsDialog } from "@/components/filmography/MovieDetailsDialog";
import { fetchSimilarMovies } from "@/lib/movieData";
import { tmdbImageUrl } from "@/lib/tmdb/image";
import type { TrendingMovie } from "@/types/movie";

// A force-directed take on movie-map.com/rec: instead of a static page of
// plain-text titles positioned by a precomputed embedding, this fetches
// TMDB's own "similar movies" ranking for whichever title is centered and
// lays it out live — closer to the center = higher in TMDB's similarity
// ranking. Clicking any node re-centers the map on it (the same "wander
// through the graph" navigation as the reference), with posters instead of
// text, animated settling instead of a hard page jump, pan/zoom, and a back
// button so you don't lose your place.

interface Node {
  readonly id: number;
  readonly title: string;
  readonly posterPath: string | null;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

const WIDTH = 800;
const HEIGHT = 520;
const CENTER_X = WIDTH / 2;
const CENTER_Y = HEIGHT / 2;
const MIN_EDGE_DIST = 90;
const EDGE_RANGE = 220; // rank 0 sits at MIN_EDGE_DIST, the last rank at MIN_EDGE_DIST + EDGE_RANGE
const REPULSION = 12000;
const DAMPING = 0.82;
const SETTLE_VELOCITY = 0.05;
const MAX_TICKS = 400;

function buildInitialNodes(
  center: TrendingMovie,
  similar: readonly TrendingMovie[],
): Node[] {
  const nodes: Node[] = [
    {
      id: center.tmdbMovieId,
      title: center.title,
      posterPath: center.posterPath,
      x: CENTER_X,
      y: CENTER_Y,
      vx: 0,
      vy: 0,
    },
  ];
  similar.forEach((movie, i) => {
    // Seed on a circle, ordered by rank, so the simulation starts close to
    // its resting shape instead of untangling from a random scatter.
    const angle = (i / similar.length) * Math.PI * 2;
    const radius =
      MIN_EDGE_DIST + (i / Math.max(1, similar.length - 1)) * EDGE_RANGE;
    nodes.push({
      id: movie.tmdbMovieId,
      title: movie.title,
      posterPath: movie.posterPath,
      x: CENTER_X + Math.cos(angle) * radius,
      y: CENTER_Y + Math.sin(angle) * radius,
      vx: 0,
      vy: 0,
    });
  });
  return nodes;
}

export function MovieMap() {
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<readonly TrendingMovie[]>(
    [],
  );
  const [center, setCenter] = useState<TrendingMovie | null>(null);
  const [history, setHistory] = useState<readonly TrendingMovie[]>([]);
  const [nodes, setNodes] = useState<readonly Node[]>([]);
  const [loading, setLoading] = useState(false);
  const [detailsMovieId, setDetailsMovieId] = useState<number | null>(null);
  const nodesRef = useRef<Node[]>([]);

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

  async function goTo(movie: TrendingMovie, pushHistory: boolean) {
    if (pushHistory && center) setHistory((h) => [...h, center]);
    setCenter(movie);
    setQuery("");
    setSearchResults([]);
    setLoading(true);
    const similar = await fetchSimilarMovies(movie.tmdbMovieId);
    nodesRef.current = buildInitialNodes(movie, similar);
    setNodes(nodesRef.current);
    setViewBox({ x: 0, y: 0, w: WIDTH, h: HEIGHT });
    setLoading(false);
  }

  function goBack() {
    const prev = history[history.length - 1];
    if (!prev) return;
    setHistory((h) => h.slice(0, -1));
    void goTo(prev, false);
  }

  // Force simulation: repel every pair, pull edges (center <-> each other
  // node) toward a target distance set by similarity rank, damp, and stop
  // once it settles instead of animating forever.
  useEffect(() => {
    if (nodes.length === 0) return;
    let tick = 0;
    let raf: number;

    function step() {
      const current = nodesRef.current;
      let maxSpeed = 0;

      for (let i = 0; i < current.length; i++) {
        const a = current[i];
        let fx = 0;
        let fy = 0;

        for (let j = 0; j < current.length; j++) {
          if (i === j) continue;
          const b = current[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const distSq = Math.max(dx * dx + dy * dy, 1);
          const force = REPULSION / distSq;
          const dist = Math.sqrt(distSq);
          fx += (dx / dist) * force;
          fy += (dy / dist) * force;
        }

        if (i > 0) {
          const target = current[0];
          const rank = i - 1;
          const targetDist =
            MIN_EDGE_DIST +
            (rank / Math.max(1, current.length - 2)) * EDGE_RANGE;
          const dx = target.x - a.x;
          const dy = target.y - a.y;
          const dist = Math.max(Math.hypot(dx, dy), 1);
          const pull = (dist - targetDist) * 0.02;
          fx += (dx / dist) * pull;
          fy += (dy / dist) * pull;
        }

        if (i === 0) {
          // Center node stays put — it's the thing everything else is
          // ranked against.
          a.vx = 0;
          a.vy = 0;
          continue;
        }

        a.vx = (a.vx + fx) * DAMPING;
        a.vy = (a.vy + fy) * DAMPING;
        a.x += a.vx;
        a.y += a.vy;
        maxSpeed = Math.max(maxSpeed, Math.abs(a.vx), Math.abs(a.vy));
      }

      setNodes([...current]);
      tick++;
      if (tick < MAX_TICKS && maxSpeed > SETTLE_VELOCITY) {
        raf = requestAnimationFrame(step);
      }
    }

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // Only re-run when the node *set* changes (a new center movie) — the
    // simulation owns positions via nodesRef from then on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center?.tmdbMovieId]);

  function handleWheel(e: React.WheelEvent<SVGSVGElement>) {
    e.preventDefault();
    const scale = e.deltaY > 0 ? 1.1 : 0.9;
    setViewBox((prev) => {
      const w = Math.min(Math.max(prev.w * scale, WIDTH * 0.3), WIDTH * 2.5);
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
    // clicking a node to re-center silently did nothing.
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

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {history.length > 0 && (
          <Button type="button" size="sm" variant="outline" onClick={goBack}>
            ← Back
          </Button>
        )}
        <div className="relative min-w-48 flex-1">
          <Input
            placeholder={
              center ? `Jump to another movie…` : "Search a movie to start…"
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
                  onClick={() => void goTo(movie, true)}
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
        {center && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setDetailsMovieId(center.tmdbMovieId)}
          >
            View {center.title}
          </Button>
        )}
      </div>

      {!center && !loading && (
        <p className="text-sm text-muted-foreground">
          Search a movie above to map out what's similar to it — click any
          result on the map to re-center and keep exploring.
        </p>
      )}

      {loading && nodes.length === 0 && (
        <Skeleton className="h-[400px] w-full rounded-lg" />
      )}

      {center && nodes.length > 0 && (
        <svg
          viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
          className="h-[400px] w-full touch-none rounded-lg border bg-muted/20"
          onWheel={handleWheel}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        >
          {nodes.slice(1).map((node) => (
            <line
              key={`edge-${node.id}`}
              x1={nodes[0].x}
              y1={nodes[0].y}
              x2={node.x}
              y2={node.y}
              stroke="currentColor"
              className="text-muted-foreground/25"
              strokeWidth={1}
            />
          ))}
          <defs>
            {nodes.map((node, i) => {
              const size = i === 0 ? 56 : 40;
              const h = size * 1.5;
              return (
                <clipPath key={`clip-${node.id}`} id={`poster-clip-${node.id}`}>
                  <rect width={size} height={h} y={-((h - size) / 2)} rx={6} />
                </clipPath>
              );
            })}
          </defs>
          {nodes.map((node, i) => {
            const isCenter = i === 0;
            const size = isCenter ? 56 : 40;
            const h = size * 1.5;
            const posterY = -((h - size) / 2);
            return (
              <g
                key={node.id}
                transform={`translate(${node.x - size / 2}, ${node.y - size / 2})`}
                className="cursor-pointer"
                onClick={() => {
                  if (isCenter) return;
                  const movie: TrendingMovie = {
                    tmdbMovieId: node.id,
                    title: node.title,
                    posterPath: node.posterPath,
                    releaseYear: null,
                    voteAverage: null,
                    genreIds: [],
                  };
                  void goTo(movie, true);
                }}
              >
                {isCenter && (
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
              </g>
            );
          })}
        </svg>
      )}

      {center && (
        <p className="text-xs text-muted-foreground">
          Scroll to zoom, drag to pan. Closer to{" "}
          <span className="font-medium">{center.title}</span> means more
          similar, per TMDB.
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
