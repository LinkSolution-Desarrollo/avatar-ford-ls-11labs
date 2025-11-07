"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Smartphone,
  Sparkles,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type CameraState = "idle" | "loading" | "ready" | "countdown" | "preview";
type SendStatus = "idle" | "uploading" | "success" | "error";

const FILTER_OPTIONS = [
  { id: "ford-classic", label: "Ford Classic" },
  { id: "azul-titanium", label: "Azul Titanium" },
  { id: "retro-gold", label: "Retro Gold" },
];

const PHOTO_STEPS = [
  {
    title: "1. Deja tu WhatsApp",
    description: "Usamos tu n° solo para enviarte la selfie animada.",
    icon: Smartphone,
  },
  {
    title: "2. Elegí un filtro",
    description: "Seleccioná el estilo Ford que querés aplicar.",
    icon: Sparkles,
  },
  {
    title: "3. Capturá la selfie",
    description: "Activa la cámara, sonreí y listo.",
    icon: Camera,
  },
];

const countdownInitialValue = 3;

function normalizePhoneInput(value: string | null | undefined) {
  if (!value) {
    return "";
  }
  let sanitized = value.replace(/[^\d+]/g, "");
  if (sanitized.startsWith("+")) {
    sanitized = `+${sanitized.slice(1).replace(/\D/g, "")}`;
  } else {
    sanitized = sanitized.replace(/\D/g, "");
  }
  return sanitized;
}

export default function FotoPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [phoneInput, setPhoneInput] = useState("");
  const [selectedFilter, setSelectedFilter] = useState(FILTER_OPTIONS[0].id);
  const [cameraState, setCameraState] = useState<CameraState>("idle");
  const [sendStatus, setSendStatus] = useState<SendStatus>("idle");
  const [countdown, setCountdown] = useState<number | null>(null);
  const [snapshot, setSnapshot] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const formattedPhone = normalizePhoneInput(phoneInput);
  const isPhoneValid = formattedPhone.startsWith("+") && formattedPhone.length >= 8;
  const selectedFilterLabel =
    FILTER_OPTIONS.find((filter) => filter.id === selectedFilter)?.label ?? selectedFilter;

  const statusMessage = useMemo(() => {
    if (errorMessage) {
      return errorMessage;
    }
    if (sendStatus === "success") {
      return "¡Listo! Revisa tu WhatsApp para ver la selfie animada.";
    }
    if (sendStatus === "uploading") {
      return "Enviando selfie...";
    }
    if (cameraState === "countdown" && countdown !== null) {
      return countdown === 0 ? "¡Sonreí!" : `Capturando en ${countdown}`;
    }
    switch (cameraState) {
      case "loading":
        return "Activando cámara...";
      case "ready":
        return "Todo listo para sacar la selfie.";
      case "preview":
        return "¿Te gusta? Podés reenviarla o repetir la toma.";
      default:
        return "Activa la cámara y seguí los pasos.";
    }
  }, [cameraState, countdown, errorMessage, sendStatus]);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      stopStream();
    };
  }, [stopStream]);

  const enableCamera = useCallback(async () => {
    try {
      setErrorMessage(null);
      setCameraState("loading");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraState("ready");
    } catch (error) {
      console.error("No se pudo acceder a la cámara", error);
      setErrorMessage("No pudimos activar la cámara. Revisa los permisos e intenta nuevamente.");
      setCameraState("idle");
    }
  }, []);

  const captureSnapshot = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) {
      setErrorMessage("No encontramos la cámara. Recarga la página e intenta otra vez.");
      return;
    }
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      setErrorMessage("Esperamos un instante a que la cámara enfoque. Probá de nuevo.");
      setCameraState("ready");
      return;
    }
    const context = canvas.getContext("2d");
    if (!context) {
      setErrorMessage("No pudimos preparar la captura. Actualiza el navegador.");
      return;
    }
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
    setSnapshot(dataUrl);
    setCameraState("preview");
    setCountdown(null);
    setErrorMessage(null);
  }, []);

  useEffect(() => {
    if (countdown === null) {
      return;
    }
    if (countdown === 0) {
      captureSnapshot();
      return;
    }
    const timeout = window.setTimeout(() => {
      setCountdown((value) => (typeof value === "number" ? value - 1 : null));
    }, 1000);
    return () => {
      window.clearTimeout(timeout);
    };
  }, [captureSnapshot, countdown]);

  const handleStartCapture = useCallback(() => {
    if (cameraState !== "ready") {
      setErrorMessage("Primero activá la cámara.");
      return;
    }
    setErrorMessage(null);
    setSendStatus("idle");
    setSnapshot(null);
    setCountdown(countdownInitialValue);
    setCameraState("countdown");
  }, [cameraState]);

  const handleRetake = useCallback(() => {
    setSnapshot(null);
    setSendStatus("idle");
    setErrorMessage(null);
    if (streamRef.current) {
      setCameraState("ready");
    } else {
      setCameraState("idle");
    }
  }, []);

  const sendSnapshot = useCallback(async () => {
    if (!snapshot) {
      setErrorMessage("Primero sacá la foto.");
      return;
    }
    if (!isPhoneValid) {
      setErrorMessage("Ingresa tu WhatsApp con código de país (ej: +54 9 11 1234 5678).");
      return;
    }
    try {
      setErrorMessage(null);
      setSendStatus("uploading");
      const response = await fetch("/api/capture", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phoneNumber: formattedPhone,
          imageBase64: snapshot,
          conversationId: null,
          agentMessage: "Selfie express",
          instructions: `Filtro seleccionado: ${selectedFilterLabel}`,
          filterName: selectedFilter,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data?.success) {
        const message =
          data?.error ?? "No pudimos enviar la selfie. Revisa la conexión e intenta nuevamente.";
        setSendStatus("error");
        setErrorMessage(message);
        return;
      }
      setSendStatus("success");
    } catch (error) {
      console.error("Error enviando la selfie", error);
      setSendStatus("error");
      setErrorMessage("Hubo un problema al enviar. Intenta nuevamente en unos segundos.");
    }
  }, [formattedPhone, isPhoneValid, selectedFilter, selectedFilterLabel, snapshot]);

  return (
    <div className="relative flex min-h-screen w-full justify-center px-4 pb-20 pt-28 sm:px-10 md:pt-32">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-36 top-10 h-72 w-72 rounded-full bg-[#0A96FF]/20 blur-3xl sm:-left-24 sm:h-80 sm:w-80" />
        <div className="absolute right-[-25%] top-0 h-96 w-96 rounded-full bg-[#003DA5]/18 blur-[140px] sm:right-[-10%]" />
        <div className="absolute bottom-0 left-1/2 h-[420px] w-[120%] -translate-x-1/2 rounded-[60%] bg-gradient-to-t from-[#021124]/80 via-transparent to-transparent blur-3xl" />
      </div>
      <main className="flex w-full max-w-5xl flex-col gap-8">
        <section className="rounded-3xl border border-white/10 bg-white/5 p-6 text-sky-100/90 backdrop-blur sm:p-8">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-[0.3em] text-sky-200/80">
                Selfie express
              </span>
              <Link
                href="/"
                className="inline-flex items-center gap-2 rounded-full border border-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-sky-100/80 transition hover:bg-white/10"
              >
                <ArrowLeft className="h-4 w-4" />
                Inicio
              </Link>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-2xl font-semibold text-sky-50 sm:text-3xl">
                 Filtros AI Linky.
              </p>
              <Image
                src="/sticker-header.png"
                alt="Sticker"
                width={112}
                height={112}
                className="h-28 w-28 object-contain"
                priority
              />
            </div>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {PHOTO_STEPS.map((step) => (
              <div
                key={step.title}
                className="flex flex-col items-start gap-2 rounded-2xl border border-white/10 bg-[#06122A]/60 p-4 text-sm text-sky-100/85 shadow-[0_12px_40px_rgba(3,17,40,0.35)]"
              >
                <step.icon className="h-6 w-6 text-[#64B5F6]" />
                <div>
                  <h2 className="text-base font-semibold text-sky-50">{step.title}</h2>
                  <p className="mt-1 leading-relaxed text-sky-100/80">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[28px] border border-white/10 bg-[#081632]/70 p-5 shadow-[0_20px_60px_rgba(2,18,46,0.5)] backdrop-blur-md sm:p-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="flex flex-col gap-5 rounded-2xl border border-white/10 bg-[#061227]/80 p-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sky-200/80">
                  Paso 1
                </p>
                <h3 className="mt-2 text-xl font-semibold text-white">Tu contacto</h3>
                <p className="mt-1 text-sm text-sky-100/70">
                  Solo lo usamos para enviarte la imagen editada por WhatsApp con el filtro elegido.
                </p>
                <div className="mt-4">
                  <Input
                    value={phoneInput}
                    onChange={(event) => setPhoneInput(event.target.value)}
                    placeholder="+54 9 11 1234 5678"
                    className="border-white/20 bg-white/5 text-sky-50 placeholder:text-sky-100/40"
                  />
                  {!isPhoneValid && phoneInput.length > 4 ? (
                    <p className="mt-1 text-xs text-amber-200/80">
                      Recordá incluir el prefijo internacional con +.
                    </p>
                  ) : null}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sky-200/80">
                  Paso 2
                </p>
                <h3 className="mt-2 text-xl font-semibold text-white">Elegí un filtro</h3>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  {FILTER_OPTIONS.map((filter) => {
                    const isSelected = filter.id === selectedFilter;
                    return (
                      <button
                        key={filter.id}
                        type="button"
                        onClick={() => setSelectedFilter(filter.id)}
                        className={cn(
                          "rounded-2xl border px-3 py-3 text-left text-sm font-medium transition",
                          isSelected
                            ? "border-white/80 bg-white/20 text-white shadow-lg shadow-[#0A96FF]/30"
                            : "border-white/10 bg-white/5 text-sky-100/70 hover:border-white/40 hover:bg-white/10",
                        )}
                      >
                        {filter.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-sky-100/80">
                <p className="font-semibold uppercase tracking-[0.2em] text-sky-200/80">Estado</p>
                <p className="mt-1 text-base text-white">{statusMessage}</p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button
                  variant="secondary"
                  className="flex-1 border border-white/20 bg-white/10 text-white hover:bg-white/20"
                  onClick={enableCamera}
                  disabled={cameraState === "loading"}
                >
                  {cameraState === "ready" || cameraState === "preview" ? (
                    "Reiniciar cámara"
                  ) : cameraState === "loading" ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Activando
                    </span>
                  ) : (
                    "Activar cámara"
                  )}
                </Button>
                <Button
                  className="flex-1 bg-[#0A96FF] text-white hover:bg-[#0076cc]"
                  onClick={handleStartCapture}
                  disabled={cameraState === "loading" || cameraState === "countdown"}
                >
                  {cameraState === "countdown" ? "Capturando..." : "Sacar foto"}
                </Button>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button
                  variant="outline"
                  className="flex-1 border-white/40 text-white hover:bg-white/10"
                  onClick={handleRetake}
                  disabled={!snapshot}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Repetir toma
                </Button>
                <Button
                  className="flex-1 bg-white text-[#0B152B] hover:bg-sky-100"
                  onClick={sendSnapshot}
                  disabled={sendStatus === "uploading"}
                >
                  {sendStatus === "uploading" ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Enviando
                    </span>
                  ) : sendStatus === "success" ? (
                    <span className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      Enviada
                    </span>
                  ) : (
                    "Enviar selfie"
                  )}
                </Button>
              </div>
            </div>

            <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-gradient-to-br from-[#0F1F3E]/80 via-[#07132A]/90 to-[#020A19]/95 p-4 sm:p-6">
              <div className="relative aspect-[3/4] w-full overflow-hidden rounded-3xl border border-white/10 bg-black/40">
                {snapshot ? (
                  <Image
                    src={snapshot}
                    alt="Previsualización de la selfie"
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <video
                    ref={videoRef}
                    className="h-full w-full object-cover"
                    playsInline
                    autoPlay
                    muted
                  />
                )}
                {cameraState === "countdown" && countdown !== null ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-6xl font-semibold text-white">
                    {countdown === 0 ? "¡Sonreí!" : countdown}
                  </div>
                ) : null}
              </div>
              <canvas ref={canvasRef} className="hidden" />
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-sky-100/80">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-200/80">
                  Filtro seleccionado
                </p>
                <p className="mt-1 text-lg text-white">{selectedFilterLabel}</p>
                <p className="mt-2 text-xs text-sky-100/70">
                  Mandaremos tu selfie con este estilo Ford. Podés cambiarlo y repetir la toma cuando
                  quieras.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
