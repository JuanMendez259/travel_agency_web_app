import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "@/shared/lib/cn";
import type { GalleryImage } from "@/shared/lib/trip-gallery";

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.5;

type Offset = { x: number; y: number };
type Point = { x: number; y: number };
type DragState = {
  pointerId: number;
  startX: number;
  startY: number;
  originX: number;
  originY: number;
};
type PinchState = { distance: number; zoom: number };

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function distanceBetween(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function clampOffset(offset: Offset, zoom: number, stage: HTMLDivElement | null): Offset {
  if (zoom <= MIN_ZOOM || !stage) return { x: 0, y: 0 };
  const rect = stage.getBoundingClientRect();
  const maxX = (rect.width * (zoom - MIN_ZOOM)) / 2;
  const maxY = (rect.height * (zoom - MIN_ZOOM)) / 2;
  return {
    x: clamp(offset.x, -maxX, maxX),
    y: clamp(offset.y, -maxY, maxY),
  };
}

function safeIndex(index: number, length: number) {
  if (length <= 0) return 0;
  return clamp(index, 0, length - 1);
}

export function ImageLightbox({
  images,
  initialIndex = 0,
  alt,
  onClose,
}: {
  images: GalleryImage[];
  initialIndex?: number;
  alt: string;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(() => safeIndex(initialIndex, images.length));
  const [zoom, setZoom] = useState(MIN_ZOOM);
  const [offset, setOffset] = useState<Offset>({ x: 0, y: 0 });
  const stageRef = useRef<HTMLDivElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const pointersRef = useRef<Map<number, Point>>(new Map());
  const dragRef = useRef<DragState | null>(null);
  const pinchRef = useRef<PinchState | null>(null);
  const movedRef = useRef(false);

  const hasMultiple = images.length > 1;
  const currentImage = images[index] ?? images[0];

  const resetView = () => {
    setZoom(MIN_ZOOM);
    setOffset({ x: 0, y: 0 });
  };

  const applyZoom = (next: number) => {
    const nextZoom = clamp(next, MIN_ZOOM, MAX_ZOOM);
    setZoom(nextZoom);
    setOffset((current) => clampOffset(current, nextZoom, stageRef.current));
  };

  const goTo = (delta: number) => {
    if (!hasMultiple) return;
    setIndex((current) => (current + delta + images.length) % images.length);
    resetView();
  };

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusTimer = window.setTimeout(() => closeRef.current?.focus(), 20);
    return () => {
      window.clearTimeout(focusTimer);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus?.();
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        goTo(-1);
        return;
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        goTo(1);
        return;
      }
      if (event.key === "+" || event.key === "=") {
        event.preventDefault();
        applyZoom(zoom + ZOOM_STEP);
        return;
      }
      if (event.key === "-") {
        event.preventDefault();
        applyZoom(zoom - ZOOM_STEP);
        return;
      }
      if (event.key === "0") {
        event.preventDefault();
        resetView();
        return;
      }
      if (event.key !== "Tab") return;
      const focusables = Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      );
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [zoom, hasMultiple, images.length]);

  if (!currentImage) return null;

  const imageAlt = hasMultiple ? `${alt} (${index + 1} de ${images.length})` : alt;

  const handleWheel = (event: ReactWheelEvent<HTMLDivElement>) => {
    if (event.deltaY === 0) return;
    event.stopPropagation();
    applyZoom(zoom + (event.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP));
  };

  const handleStageClick = (event: ReactMouseEvent<HTMLDivElement>) => {
    const shouldClose = event.target === event.currentTarget && !movedRef.current;
    movedRef.current = false;
    if (shouldClose) onCloseRef.current();
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    movedRef.current = false;

    if (pointersRef.current.size === 2) {
      const [a, b] = Array.from(pointersRef.current.values());
      pinchRef.current = { distance: distanceBetween(a, b), zoom };
      dragRef.current = null;
      return;
    }

    if (pointersRef.current.size === 1 && zoom > MIN_ZOOM) {
      dragRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        originX: offset.x,
        originY: offset.y,
      };
    }
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!pointersRef.current.has(event.pointerId)) return;
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (pointersRef.current.size >= 2 && pinchRef.current) {
      const [a, b] = Array.from(pointersRef.current.values());
      const currentDistance = distanceBetween(a, b);
      if (pinchRef.current.distance > 0) {
        const nextZoom = clamp(
          pinchRef.current.zoom * (currentDistance / pinchRef.current.distance),
          MIN_ZOOM,
          MAX_ZOOM,
        );
        if (nextZoom !== zoom) {
          movedRef.current = true;
          setZoom(nextZoom);
          setOffset((current) => clampOffset(current, nextZoom, stageRef.current));
        }
      }
      return;
    }

    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) movedRef.current = true;
    setOffset(
      clampOffset(
        { x: drag.originX + dx, y: drag.originY + dy },
        zoom,
        stageRef.current,
      ),
    );
  };

  const handlePointerEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
    pointersRef.current.delete(event.pointerId);
    if (pointersRef.current.size < 2) pinchRef.current = null;
    if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null;
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex flex-col bg-slate/95 text-white backdrop-blur-sm">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Visor de imágenes"
        className="flex min-h-0 flex-1 flex-col"
      >
        <header className="flex items-center justify-between gap-3 px-3 py-3 sm:px-6">
          <p className="truncate text-label-md text-white/75">Imágenes de {alt}</p>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span
              aria-live="polite"
              className="min-w-14 text-center text-label-md text-white/85"
            >
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              aria-label="Alejar"
              disabled={zoom <= MIN_ZOOM}
              onClick={() => applyZoom(zoom - ZOOM_STEP)}
              className="grid size-10 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ZoomOut className="size-5" />
            </button>
            <button
              type="button"
              aria-label="Restablecer zoom"
              onClick={resetView}
              className="grid size-10 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
            >
              <Maximize2 className="size-5" />
            </button>
            <button
              type="button"
              aria-label="Acercar"
              disabled={zoom >= MAX_ZOOM}
              onClick={() => applyZoom(zoom + ZOOM_STEP)}
              className="grid size-10 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ZoomIn className="size-5" />
            </button>
            <button
              ref={closeRef}
              type="button"
              aria-label="Cerrar visor"
              onClick={onClose}
              className="grid size-10 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
            >
              <X className="size-5" />
            </button>
          </div>
        </header>

        <div className="relative flex min-h-0 flex-1 items-center justify-center px-2 pb-4 sm:px-14">
          <div
            ref={stageRef}
            data-testid="lightbox-stage"
            className="relative flex size-full touch-none items-center justify-center overflow-hidden select-none"
            onClick={handleStageClick}
            onWheel={handleWheel}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerEnd}
            onPointerCancel={handlePointerEnd}
          >
            <img
              src={currentImage.url}
              alt={imageAlt}
              draggable={false}
              style={{
                transform: `translate3d(${offset.x}px, ${offset.y}px, 0) scale(${zoom})`,
              }}
              className={cn(
                "max-h-full max-w-full object-contain will-change-transform",
                zoom > MIN_ZOOM ? "cursor-grab active:cursor-grabbing" : "cursor-zoom-in",
              )}
            />
          </div>

          {hasMultiple ? (
            <>
              <button
                type="button"
                aria-label="Imagen anterior"
                onClick={() => goTo(-1)}
                className="absolute top-1/2 left-1 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20 sm:left-3 sm:size-12"
              >
                <ChevronLeft className="size-6" />
              </button>
              <button
                type="button"
                aria-label="Imagen siguiente"
                onClick={() => goTo(1)}
                className="absolute top-1/2 right-1 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20 sm:right-3 sm:size-12"
              >
                <ChevronRight className="size-6" />
              </button>
            </>
          ) : null}

          <span className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/55 px-3 py-1 text-label-sm">
            {index + 1} / {images.length}
          </span>
        </div>
      </div>
    </div>,
    document.body,
  );
}
