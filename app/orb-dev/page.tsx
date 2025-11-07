"use client";

import { BarVisualizer } from "@/components/ui/bar-visualizer";
import { Button } from "@/components/ui/button";
import { Orb, type AgentState } from "@/components/ui/orb";
import { getSignedUrl, requestMicrophonePermission } from "@/lib/conversation";
import { cn } from "@/lib/utils";
import { useConversation } from "@elevenlabs/react";
import {
  AlertCircle,
  Loader2,
  PhoneCall,
  PhoneOff,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

export default function OrbDevPage() {
  const conversation = useConversation();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  type DemoVisualizerState = AgentState | "connecting" | "initializing" | "speaking";
  const [demoState, setDemoState] = useState<DemoVisualizerState>("listening");
  const [demoStream, setDemoStream] = useState<MediaStream | null>(null);
  const [isDemoActivating, setIsDemoActivating] = useState(false);
  const [demoError, setDemoError] = useState<string | null>(null);

  const agentState = useMemo<AgentState>(() => {
    if (conversation.status === "connecting") {
      return "thinking";
    }
    if (conversation.status === "connected" && conversation.isSpeaking) {
      return "talking";
    }
    if (conversation.status === "connected") {
      return "listening";
    }
    return null;
  }, [conversation.isSpeaking, conversation.status]);

  const levelPercent = Math.min(100, Math.max(0, Math.round(audioLevel * 100)));
  const demoStateOptions: DemoVisualizerState[] = [
    "connecting",
    "initializing",
    "listening",
    "speaking",
    "thinking",
    "talking",
  ];

  const stateLabel = useMemo(() => {
    if (conversation.status === "connecting") {
      return "Conectando con Linky...";
    }
    if (conversation.status === "connected") {
      return conversation.isSpeaking ? "Linky está respondiendo" : "Escuchando tu voz";
    }
    return "Inactivo";
  }, [conversation.isSpeaking, conversation.status]);

  const handleStart = useCallback(async () => {
    if (conversation.status === "connected" || conversation.status === "connecting") {
      setStatusMessage("La sesión ya está activa.");
      return;
    }
    setIsStarting(true);
    setErrorMessage(null);
    setStatusMessage("Solicitando micrófono...");
    try {
      const permission = await requestMicrophonePermission();
      if (!permission) {
        setErrorMessage("Necesitamos acceso al micrófono para iniciar la sesión.");
        setStatusMessage(null);
        return;
      }
      setStatusMessage("Generando credenciales temporales...");
      const signedUrl = await getSignedUrl();
      const id = await conversation.startSession({ signedUrl });
      setSessionId(id);
      setStatusMessage("Sesión lista. Probá hablar para ver el visualizador.");
    } catch (error) {
      console.error("Error starting conversation", error);
      if (error instanceof DOMException && error.name === "NotAllowedError") {
        setErrorMessage("Necesitamos acceso al micrófono para iniciar la sesión.");
        setStatusMessage(null);
        return;
      }
      setErrorMessage(
        error instanceof Error
          ? `No pudimos iniciar la sesión: ${error.message}`
          : "Ocurrió un error al iniciar. Intenta nuevamente.",
      );
      setStatusMessage(null);
    } finally {
      setIsStarting(false);
    }
  }, [conversation]);

  const handleStop = useCallback(async () => {
    setErrorMessage(null);
    setStatusMessage("Cerrando sesión...");
    try {
      await conversation.endSession();
    } catch (error) {
      console.error("Error stopping conversation", error);
      setErrorMessage(
        error instanceof Error
          ? `No pudimos cerrar la sesión: ${error.message}`
          : "Ocurrió un error al cerrar la sesión.",
      );
    } finally {
      setSessionId(null);
      setStatusMessage(null);
      setAudioLevel(0);
    }
  }, [conversation]);

  const getOutputData = useCallback(
    () => conversation.getOutputByteFrequencyData(),
    [conversation],
  );
  const getInputData = useCallback(
    () => conversation.getInputByteFrequencyData(),
    [conversation],
  );

  const visualizerAnalyser = useMemo(
    () => ({
      getFrequencyData: getOutputData,
      fallback: getInputData,
      fps: 50,
    }),
    [getInputData, getOutputData],
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    let rafId: number;
    const loop = () => {
      const buffer = getOutputData() ?? getInputData();
      if (buffer && buffer.length) {
        let sum = 0;
        for (const value of buffer) {
          sum += value * value;
        }
        const rms = Math.sqrt(sum / buffer.length) / 255;
        setAudioLevel(rms);
      } else if (conversation.status !== "connected") {
        setAudioLevel(0);
      }
      rafId = window.requestAnimationFrame(loop);
    };
    rafId = window.requestAnimationFrame(loop);
    return () => {
      window.cancelAnimationFrame(rafId);
    };
  }, [conversation.status, getInputData, getOutputData]);

  const handleDemoMicToggle = useCallback(async () => {
    if (demoStream) {
      demoStream.getTracks().forEach((track) => track.stop());
      setDemoStream(null);
      setDemoError(null);
      return;
    }
    setIsDemoActivating(true);
    setDemoError(null);
    try {
      await requestMicrophonePermission();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setDemoStream(stream);
    } catch (error) {
      console.error("Error enabling demo mic", error);
      setDemoError(
        error instanceof Error
          ? `No pudimos activar tu micro: ${error.message}`
          : "No pudimos activar tu micro. Intenta nuevamente.",
      );
    } finally {
      setIsDemoActivating(false);
    }
  }, [demoStream]);

  useEffect(() => {
    return () => {
      demoStream?.getTracks().forEach((track) => track.stop());
    };
  }, [demoStream]);

  return (
    <div className="relative flex min-h-screen w-full justify-center px-4 pb-16 pt-28 text-sky-100 sm:px-8 lg:px-10">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-36 top-10 h-72 w-72 rounded-full bg-[#0A96FF]/20 blur-3xl sm:-left-24 sm:h-80 sm:w-80" />
        <div className="absolute right-[-25%] top-0 h-96 w-96 rounded-full bg-[#003DA5]/18 blur-[140px] sm:right-[-10%]" />
        <div className="absolute bottom-0 left-1/2 h-[420px] w-[120%] -translate-x-1/2 rounded-[60%] bg-gradient-to-t from-[#021124]/80 via-transparent to-transparent blur-3xl" />
      </div>
      <main className="flex w-full max-w-5xl flex-col gap-10">
        <header className="rounded-3xl border border-white/10 bg-white/5 p-6 text-sky-100/90 backdrop-blur sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-sky-200/80">
                Orb Dev
              </p>
              <h1 className="mt-2 text-2xl font-semibold text-sky-50 sm:text-3xl">
                Visualizá el audio del agente en tiempo real
              </h1>
              <p className="mt-2 text-sm text-sky-100/70 max-w-2xl">
                Esta vista está pensada para experimentar con el Orb, revisar niveles de audio y
                probar el nuevo <span className="text-sky-100">BarVisualizer</span> sin necesidad de
                recorrer toda la experiencia.
              </p>
            </div>
            <Link
              href="/orb"
              className="inline-flex items-center justify-center rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-sky-100 transition hover:bg-white/20"
            >
              Volver a /orb
            </Link>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-[28px] border border-white/10 bg-[#081632]/70 p-6 shadow-[0_25px_80px_rgba(2,18,46,0.5)] backdrop-blur">
            <div className="flex flex-col items-center gap-6">
              <Orb
                agentState={agentState}
                className="h-[240px] w-[240px]"
                colors={["#8ED2FF", "#0F2D6C"]}
              />
              <div className="w-full rounded-2xl border border-white/10 bg-white/5 p-4 text-center">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sky-200/80">
                  Estado del agente
                </p>
                <p className="mt-2 text-lg text-white">{stateLabel}</p>
                {sessionId ? (
                  <p className="mt-1 text-xs text-sky-100/60">ID sesión: {sessionId}</p>
                ) : null}
              </div>
              {statusMessage ? (
                <div className="w-full rounded-2xl border border-sky-400/40 bg-sky-400/10 p-3 text-xs text-sky-100/90">
                  {statusMessage}
                </div>
              ) : null}
              {errorMessage ? (
                <div className="flex w-full items-start gap-2 rounded-2xl border border-rose-400/40 bg-rose-500/15 p-3 text-xs text-rose-100">
                  <AlertCircle className="mt-0.5 h-4 w-4" />
                  <span>{errorMessage}</span>
                </div>
              ) : null}
              <div className="flex w-full flex-col gap-3 sm:flex-row">
                <Button
                  onClick={handleStart}
                  disabled={isStarting || conversation.status === "connecting"}
                  className="flex-1 rounded-full bg-[#0A96FF] text-white hover:bg-[#0a7ad1] disabled:opacity-40"
                >
                  {isStarting ? (
                    <span className="flex items-center gap-2 text-sm font-semibold tracking-[0.2em]">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Conectando
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.28em]">
                      <PhoneCall className="h-4 w-4" />
                      Iniciar
                    </span>
                  )}
                </Button>
                <Button
                  onClick={handleStop}
                  variant="outline"
                  disabled={conversation.status === "disconnected"}
                  className="flex-1 rounded-full border-white/30 text-white hover:bg-white/10 disabled:opacity-40"
                >
                  <span className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.28em]">
                    <PhoneOff className="h-4 w-4" />
                    Cortar
                  </span>
                </Button>
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top,_rgba(100,181,246,0.25),_transparent_55%),_#050e1f] p-6 shadow-[0_25px_80px_rgba(2,18,46,0.45)]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sky-200/80">
                  Visualizador
                </p>
                <h2 className="mt-1 text-xl font-semibold text-white">
                  BarVisualizer + audio multibanda
                </h2>
              </div>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.35em] text-sky-50">
                <Sparkles className="h-4 w-4" />
                Dev
              </span>
            </div>
            <p className="mt-2 text-sm text-sky-100/70">
              Las barras superiores siguen el audio de salida del agente y se espejan en la parte
              inferior para resaltar los golpes. Cada barra aplica un promedio suavizado de varias
              bandas de frecuencia.
            </p>
            <div className="mt-6">
              <BarVisualizer
                state={agentState ?? (conversation.status === "connecting" ? "connecting" : undefined)}
                barCount={32}
                analyser={visualizerAnalyser}
                centerAlign
                demo={conversation.status !== "connected"}
              />
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <VisualizerMetric
                label="Nivel promedio"
                value={conversation.status === "connected" ? `${levelPercent}%` : "Sin datos"}
                accent="text-emerald-300"
              />
              <VisualizerMetric
                label="Barras activas"
                value={conversation.status === "connected" ? "En vivo" : "Demo"}
                accent="text-sky-300"
              />
              <VisualizerMetric
                label="Estado audio"
                value={
                  conversation.status === "connected"
                    ? audioLevel > 0.05
                      ? "Streaming"
                      : "Silencio"
                    : "Sin sesión"
                }
                accent="text-indigo-300"
              />
            </div>
          </div>
        </section>

        <section className="rounded-[28px] border border-white/10 bg-[#081632]/60 p-6 shadow-[0_25px_80px_rgba(2,18,46,0.45)]">
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.32em] text-sky-200/80">
                Demo local
              </p>
              <h2 className="mt-1 text-xl font-semibold text-white">Probar el visualizador sin conectarse</h2>
              <p className="mt-2 text-sm text-sky-100/70">
                Activá tu micrófono local para ver las barras reaccionar a tu voz o dejalo en modo demo para
                inspeccionar las transiciones entre estados.
              </p>
            </div>

            <div className="space-y-4 rounded-2xl border border-white/10 bg-[#060f24]/70 p-5">
              <BarVisualizer
                state={demoState}
                mediaStream={demoStream}
                demo={!demoStream}
                barCount={20}
                minHeight={15}
                maxHeight={90}
                className="h-40 max-w-full"
              />

              <div className="flex flex-wrap gap-2">
                {demoStateOptions.map((option) => (
                  <Button
                    key={option}
                    size="sm"
                    variant={demoState === option ? "default" : "outline"}
                    onClick={() => setDemoState(option)}
                    className="capitalize"
                  >
                    {option}
                  </Button>
                ))}
              </div>

              <div className="flex flex-wrap gap-3">
                <Button
                  size="sm"
                  onClick={handleDemoMicToggle}
                  disabled={isDemoActivating}
                  className="min-w-[160px]"
                >
                  {demoStream ? "Desactivar micro demo" : isDemoActivating ? "Activando..." : "Activar micro demo"}
                </Button>
                <p className="text-xs text-sky-100/70">
                  Estado actual: {demoStream ? "En vivo" : "Demo (animación)"}.
                  {!demoStream ? " Pulsá el botón para usar tu micrófono." : ""}
                </p>
              </div>

              {demoError ? (
                <div className="flex items-start gap-2 rounded-xl border border-rose-400/40 bg-rose-500/15 px-3 py-2 text-xs text-rose-100">
                  <AlertCircle className="mt-0.5 h-4 w-4" />
                  <span>{demoError}</span>
                </div>
              ) : null}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

type VisualizerMetricProps = {
  label: string;
  value: string;
  accent?: string;
};

function VisualizerMetric({ label, value, accent }: VisualizerMetricProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-center">
      <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-sky-200/80">
        {label}
      </p>
      <p className={cn("mt-2 text-lg font-semibold text-white", accent)}>{value}</p>
    </div>
  );
}
