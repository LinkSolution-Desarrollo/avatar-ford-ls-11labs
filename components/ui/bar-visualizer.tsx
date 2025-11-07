"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import type { AgentState } from "@/components/ui/orb";

export type { AgentState } from "@/components/ui/orb";

type VisualizerState =
  | AgentState
  | "talking"
  | "connecting"
  | "initializing"
  | "speaking"
  | null
  | undefined;
type NormalizedState =
  | "connecting"
  | "initializing"
  | "listening"
  | "speaking"
  | "talking"
  | "thinking"
  | "idle";

const STATE_COLORS: Record<NormalizedState, { from: string; via: string; to: string }> = {
  connecting: { from: "#FDE68A", via: "#FBBF24", to: "#F59E0B" },
  initializing: { from: "#FDE68A", via: "#FBBF24", to: "#F59E0B" },
  listening: { from: "#34D399", via: "#3B82F6", to: "#60A5FA" },
  speaking: { from: "#0A96FF", via: "#5B2EFF", to: "#F472B6" },
  talking: { from: "#0A96FF", via: "#5B2EFF", to: "#F472B6" },
  thinking: { from: "#FCD34D", via: "#FB923C", to: "#F97316" },
  idle: { from: "#94A3B8", via: "#CBD5F5", to: "#E2E8F0" },
};

const STATE_ACTIVITY: Record<NormalizedState, { energy: number; jitter: number }> = {
  connecting: { energy: 0.35, jitter: 0.15 },
  initializing: { energy: 0.45, jitter: 0.2 },
  listening: { energy: 0.6, jitter: 0.25 },
  speaking: { energy: 0.85, jitter: 0.35 },
  talking: { energy: 0.85, jitter: 0.35 },
  thinking: { energy: 0.4, jitter: 0.2 },
  idle: { energy: 0.2, jitter: 0.1 },
};

const DEFAULT_BAR_COUNT = 15;

export type AudioAnalyserOptions = {
  fftSize?: number;
  smoothingTimeConstant?: number;
  minDecibels?: number;
  maxDecibels?: number;
  updateInterval?: number;
};

export type MultiBandVolumeOptions = AudioAnalyserOptions & {
  bands?: number;
  loPass?: number;
  hiPass?: number;
  curve?: number;
};

export type VisualizerAnalyser = {
  getFrequencyData?: () => Uint8Array | undefined;
  fallback?: () => Uint8Array | undefined;
  fps?: number;
};

type MediaAnalyserFrame = {
  data: Uint8Array | null;
  binWidth: number | null;
};

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function useMediaAnalyserFrame(
  mediaStream: MediaStream | null,
  options: AudioAnalyserOptions = {},
): MediaAnalyserFrame {
  const {
    fftSize = 512,
    smoothingTimeConstant = 0.7,
    minDecibels = -95,
    maxDecibels = -10,
    updateInterval = 32,
  } = options;

  const analyserRef = React.useRef<AnalyserNode | null>(null);
  const bufferRef = React.useRef<Uint8Array | null>(null);
  const cleanupRef = React.useRef<(() => void) | null>(null);
  const binWidthRef = React.useRef<number | null>(null);
  const [frame, setFrame] = React.useState<MediaAnalyserFrame>({
    data: null,
    binWidth: null,
  });

  React.useEffect(() => {
    cleanupRef.current?.();
    cleanupRef.current = null;
    analyserRef.current = null;
    bufferRef.current = null;
    binWidthRef.current = null;
    setFrame({ data: null, binWidth: null });

    if (!mediaStream || typeof window === "undefined") {
      return;
    }

    const context = new AudioContext();
    void context.resume().catch((error) => {
      console.warn("AudioContext resume failed", error);
    });
    const source = context.createMediaStreamSource(mediaStream);
    const analyser = context.createAnalyser();
    analyser.fftSize = fftSize;
    analyser.smoothingTimeConstant = smoothingTimeConstant;
    analyser.minDecibels = minDecibels;
    analyser.maxDecibels = maxDecibels;
    source.connect(analyser);

    analyserRef.current = analyser;
    bufferRef.current = new Uint8Array(analyser.frequencyBinCount);
    binWidthRef.current = context.sampleRate / 2 / analyser.frequencyBinCount;

    cleanupRef.current = () => {
      try {
        source.disconnect();
      } catch {
        // ignore
      }
      try {
        analyser.disconnect();
      } catch {
        // ignore
      }
      void context.close();
    };

    return () => {
      cleanupRef.current?.();
      cleanupRef.current = null;
    };
  }, [fftSize, maxDecibels, mediaStream, minDecibels, smoothingTimeConstant]);

  React.useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    let rafId: number;
    let lastSample = 0;
    let mounted = true;

    const sample = (timestamp: number) => {
      if (!mounted) {
        return;
      }
      if (timestamp - lastSample >= updateInterval) {
        const analyser = analyserRef.current;
        const buffer = bufferRef.current;
        if (analyser && buffer) {
          analyser.getByteFrequencyData(buffer as Uint8Array<ArrayBuffer>);
          setFrame({ data: new Uint8Array(buffer), binWidth: binWidthRef.current });
        }
        lastSample = timestamp;
      }
      rafId = window.requestAnimationFrame(sample);
    };

    rafId = window.requestAnimationFrame(sample);
    return () => {
      mounted = false;
      window.cancelAnimationFrame(rafId);
    };
  }, [updateInterval]);

  return frame;
}

function useExternalAnalyser(analyser?: VisualizerAnalyser) {
  const [data, setData] = React.useState<Uint8Array | null>(null);

  React.useEffect(() => {
    if (!analyser) {
      setData(null);
      return;
    }
    if (typeof window === "undefined") {
      return;
    }

    const fps = Math.max(1, analyser.fps ?? 45);
    let rafId: number;
    let lastSample = 0;
    let mounted = true;

    const sample = (timestamp: number) => {
      if (!mounted) {
        return;
      }
      if (timestamp - lastSample >= 1000 / fps) {
        const buffer = analyser.getFrequencyData?.() ?? analyser.fallback?.();
        if (buffer) {
          setData(new Uint8Array(buffer));
        }
        lastSample = timestamp;
      }
      rafId = window.requestAnimationFrame(sample);
    };

    rafId = window.requestAnimationFrame(sample);
    return () => {
      mounted = false;
      window.cancelAnimationFrame(rafId);
    };
  }, [analyser]);

  return data;
}

function computeFrequencyBands(
  data: Uint8Array | null,
  binWidth: number | null,
  bands: number,
  loPass = 0,
  hiPass?: number,
  curve = 0.8,
) {
  const values = new Array(bands).fill(0);
  if (!data || data.length === 0) {
    return values;
  }

  let startIndex = 0;
  let endIndex = data.length;

  if (binWidth && binWidth > 0) {
    const lo = Math.max(0, loPass);
    const hi =
      typeof hiPass === "number" ? hiPass : binWidth * data.length;
    startIndex = Math.max(0, Math.floor(lo / binWidth));
    endIndex = Math.min(data.length, Math.ceil(hi / binWidth));
    if (endIndex <= startIndex) {
      endIndex = Math.min(data.length, startIndex + bands);
    }
  }

  const range = Math.max(1, endIndex - startIndex);
  const bucketSize = Math.max(1, Math.floor(range / bands));

  for (let band = 0; band < bands; band++) {
    const bucketStart = startIndex + band * bucketSize;
    let accumulator = 0;
    let samples = 0;

    for (let offset = 0; offset < bucketSize; offset++) {
      const index = bucketStart + offset;
      if (index >= endIndex) {
        break;
      }
      accumulator += data[index];
      samples++;
    }

    const average = samples > 0 ? accumulator / samples : 0;
    values[band] = Math.pow(average / 255, curve);
  }

  return values;
}

export function useAudioVolume(
  mediaStream: MediaStream | null,
  options?: AudioAnalyserOptions,
) {
  const frame = useMediaAnalyserFrame(mediaStream, options);
  return React.useMemo(() => {
    if (!frame.data || frame.data.length === 0) {
      return 0;
    }
    let sum = 0;
    for (const value of frame.data) {
      sum += value * value;
    }
    const rms = Math.sqrt(sum / frame.data.length) / 255;
    return Number(Math.min(1, rms).toFixed(3));
  }, [frame.data]);
}

export function useMultibandVolume(
  mediaStream: MediaStream | null,
  options: MultiBandVolumeOptions = {},
) {
  const {
    bands = DEFAULT_BAR_COUNT,
    loPass = 0,
    hiPass,
    curve = 0.8,
    ...analyserOptions
  } = options;
  const frame = useMediaAnalyserFrame(mediaStream, analyserOptions);
  return React.useMemo(
    () => computeFrequencyBands(frame.data, frame.binWidth, bands, loPass, hiPass, curve),
    [bands, curve, frame.binWidth, frame.data, hiPass, loPass],
  );
}

export function useBarAnimator(
  state: VisualizerState,
  columns = DEFAULT_BAR_COUNT,
  interval = 140,
) {
  const normalized = normalizeState(state);
  const profile = STATE_ACTIVITY[normalized];
  const [sequence, setSequence] = React.useState<number[]>(() =>
    new Array(columns).fill(0),
  );

  React.useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    let timeoutId: number;
    const animate = () => {
      setSequence(
        new Array(columns).fill(0).map((_, index) => {
          const progress = index / columns;
          const wave = Math.sin(Date.now() / 320 + progress * 5);
          const jitter = (Math.random() - 0.5) * profile.jitter;
          const base = profile.energy * (0.9 + 0.2 * Math.cos(progress * Math.PI));
          return clamp01(base + wave * 0.15 + jitter);
        }),
      );
      timeoutId = window.setTimeout(animate, interval);
    };

    animate();
    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [columns, interval, profile.energy, profile.jitter]);

  return sequence;
}

export type BarVisualizerProps = React.HTMLAttributes<HTMLDivElement> & {
  state?: VisualizerState;
  barCount?: number;
  mediaStream?: MediaStream | null;
  analyser?: VisualizerAnalyser;
  minHeight?: number;
  maxHeight?: number;
  demo?: boolean;
  centerAlign?: boolean;
};

export function BarVisualizer({
  state,
  barCount = DEFAULT_BAR_COUNT,
  mediaStream,
  analyser,
  minHeight = 20,
  maxHeight = 100,
  className,
  demo = false,
  centerAlign = false,
  ...props
}: BarVisualizerProps) {
  const normalized = normalizeState(state);
  const color = STATE_COLORS[normalized] ?? STATE_COLORS.idle;

  const mediaFrame = useMediaAnalyserFrame(mediaStream ?? null, {
    fftSize: 512,
    smoothingTimeConstant: 0.4,
    updateInterval: 48,
  });
  const externalData = useExternalAnalyser(analyser);
  const frequencyData = analyser ? externalData : mediaFrame.data;
  const binWidth = analyser ? null : mediaFrame.binWidth;

  const liveValues = React.useMemo(
    () =>
      computeFrequencyBands(
        frequencyData,
        binWidth,
        barCount,
        80,
        12000,
        0.82,
      ),
    [barCount, binWidth, frequencyData],
  );
  const animatedValues = useBarAnimator(state, barCount, 150);
  const hasSignal =
    (analyser ? frequencyData?.some((value) => value > 3) : mediaFrame.data?.some((value) => value > 3)) ??
    false;
  const values = !demo && hasSignal ? liveValues : animatedValues;
  const layers = centerAlign ? 2 : 1;

  return (
    <div
      {...props}
      className={cn(
        "relative flex h-60 w-full items-center justify-center overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-[#070f1f] via-[#020a19] to-[#02070f] p-4",
        className,
      )}
    >
      <div
        className="absolute inset-0 opacity-40 blur-3xl"
        style={{
          background:
            "radial-gradient(circle at top, rgba(255,255,255,0.15), transparent 55%)",
        }}
      />
      <div className="relative flex h-full w-full items-center justify-center gap-2">
        {Array.from({ length: layers }).map((_, layerIndex) => (
          <div
            key={`layer-${layerIndex}`}
            className={cn(
              "flex h-full flex-1 items-end gap-[3px]",
              centerAlign && layerIndex === 1 ? "rotate-180 opacity-70" : "",
              "justify-center",
            )}
          >
            {values.map((value, index) => {
              const normalizedValue = clamp01(value);
              const height = minHeight + (maxHeight - minHeight) * normalizedValue;
              return (
                <div
                  key={`${layerIndex}-${index}`}
                  className="relative flex-1 overflow-hidden rounded-full bg-white/5"
                >
                  <div
                    className="absolute inset-x-0 bottom-0 rounded-full shadow-[0_0_20px_rgba(14,165,233,0.45)] transition-[height] duration-150 ease-out"
                    style={{
                      background: `linear-gradient(180deg, ${color.from}, ${color.via}, ${color.to})`,
                      height: `${Math.min(100, Math.max(height, minHeight))}%`,
                    }}
                  />
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <div className="pointer-events-none absolute inset-6 rounded-[32px] border border-white/5" />
    </div>
  );
}

function normalizeState(state: VisualizerState): NormalizedState {
  if (!state) {
    return "idle";
  }
  if (state === "talking") {
    return "talking";
  }
  if (state === "speaking") {
    return "speaking";
  }
  if (state === "listening") {
    return "listening";
  }
  if (state === "thinking") {
    return "thinking";
  }
  if (state === "connecting") {
    return "connecting";
  }
  if (state === "initializing") {
    return "initializing";
  }
  return "idle";
}
