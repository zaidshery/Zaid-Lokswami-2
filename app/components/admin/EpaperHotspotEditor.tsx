'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Circle,
  Loader2,
  Minus,
  Plus,
  Trash2,
} from 'lucide-react';
import { isPdfAsset } from '@/lib/constants/epaperCities';
import { type EPaperArticleHotspot } from '@/lib/utils/epaperHotspots';
import { renderPdfPagePreviewFromUrl } from '@/lib/utils/pdfThumbnailClient';

export type EditableArticleHotspot = EPaperArticleHotspot;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function resolvePageLimit(value: number) {
  if (!Number.isFinite(value) || value < 1) return 1;
  return Math.floor(value);
}

function createHotspot(index: number, page: number): EditableArticleHotspot {
  const random = Math.random().toString(36).slice(2, 7);
  return {
    id: `hs-${Date.now()}-${index}-${random}`,
    title: '',
    text: '',
    page,
    x: 5,
    y: 5,
    width: 40,
    height: 20,
  };
}

function toPercent(value: number) {
  return clamp(value, 0, 100);
}

function normalizeBox(
  h: EditableArticleHotspot,
  maxPages: number
): EditableArticleHotspot {
  let x = clamp(Number.isFinite(h.x) ? h.x : 0, 0, 100);
  let y = clamp(Number.isFinite(h.y) ? h.y : 0, 0, 100);
  let width = clamp(Number.isFinite(h.width) ? h.width : 20, 0.1, 100);
  let height = clamp(Number.isFinite(h.height) ? h.height : 20, 0.1, 100);
  const page = clamp(
    Number.isFinite(h.page) ? Math.round(h.page) : 1,
    1,
    maxPages
  );

  if (x + width > 100) width = Math.max(0.1, 100 - x);
  if (y + height > 100) height = Math.max(0.1, 100 - y);

  if (width <= 0.1) {
    width = 0.1;
    x = Math.min(x, 99.9);
  }
  if (height <= 0.1) {
    height = 0.1;
    y = Math.min(y, 99.9);
  }

  return {
    ...h,
    page,
    x: Number(x.toFixed(3)),
    y: Number(y.toFixed(3)),
    width: Number(width.toFixed(3)),
    height: Number(height.toFixed(3)),
  };
}

type PageQaStatus = 'missing' | 'review' | 'ready';

function getHotspotConfidence(hotspot: EditableArticleHotspot) {
  let score = 100;
  const area = hotspot.width * hotspot.height;

  if (!hotspot.title.trim()) score -= 18;
  if (area < 3) score -= 40;
  else if (area < 7) score -= 24;
  else if (area < 12) score -= 12;
  if (hotspot.width < 1.2 || hotspot.height < 1.2) score -= 18;
  if (
    hotspot.x < 1 ||
    hotspot.y < 1 ||
    hotspot.x + hotspot.width > 99 ||
    hotspot.y + hotspot.height > 99
  ) {
    score -= 8;
  }

  return Math.round(clamp(score, 5, 99));
}

function resolvePageQaStatus(pageHotspots: EditableArticleHotspot[]): PageQaStatus {
  if (!pageHotspots.length) return 'missing';
  const needsReview = pageHotspots.some((hotspot) => {
    const confidence = getHotspotConfidence(hotspot);
    return confidence < 60;
  });
  return needsReview ? 'review' : 'ready';
}

interface EpaperHotspotEditorProps {
  thumbnail: string;
  pdfUrl: string;
  totalPages: number;
  hotspots: EditableArticleHotspot[];
  onChange: (hotspots: EditableArticleHotspot[]) => void;
}

export default function EpaperHotspotEditor({
  thumbnail,
  pdfUrl,
  totalPages,
  hotspots,
  onChange,
}: EpaperHotspotEditorProps) {
  const configuredPages = resolvePageLimit(totalPages);
  const [detectedPdfPages, setDetectedPdfPages] = useState(1);
  const maxPages = Math.max(configuredPages, detectedPdfPages);

  const [activePage, setActivePage] = useState(1);
  const [previewSrc, setPreviewSrc] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState('');
  const previewRef = useRef<HTMLDivElement | null>(null);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number; pointerId: number } | null>(null);
  const [drawCurrent, setDrawCurrent] = useState<{ x: number; y: number } | null>(null);
  const [movingHotspot, setMovingHotspot] = useState<{
    id: string;
    pointerId: number;
    startClientX: number;
    startClientY: number;
    originX: number;
    originY: number;
    width: number;
    height: number;
    rectWidth: number;
    rectHeight: number;
  } | null>(null);

  const isPdfPreview = Boolean(pdfUrl.trim() && isPdfAsset(pdfUrl));

  useEffect(() => {
    if (activePage > maxPages) {
      setActivePage(maxPages);
    }
  }, [activePage, maxPages]);

  useEffect(() => {
    let canceled = false;

    const loadPreview = async () => {
      setPreviewError('');
      if (isPdfPreview) {
        setPreviewLoading(true);
        try {
          const rendered = await renderPdfPagePreviewFromUrl(pdfUrl, {
            page: activePage,
            targetWidth: 1300,
          });
          if (canceled) return;
          setDetectedPdfPages(rendered.pageCount);
          setPreviewSrc(rendered.dataUrl);
        } catch (error: unknown) {
          if (canceled) return;
          setPreviewSrc('');
          setPreviewError(
            error instanceof Error ? error.message : 'Failed to render PDF preview page'
          );
        } finally {
          if (!canceled) setPreviewLoading(false);
        }
        return;
      }

      setDetectedPdfPages(1);
      if (thumbnail && !isPdfAsset(thumbnail)) {
        setPreviewSrc(thumbnail);
      } else {
        setPreviewSrc('');
      }
      setPreviewLoading(false);
    };

    void loadPreview();
    return () => {
      canceled = true;
    };
  }, [activePage, isPdfPreview, pdfUrl, thumbnail]);

  const hotspotsForActivePage = useMemo(
    () =>
      hotspots.filter(
        (hotspot) => clamp(Math.round(hotspot.page || 1), 1, maxPages) === activePage
      ),
    [activePage, hotspots, maxPages]
  );

  const pageQaSummary = useMemo(
    () =>
      Array.from({ length: maxPages }, (_, index) => {
        const page = index + 1;
        const pageHotspots = hotspots.filter(
          (hotspot) => clamp(Math.round(hotspot.page || 1), 1, maxPages) === page
        );
        return {
          page,
          count: pageHotspots.length,
          status: resolvePageQaStatus(pageHotspots),
        };
      }),
    [hotspots, maxPages]
  );

  const addHotspot = () => {
    onChange([...hotspots, createHotspot(hotspots.length + 1, activePage)]);
  };

  const getPointerPercent = (event: React.PointerEvent<HTMLDivElement>) => {
    const rect = previewRef.current?.getBoundingClientRect();
    if (!rect || rect.width <= 0 || rect.height <= 0) return null;
    const x = toPercent(((event.clientX - rect.left) / rect.width) * 100);
    const y = toPercent(((event.clientY - rect.top) / rect.height) * 100);
    return { x, y };
  };

  const handlePreviewPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (movingHotspot) return;
    if (!previewSrc) return;
    if ((event.target as HTMLElement).closest('[data-hotspot-control="1"]')) return;

    const point = getPointerPercent(event);
    if (!point) return;

    setDrawStart({ ...point, pointerId: event.pointerId });
    setDrawCurrent(point);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const startMoveHotspot = (
    event: React.PointerEvent<HTMLButtonElement>,
    hotspot: EditableArticleHotspot
  ) => {
    const rect = previewRef.current?.getBoundingClientRect();
    if (!rect || rect.width <= 0 || rect.height <= 0) return;

    event.preventDefault();
    event.stopPropagation();
    setDrawStart(null);
    setDrawCurrent(null);
    setMovingHotspot({
      id: hotspot.id,
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      originX: hotspot.x,
      originY: hotspot.y,
      width: hotspot.width,
      height: hotspot.height,
      rectWidth: rect.width,
      rectHeight: rect.height,
    });
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePreviewPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (movingHotspot && movingHotspot.pointerId === event.pointerId) {
      const deltaX =
        ((event.clientX - movingHotspot.startClientX) / movingHotspot.rectWidth) * 100;
      const deltaY =
        ((event.clientY - movingHotspot.startClientY) / movingHotspot.rectHeight) * 100;
      const nextX = clamp(movingHotspot.originX + deltaX, 0, 100 - movingHotspot.width);
      const nextY = clamp(movingHotspot.originY + deltaY, 0, 100 - movingHotspot.height);

      onChange(
        hotspots.map((item) =>
          item.id === movingHotspot.id
            ? normalizeBox(
                {
                  ...item,
                  x: nextX,
                  y: nextY,
                },
                maxPages
              )
            : item
        )
      );
      return;
    }

    if (!drawStart || drawStart.pointerId !== event.pointerId) return;
    const point = getPointerPercent(event);
    if (!point) return;
    setDrawCurrent(point);
  };

  const finishDraw = (event: React.PointerEvent<HTMLDivElement>) => {
    if (movingHotspot && movingHotspot.pointerId === event.pointerId) {
      setMovingHotspot(null);
      return;
    }

    if (!drawStart || drawStart.pointerId !== event.pointerId) return;

    const point = getPointerPercent(event) || drawCurrent || { x: drawStart.x, y: drawStart.y };
    const x = Math.min(drawStart.x, point.x);
    const y = Math.min(drawStart.y, point.y);
    const width = Math.abs(point.x - drawStart.x);
    const height = Math.abs(point.y - drawStart.y);

    setDrawStart(null);
    setDrawCurrent(null);

    if (width < 1 || height < 1) return;

    const next = normalizeBox(
      {
        ...createHotspot(hotspots.length + 1, activePage),
        x,
        y,
        width,
        height,
      },
      maxPages
    );

    onChange([...hotspots, next]);
  };

  const removeHotspot = (id: string) => {
    onChange(hotspots.filter((item) => item.id !== id));
  };

  const updateHotspot = (
    id: string,
    key: keyof EditableArticleHotspot,
    value: string
  ) => {
    onChange(
      hotspots.map((item) => {
        if (item.id !== id) return item;

        if (key === 'title' || key === 'text' || key === 'id') {
          return { ...item, [key]: value };
        }

        if (key === 'page') {
          const parsedPage = Number.parseInt(value, 10);
          const pageValue = Number.isFinite(parsedPage) ? parsedPage : 1;
          return normalizeBox({ ...item, page: pageValue }, maxPages);
        }

        const parsed = Number.parseFloat(value);
        const numericValue = Number.isFinite(parsed) ? parsed : 0;
        return normalizeBox({ ...item, [key]: numericValue }, maxPages);
      })
    );
  };

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold text-gray-900">
            Article Hotspots (PDF Page Mapping)
          </h3>
          <p className="text-xs text-gray-600">
            Draw to create boxes, drag boxes to move, then fine-tune with percentages (`x, y, width, height`).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActivePage((prev) => clamp(prev - 1, 1, maxPages))}
            disabled={activePage <= 1}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-300 text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Previous page"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <span className="text-xs font-semibold text-gray-700">
            Page {activePage} / {maxPages}
          </span>
          <button
            type="button"
            onClick={() => setActivePage((prev) => clamp(prev + 1, 1, maxPages))}
            disabled={activePage >= maxPages}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-300 text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Next page"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={addHotspot}
            className="inline-flex items-center gap-1 rounded-md border border-primary-200 bg-primary-50 px-2.5 py-1.5 text-xs font-semibold text-primary-700 hover:bg-primary-100"
          >
            <Plus className="h-3.5 w-3.5" />
            Add (Page {activePage})
          </button>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {pageQaSummary.map((summary) => {
          const statusClasses =
            summary.status === 'ready'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : summary.status === 'review'
                ? 'border-amber-200 bg-amber-50 text-amber-700'
                : 'border-gray-200 bg-gray-50 text-gray-600';
          const Icon =
            summary.status === 'ready'
              ? CheckCircle2
              : summary.status === 'review'
                ? AlertTriangle
                : Circle;

          return (
            <button
              key={summary.page}
              type="button"
              onClick={() => setActivePage(summary.page)}
              className={`flex items-center justify-between rounded-md border px-2 py-1.5 text-xs font-semibold transition ${
                activePage === summary.page
                  ? 'border-primary-500 bg-primary-50 text-primary-700'
                  : statusClasses
              }`}
            >
              <span>P{summary.page}</span>
              <span className="inline-flex items-center gap-1">
                <Icon className="h-3.5 w-3.5" />
                {summary.count}
              </span>
            </button>
          );
        })}
      </div>

      {previewLoading ? (
        <div className="mb-4 flex h-56 items-center justify-center rounded-lg border border-gray-200 bg-gray-50">
          <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
        </div>
      ) : previewSrc ? (
        <div className="mb-4 overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
          <div
            ref={previewRef}
            className="relative cursor-crosshair"
            onPointerDown={handlePreviewPointerDown}
            onPointerMove={handlePreviewPointerMove}
            onPointerUp={finishDraw}
            onPointerCancel={() => {
              setDrawStart(null);
              setDrawCurrent(null);
              setMovingHotspot(null);
            }}
          >
            {/* Preview can be blob/data/pdf-render URLs generated client-side. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewSrc}
              alt={`Hotspot preview page ${activePage}`}
              className="block h-auto w-full object-contain"
            />
            {hotspotsForActivePage.map((hotspot, index) => (
              <button
                key={hotspot.id}
                type="button"
                data-hotspot-control="1"
                onPointerDown={(event) => startMoveHotspot(event, hotspot)}
                className="absolute cursor-move border-2 border-primary-600 bg-primary-500/15 transition hover:bg-primary-500/25"
                style={{
                  left: `${hotspot.x}%`,
                  top: `${hotspot.y}%`,
                  width: `${hotspot.width}%`,
                  height: `${hotspot.height}%`,
                }}
                aria-label={`Move hotspot ${index + 1}`}
              >
                <span className="absolute -left-px -top-5 rounded-sm bg-primary-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                  {index + 1}
                </span>
              </button>
            ))}

            {drawStart && drawCurrent ? (
              <div
                className="pointer-events-none absolute border-2 border-emerald-600 bg-emerald-500/15"
                style={{
                  left: `${Math.min(drawStart.x, drawCurrent.x)}%`,
                  top: `${Math.min(drawStart.y, drawCurrent.y)}%`,
                  width: `${Math.abs(drawCurrent.x - drawStart.x)}%`,
                  height: `${Math.abs(drawCurrent.y - drawStart.y)}%`,
                }}
              />
            ) : null}
          </div>
        </div>
      ) : (
        <p className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          {previewError ||
            'Upload a PDF (recommended) or image thumbnail to map hotspots visually.'}
        </p>
      )}

      {hotspots.length === 0 ? (
        <p className="rounded-md border border-dashed border-gray-300 px-3 py-4 text-sm text-gray-600">
          No hotspots yet. Click Add or drag on the preview to create article mapping.
        </p>
      ) : (
        <div className="space-y-3">
          {hotspots.map((hotspot, index) => (
            <div key={hotspot.id} className="rounded-lg border border-gray-200 p-3">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-900">
                  Article {index + 1} · Page {hotspot.page}
                </p>
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded px-2 py-0.5 text-[11px] font-semibold ${
                      getHotspotConfidence(hotspot) >= 75
                        ? 'bg-emerald-100 text-emerald-700'
                        : getHotspotConfidence(hotspot) >= 60
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-red-100 text-red-700'
                    }`}
                  >
                    Confidence {getHotspotConfidence(hotspot)}%
                  </span>
                  <button
                    type="button"
                    onClick={() => removeHotspot(hotspot.id)}
                    className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-100"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Remove
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2">
                <input
                  type="text"
                  value={hotspot.title}
                  onChange={(event) => updateHotspot(hotspot.id, 'title', event.target.value)}
                  placeholder="Optional article label"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-primary-600"
                />
              </div>

              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-5">
                <input
                  type="number"
                  min="1"
                  max={maxPages}
                  step="1"
                  value={hotspot.page}
                  onChange={(event) => updateHotspot(hotspot.id, 'page', event.target.value)}
                  placeholder="page"
                  className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:border-primary-600"
                />
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={hotspot.x}
                  onChange={(event) => updateHotspot(hotspot.id, 'x', event.target.value)}
                  placeholder="x"
                  className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:border-primary-600"
                />
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={hotspot.y}
                  onChange={(event) => updateHotspot(hotspot.id, 'y', event.target.value)}
                  placeholder="y"
                  className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:border-primary-600"
                />
                <input
                  type="number"
                  min="0.1"
                  max="100"
                  step="0.1"
                  value={hotspot.width}
                  onChange={(event) => updateHotspot(hotspot.id, 'width', event.target.value)}
                  placeholder="width"
                  className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:border-primary-600"
                />
                <input
                  type="number"
                  min="0.1"
                  max="100"
                  step="0.1"
                  value={hotspot.height}
                  onChange={(event) => updateHotspot(hotspot.id, 'height', event.target.value)}
                  placeholder="height"
                  className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:border-primary-600"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
