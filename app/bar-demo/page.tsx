"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BarVisualizer,
  type AgentState,
  useAudioVolume,
  useMultibandVolume,
} from "@/components/ui/bar-visualizer";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type VisualizerMode = Exclude<AgentState, null> | "connecting" | "initializing" | "speaking";

export default function BarDemoPage() {
  const [state, setState] = useState<VisualizerMode>("listening");
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isRequesting, setIsRequesting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const volume = useAudioVolume(stream, {
    fftSize: 64,
    smoothingTimeConstant: 0.1,
    updateInterval: 32,
  });
  const frequencyBands = useMultibandVolume(stream, {
    bands: 15,
    loPass: 100,
    hiPass: 8000,
    updateInterval: 32,
  });

  useEffect(() => {
    return () => {
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [stream]);

  const modeOptions: VisualizerMode[] = useMemo(
    () => ["connecting", "initializing", "listening", "speaking", "thinking", "talking"],
    [],
  );

  const handleToggleMic = async () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
      setErrorMessage(null);
      return;
    }
    setIsRequesting(true);
    setErrorMessage(null);
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true }).then((media) => {
        setStream(media);
      });
    } catch (error) {
      console.error("Demo mic error", error);
      setErrorMessage(
        error instanceof Error ? error.message : "No pudimos acceder a tu micrófono.",
      );
    } finally {
      setIsRequesting(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-[#020b1a] px-4 py-20 text-sky-100">
      <Card className="w-full max-w-3xl border-white/10 bg-[#081225]/80 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-2xl text-white">Audio Frequency Visualizer</CardTitle>
          <CardDescription className="text-sky-100/70">
            Probá el visualizador con animaciones por estado o conecta tu propio micrófono.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-2xl border border-white/10 bg-[#050d1d]/80 p-4">
            <BarVisualizer
              state={state}
              mediaStream={stream}
              demo={!stream}
              barCount={20}
              minHeight={15}
              maxHeight={90}
              className="h-40 w-full"
              centerAlign
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {modeOptions.map((option) => (
              <Button
                key={option}
                size="sm"
                variant={state === option ? "default" : "outline"}
                onClick={() => setState(option)}
              >
                {option.charAt(0).toUpperCase() + option.slice(1)}
              </Button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={handleToggleMic} disabled={isRequesting}>
              {stream ? "Desactivar micrófono" : isRequesting ? "Activando..." : "Activar micrófono"}
            </Button>
            <p className="text-sm text-sky-100/80">
              Estado:{" "}
              {stream
                ? `En vivo (volumen ${Math.round(volume * 100)}%)`
                : "Demo (usa los botones para animar)"}
            </p>
          </div>
          {errorMessage ? (
            <div className="rounded-xl border border-rose-400/40 bg-rose-500/15 px-3 py-2 text-sm text-rose-100">
              {errorMessage}
            </div>
          ) : null}
          <div className="rounded-xl border border-white/5 bg-white/5 px-4 py-3 text-sm text-sky-100/80">
            <p>
              Bands:{" "}
              {frequencyBands.map((band, index) => (
                <span key={index} className="inline-block min-w-[32px] text-center">
                  {Math.round(band * 100)}%
                </span>
              ))}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
