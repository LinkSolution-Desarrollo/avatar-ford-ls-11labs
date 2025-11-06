"use client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Orb, type AgentState } from "@/components/ui/orb";
import { cn } from "@/lib/utils";
import { useConversation } from "@elevenlabs/react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  Camera,
  Check,
  Loader2,
  MessageCircle,
  PauseCircle,
  PlayCircle,
  PartyPopper,
  PhoneCall,
  PhoneOff,
  Send,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import * as React from "react";
async function requestMicrophonePermission() {
  try {
    await navigator.mediaDevices.getUserMedia({ audio: true });
    return true;
  } catch {
    console.error("Microphone permission denied");
    return false;
  }
}
async function getSignedUrl(): Promise<string> {
  const response = await fetch("/api/signed-url");
  if (!response.ok) {
    throw Error("Failed to get signed url");
  }
  const data = await response.json();
  return data.signedUrl;
}
type FeatureTile = {
  title: string;
  description: string;
  icon: LucideIcon;
  accent: string;
};
type FlowStep = {
  title: string;
  description: string;
  highlight: string;
  icon: LucideIcon;
  accent: string;
};
type CaptureStatus =
  | "idle"
  | "warming"
  | "permission"
  | "countdown"
  | "capturing"
  | "uploading"
  | "success"
  | "error";
type CaptureContext = {
  message: string;
  instructions?: string;
  reason?: string;
  confidence?: number;
  triggeredAt: string;
  source: "auto" | "manual";
};
type ConvAIVariant = "default" | "kiosk" | "simple";
type ConvAIProps = {
  variant?: ConvAIVariant;
};
function normalizePhoneInput(value: string | null | undefined): string {
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
const kioskPhonePreset = normalizePhoneInput(process.env.NEXT_PUBLIC_KIOSK_PHONE);
const kioskAutoStartDefault = !["false", "0", "off", "no"].includes(
  (process.env.NEXT_PUBLIC_KIOSK_AUTO_START ?? "").toLowerCase(),
);
const FEATURE_TILES: FeatureTile[] = [
  {
    title: "Voicebot Historiador al instante",
    description:
      "Hablá de forma natural con el voicebot y recibí respuestas al instante.",
    icon: MessageCircle,
    accent: "from-[#64B5F6]/80 to-[#0F2D6C]/90",
  },
  {
    title: "Selfie de pit stop",
    description:
      "El Voicebot te avisará cuando va a sacar la foto. La cámara se activa y captura tu mejor toma.",
    icon: Camera,
    accent: "from-[#0A96FF]/80 to-[#003DA5]/90",
  },
  {
    title: "Entrega turbo por WhatsApp",
    description:
      "Procesamos tu foto y la enviamos directo a tu WhatsApp.",
    icon: Send,
    accent: "from-[#64B5F6]/75 to-[#1D4ED8]/90",
  },
  {
    title: "Sticker coleccionable",
    description:
      "Recibí tu cara animada al volante de un Ford, listo para compartir.",
    icon: PartyPopper,
    accent: "from-[#8ED2FF]/80 to-[#2563EB]/80",
  },
];
const FLOW_STEPS: FlowStep[] = [
  {
    title: "1. Indicanos a donde enviar la imagen personalizada",
    description:
      "Ingresá tu número con prefijo internacional para recibir tu sticker Ford por WhatsApp.",
    highlight:
      "Solo será para enviarte el sticker y novedades de esta experiencia.",
    icon: PhoneCall,
    accent: "from-[#0A96FF]/80 to-[#0F2D6C]/90",
  },
  {
    title: "2. Charla con el Voicebot Linky",
    description:
      "Presentate, puedes preguntarle algun detalle de la historia de Ford, tambien podras contarle cual es tu modelo favorito.      Luego pedile que saque la selfie.",
    highlight:
      "Linky te escucha en vivo y conversa como un asesor Ford.",
    icon: MessageCircle,
    accent: "from-[#64B5F6]/80 to-[#1D4ED8]/90",
  },
  {
    title: "3. Momento selfie",
    description:
      "Cuando el Voicebot Linky dé la señal, abrimos la cámara y capturamos tu mejor sonrisa.",
    highlight:
      "Tu foto se procesa con IA y se fusiona con una Ford Bronco, Ranger,  Mustang o F-150.",
    icon: Camera,
    accent: "from-[#0A96FF]/85 to-[#003DA5]/90",
  },
  {
    title: "4. Sticker animado listo para WhatsApp",
    description:
      "Procesamos la selfie y la enviamos al instante. Recibis un sticker animado para compartir con quien quieras.",
    highlight:
      "Guardalo en tu coleccion Ford y sorprende a tu familia con un divertido recuerdo.",
    icon: PartyPopper,
    accent: "from-[#8ED2FF]/80 to-[#2563EB]/80",
  },
];
const VISIBLE_FEATURES = FEATURE_TILES.slice(0, 2);
export function ConvAI({ variant = "default" }: ConvAIProps) {
  const isKiosk = variant === "kiosk";
  const isSimple = variant === "simple";
  const [phoneNumber, setPhoneNumber] = React.useState(() =>
    isKiosk ? kioskPhonePreset : ""
  );
  const [autoStartEnabled, setAutoStartEnabled] = React.useState(() =>
    isKiosk ? kioskAutoStartDefault : false
  );
  const [phoneTouched, setPhoneTouched] = React.useState(false);
  const [isFlowModalOpen, setIsFlowModalOpen] = React.useState(false);
  const [activeStep, setActiveStep] = React.useState(0);
  const [captureStatus, setCaptureStatus] =
    React.useState<CaptureStatus>("idle");
  const [captureError, setCaptureError] = React.useState<string | null>(null);
  const [captureCountdown, setCaptureCountdown] =
    React.useState<number | null>(null);
  const [captureInfo, setCaptureInfo] = React.useState<CaptureContext | null>(
    null
  );
  const [uploadSummary, setUploadSummary] = React.useState<string | null>(null);
  const [isCameraVisible, setIsCameraVisible] = React.useState(false);
  const [, setCameraStatus] = React.useState<
    "idle" | "initializing" | "ready" | "error"
  >("idle");
  const [cameraMessage, setCameraMessage] = React.useState<string>("");
  const [conversationId, setConversationId] = React.useState<string | undefined>();
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const captureInFlightRef = React.useRef(false);
  const lastAgentMessageRef = React.useRef<string | null>(null);
  const pendingCaptureRef = React.useRef<{ source: "auto" | "manual"; instructions?: string } | null>(null);
  const kioskStartAttemptedRef = React.useRef(false);
  const digitsOnly = React.useMemo(
    () => phoneNumber.replace(/\D/g, ""),
    [phoneNumber]
  );
  const isPhoneValid = isKiosk
    ? true
    : digitsOnly.length >= 10 && digitsOnly.length <= 15;
  const formattedPhone = React.useMemo(() => {
    if (isKiosk) {
      if (!phoneNumber) {
        return "";
      }
      return phoneNumber.startsWith("+") ? phoneNumber : `+${digitsOnly}`;
    }
    if (!digitsOnly) {
      return "";
    }
    return phoneNumber.startsWith("+") ? phoneNumber : `+${digitsOnly}`;
  }, [digitsOnly, isKiosk, phoneNumber]);
  const closeModal = React.useCallback(() => setIsFlowModalOpen(false), []);
  const handleOpenModal = React.useCallback((step: number) => {
    setActiveStep(Math.min(Math.max(step, 0), FLOW_STEPS.length - 1));
    setIsFlowModalOpen(true);
  }, []);
  const ensureCamera = React.useCallback(async () => {
    if (streamRef.current) {
      if (videoRef.current) {
        const element = videoRef.current;
        if (element.srcObject !== streamRef.current) {
          element.srcObject = streamRef.current;
        }
        try {
          await element.play();
        } catch {
          // ignore autoplay restrictions
        }
      }
      setCameraStatus("ready");
      setIsCameraVisible(true);
      return streamRef.current;
    }
    setCameraStatus("initializing");
    setCameraMessage("Activando la camara frontal...");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;
      setCameraStatus("ready");
      setCameraMessage("Cámara lista. ¡Sonríe!");
      setIsCameraVisible(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        try {
          await videoRef.current.play();
        } catch {
          // Ignore autoplay failure; user action will start playback.
        }
      }
      return stream;
    } catch (error) {
      console.error("Camera permission denied", error);
      setCameraStatus("error");
      setCameraMessage(
        "No se pudo acceder a la cámara. Verifica los permisos del navegador."
      );
      throw error;
    }
  }, []);
  const sendCapture = React.useCallback(
    async (imageBase64: string) => {
      if (!formattedPhone) {
        if (isKiosk) {
          setCaptureStatus("idle");
          setCaptureError(null);
          captureInFlightRef.current = false;
          return;
        }
        setCaptureStatus("error");
        setCaptureError(
          "Ingresa tu WhatsApp con codigo de pais (ej: +54 9 11 1234 5678)"
        );
        captureInFlightRef.current = false;
        return;
      }
      setCaptureStatus("uploading");
      setCaptureError(null);
      setUploadSummary(null);
      try {
        const response = await fetch("/api/capture", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            phoneNumber: formattedPhone,
            imageBase64,
            conversationId,
            agentMessage: captureInfo?.message ?? null,
            instructions: captureInfo?.instructions ?? null,
          }),
        });
        const data = await response.json();
        if (!response.ok || !data?.success) {
          const errorMessage =
            data?.error ?? "Error al procesar la foto. Intenta nuevamente.";
          setCaptureStatus("error");
          setCaptureError(errorMessage);
          captureInFlightRef.current = false;
          return;
        }
        setCaptureStatus("success");
        setUploadSummary("Listo! Revisa tu WhatsApp en unos segundos.");
        setActiveStep((prev) => Math.max(prev, FLOW_STEPS.length - 1));
      } catch (error) {
        console.error("Error sending capture payload", error);
        setCaptureStatus("error");
        setCaptureError(
          "Error al enviar. Verifica tu conexion e intenta nuevamente."
        );
      } finally {
        captureInFlightRef.current = false;
      }
    },
    [captureInfo, conversationId, formattedPhone, isKiosk],
  );
  const captureSnapshot = React.useCallback(async () => {
    setCaptureCountdown(null);
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) {
      setCaptureStatus("error");
      setCaptureError(
        "No se pudo acceder a la cámara."
      );
      captureInFlightRef.current = false;
      return;
    }
    if (video.videoWidth === 0) {
      // Esperamos un instante para que el video tenga dimensiones validas.
      setCaptureCountdown(1);
      return;
    }
    setCaptureStatus("capturing");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) {
      setCaptureStatus("error");
      setCaptureError("No pudimos preparar el lienzo para la selfie.");
      captureInFlightRef.current = false;
      return;
    }
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
    const base64 = dataUrl.split(",")[1];
    if (!base64) {
      setCaptureStatus("error");
      setCaptureError("No pudimos leer la imagen capturada.");
      captureInFlightRef.current = false;
      return;
    }
    await sendCapture(base64);
  }, [sendCapture]);
  const beginPendingCapture = React.useCallback(() => {
    if (!pendingCaptureRef.current) {
      return;
    }
    pendingCaptureRef.current = null;
    setCaptureStatus("countdown");
    setCaptureCountdown(3);
    setCameraMessage("Camara lista. Preparate para la selfie.");
  }, []);
  const triggerAutoCapture = React.useCallback(
    async (source: "auto" | "manual", instructions?: string) => {
      if (["countdown", "capturing", "uploading"].includes(captureStatus)) {
        return;
      }
      setCaptureError(null);
      setUploadSummary(null);
      if (!isPhoneValid) {
        setCaptureStatus("error");
        setCaptureError(
          "Ingresa un WhatsApp válido con código de país."
        );
        captureInFlightRef.current = false;
        return;
      }
      captureInFlightRef.current = true;
      pendingCaptureRef.current = { source, instructions };
      setCaptureStatus("warming");
      setCameraMessage(
        instructions ??
          (source === "auto"
            ? "El Voicebot Linky dice que es momento de la selfie. Preparando camara..."
            : "Preparando la camara Ford. Posa como un piloto profesional.")
      );
      setIsCameraVisible(true);
      setActiveStep((prev) => Math.max(prev, 2));
      try {
        await ensureCamera();
        beginPendingCapture();
      } catch (error) {
        const domError = error as DOMException;
        if (domError?.name === "NotAllowedError" || domError?.name === "SecurityError") {
          setCaptureStatus("permission");
          setCameraMessage("Necesitamos acceso a tu cámara. Toca 'Activar cámara' y acepta el permiso.");
          setCaptureError(null);
          setIsCameraVisible(false);
          return;
        }
        setCaptureStatus("error");
        setCaptureError("No se pudo activar la cámara. Verifica los permisos del navegador.");
        captureInFlightRef.current = false;
      }
    },
    [captureStatus, ensureCamera, isPhoneValid, beginPendingCapture]
  );
  const evaluateAgentMessage = React.useCallback(
    async (incoming: string) => {
      const normalized = incoming.trim();
      if (!normalized) {
        return;
      }
      if (captureInFlightRef.current) {
        return;
      }
      if (normalized === lastAgentMessageRef.current) {
        return;
      }
      lastAgentMessageRef.current = normalized;
      try {
        const response = await fetch("/api/detect-capture", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ message: normalized }),
        });
        if (!response.ok) {
          return;
        }
        const data = await response.json();
        if (data.shouldCapture) {
          setCaptureInfo({
            message: normalized,
            instructions: data.instructions,
            reason: data.reason,
            confidence: data.confidence,
            triggeredAt: new Date().toISOString(),
            source: "auto",
          });
          await triggerAutoCapture("auto", data.instructions);
        }
      } catch (error) {
        console.error("Error detecting capture intent", error);
      }
    },
    [triggerAutoCapture]
  );
  const conversation = useConversation({
    clientTools: {
      capture: async (parameters: { instructions?: string }) => {
        console.log("Client tool 'capture' called with parameters:", parameters);
        setCaptureInfo({
          message: "Captura solicitada por el agente",
          instructions: parameters?.instructions || "El agente solicito capturar la foto",
          reason: "Agent triggered via client tool",
          confidence: 1,
          triggeredAt: new Date().toISOString(),
          source: "auto",
        });
        await triggerAutoCapture("auto", parameters?.instructions || "");
        return "Capture initiated successfully";
      }
    },
    onConnect: () => {
      console.log("connected");
      setActiveStep((prev) => Math.max(prev, 1));
      setIsFlowModalOpen(true);
    },
    onDisconnect: () => {
      console.log("disconnected");
      captureInFlightRef.current = false;
    },
    onError: (error) => {
      console.log(error);
      alert("An error occurred during the conversation");
    },
    onMessage: ({ message, source }) => {
      console.log({ message, source });
      if (source === "ai" && typeof message === "string") {
        void evaluateAgentMessage(message);
      }
    },
  });
  const startConversation = React.useCallback(async () => {
    setPhoneTouched(true);
    if (!isPhoneValid) {
      return;
    }
    if (conversation.status !== "disconnected") {
      return;
    }
    const hasPermission = await requestMicrophonePermission();
    if (!hasPermission) {
      alert("No permission");
      return;
    }
    setCaptureInfo(null);
    setCaptureStatus("idle");
    setCaptureError(null);
    setUploadSummary(null);
    captureInFlightRef.current = false;
    try {
      const signedUrl = await getSignedUrl();
      const sessionId = await conversation.startSession({
        signedUrl,
      });
      setConversationId(sessionId);
      console.log("Conversation started", sessionId, {
        phone: digitsOnly,
      });
    } catch (error) {
      console.log(error);
    }
  }, [conversation, digitsOnly, isPhoneValid]);
  const stopConversation = React.useCallback(async () => {
    try {
      captureInFlightRef.current = false;
      await conversation.endSession();
    } catch (error) {
      console.log(error);
    }
  }, [conversation]);
  const statusLabel = React.useMemo(() => {
    if (conversation.status === "connecting") {
      return "Conectando con Linky...";
    }
    if (conversation.status === "connected") {
      return conversation.isSpeaking
        ? "Linky está hablando"
        : "Te estoy escuchando";
    }
    return "¡Listo para comenzar!";
  }, [conversation.status, conversation.isSpeaking]);
  const captureStatusLabel = React.useMemo(() => {
    switch (captureStatus) {
      case "warming":
        return "Preparando camara";
      case "permission":
        return "Esperando permiso de camara";
      case "countdown":
        return "Cuenta regresiva";
      case "capturing":
        return "Capturando selfie";
      case "uploading":
        return "Enviando a Ford";
      case "success":
        return "Selfie enviada";
      case "error":
        return "Necesitamos reintentar";
      default:
        return "Esperando";
    }
  }, [captureStatus]);
  const cameraButtonLabel =
    captureStatus === "permission" || !isCameraVisible ? "Activar camara" : "Ocultar camara";
  const handleCameraToggle = React.useCallback(async () => {
    if (!isCameraVisible || captureStatus === "permission") {
      setCaptureError(null);
      setCameraMessage("Activando camara...");
      if (captureStatus === "permission") {
        setCaptureStatus("warming");
      }
      try {
        await ensureCamera();
        setIsCameraVisible(true);
        setCameraMessage("Cámara lista. Prepárate para la selfie.");
        if (pendingCaptureRef.current) {
          beginPendingCapture();
        }
      } catch (error) {
        const domError = error as DOMException;
        if (domError?.name === "NotAllowedError" || domError?.name === "SecurityError") {
          setCaptureStatus("permission");
          setCameraMessage(
            "Necesitamos tu permiso para usar la camara. Revisa los permisos del navegador."
          );
          setCaptureError(null);
        } else {
          setCaptureStatus("error");
          setCaptureError("No pudimos activar la camara. Revisa los permisos del navegador.");
        }
        captureInFlightRef.current = false;
        return;
      }
      return;
    }
    setIsCameraVisible(false);
    if (!["capturing", "uploading"].includes(captureStatus)) {
      setCaptureStatus("idle");
    }
    pendingCaptureRef.current = null;
  }, [beginPendingCapture, captureStatus, ensureCamera, isCameraVisible]);
  const agentState = React.useMemo<AgentState>(() => {
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
  }, [conversation.status, conversation.isSpeaking]);
  const stageIndicators = React.useMemo(
    () => [
      { label: "Número", done: isPhoneValid },
      {
        label: "Voicebot",
        done:
          conversation.status === "connected" ||
          conversation.status === "connecting",
      },
      {
        label: "Selfie",
        done: ["warming", "countdown", "capturing", "uploading", "success"].includes(
          captureStatus
        ),
      },
      {
        label: "Captura lista",
        done: captureStatus === "success",
      },
    ],
    [captureStatus, conversation.status, isPhoneValid]
  );
  const handlePhoneChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setPhoneNumber(normalizePhoneInput(event.target.value));
  };
  React.useEffect(() => {
    if (!isFlowModalOpen) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeModal();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
  return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFlowModalOpen, closeModal]);
  React.useEffect(() => {
    if (!isFlowModalOpen) {
      return;
    }
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isFlowModalOpen]);
  React.useEffect(() => {
    if (captureCountdown === null) {
      return;
    }
    if (captureCountdown <= 0) {
      void captureSnapshot();
      return;
    }
    const timer = window.setTimeout(() => {
      setCaptureCountdown((current) => (current ?? 1) - 1);
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [captureCountdown, captureSnapshot]);
  React.useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);
  React.useEffect(() => {
    if (!isKiosk) {
      return;
    }
    void ensureCamera();
  }, [ensureCamera, isKiosk]);
  React.useEffect(() => {
    if (!isKiosk) {
      return;
    }
    if (!autoStartEnabled) {
      kioskStartAttemptedRef.current = false;
      return;
    }
    if (conversation.status === "disconnected") {
      if (kioskStartAttemptedRef.current) {
        return;
      }
      kioskStartAttemptedRef.current = true;
      void startConversation();
      return;
    }
    kioskStartAttemptedRef.current = false;
  }, [autoStartEnabled, conversation.status, isKiosk, startConversation]);
  const currentStepIndex = React.useMemo(
    () => Math.min(Math.max(activeStep, 0), FLOW_STEPS.length - 1),
    [activeStep]
  );
  const currentStep = FLOW_STEPS[currentStepIndex];
  const StepIcon = currentStep.icon;
  const progressValue =
    ((currentStepIndex + 1) / FLOW_STEPS.length) * 100;
  if (isSimple) {
    return (
      <div className="flex flex-col gap-6 text-sky-100">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="order-2 rounded-3xl border border-white/12 bg-white/5 p-5 backdrop-blur lg:order-1">
            <div className="flex flex-col gap-4">
              <div
                className={cn(
                  "relative w-full overflow-hidden rounded-3xl border border-white/10 bg-black/40 transition",
                  isCameraVisible ? "opacity-100" : "opacity-70"
                )}
              >
                <video
                  ref={videoRef}
                  playsInline
                  autoPlay
                  muted
                  className="h-64 w-full object-cover sm:h-72"
                />
                {captureCountdown !== null ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-[#020B1A]/70 text-4xl font-semibold text-sky-100 sm:text-5xl">
                    {captureCountdown > 0 ? captureCountdown : "¡Sonreí!"}
                  </div>
                ) : null}
                {captureStatus === "uploading" ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#020B1A]/70 text-sky-100">
                    <Loader2 className="h-7 w-7 animate-spin sm:h-8 sm:w-8" />
                    <span className="text-xs uppercase tracking-[0.32em] sm:text-sm">
                      Enviando...
                    </span>
                  </div>
                ) : null}
                {captureStatus === "success" ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-emerald-500/20 text-emerald-100">
                    <Check className="h-10 w-10 sm:h-12 sm:w-12" />
                    <span className="text-xs font-semibold uppercase tracking-[0.3em] sm:text-sm">
                      Selfie enviada
                    </span>
                  </div>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <span
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em]",
                    captureStatus === "success"
                      ? "border-emerald-400/60 bg-emerald-400/15 text-emerald-100"
                      : captureStatus === "error"
                        ? "border-rose-400/60 bg-rose-500/15 text-rose-100"
                        : "border-white/15 bg-white/5 text-sky-100/80"
                  )}
                >
                  {captureStatus === "uploading" || captureStatus === "warming" ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : captureStatus === "success" ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : captureStatus === "error" ? (
                    <AlertCircle className="h-3.5 w-3.5" />
                  ) : (
                    <Camera className="h-3.5 w-3.5" />
                  )}
                  {captureStatusLabel}
                </span>
                <Button
                  variant="outline"
                  onClick={() => {
                    setCaptureInfo({
                      message: "Captura manual",
                      instructions:
                        "Selfie manual activada. Sonreí y quedate frente a la cámara.",
                      reason: "Manual trigger",
                      confidence: 1,
                      triggeredAt: new Date().toISOString(),
                      source: "manual",
                    });
                    captureInFlightRef.current = false;
                    void triggerAutoCapture("manual");
                  }}
                  className="rounded-full border-white/25 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-sky-100 hover:bg-white/20"
                >
                  Captura manual
                </Button>
                <Button
                  variant="ghost"
                  onClick={handleCameraToggle}
                  disabled={captureStatus === "uploading"}
                  className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-sky-100 hover:bg-white/10"
                >
                  {cameraButtonLabel}
                </Button>
              </div>
              {captureInfo ? (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-xs text-sky-100/85">
                  <p>
                    {captureInfo.instructions ||
                      captureInfo.reason ||
                      "Linky está preparando la cámara. Sonreí y mantené la vista al frente."}
                  </p>
                </div>
              ) : (
                <p className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-3 text-xs text-sky-100/70">
                  Cuando Linky te avise, mirá a la cámara y mantené la sonrisa unos segundos.
                  También podés usar el botón de captura manual.
                </p>
              )}
              {cameraMessage ? (
                <p className="text-xs text-sky-100/70">{cameraMessage}</p>
              ) : null}
              {captureError ? (
                <div className="flex items-start gap-2 rounded-2xl border border-rose-400/30 bg-rose-500/15 px-3 py-2 text-xs text-rose-100">
                  <AlertCircle className="mt-0.5 h-4 w-4" />
                  <span>{captureError}</span>
                </div>
              ) : null}
            </div>
          </div>
          <div className="order-1 rounded-3xl border border-white/12 bg-[#0C1A3C]/80 p-5 backdrop-blur lg:order-2">
            <div className="flex flex-col gap-5">
              <Orb
                agentState={agentState}
                className="h-[220px] w-full max-w-[260px] self-center"
                colors={["#8ED2FF", "#0F2D6C"]}
              />
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-sky-100/80">
                <p className="font-semibold uppercase tracking-[0.28em] text-sky-200">
                  Estado
                </p>
                <p className="mt-2 text-base text-sky-50">{statusLabel}</p>
                <p className="mt-3 text-xs uppercase tracking-[0.26em] text-sky-200/80">
                  Cámara
                </p>
                <p className="mt-1 text-sm">{captureStatusLabel}</p>
              </div>
              {uploadSummary ? (
                <div className="rounded-2xl border border-emerald-400/40 bg-emerald-400/15 p-3 text-sm text-emerald-100">
                  {uploadSummary}
                </div>
              ) : captureInfo ? (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-xs text-sky-100/80">
                  {captureInfo.message}
                </div>
              ) : null}
              <div className="space-y-2">
                <label
                  htmlFor="simple-phone"
                  className="text-xs font-semibold uppercase tracking-[0.32em] text-sky-200"
                >
                  WhatsApp
                </label>
                <Input
                  id="simple-phone"
                  value={phoneNumber}
                  onChange={handlePhoneChange}
                  onBlur={() => setPhoneTouched(true)}
                  placeholder="+54 9 11 1234 5678"
                  className="h-12 rounded-2xl border-white/15 bg-[#0A1630]/60 text-base tracking-wide text-sky-50 placeholder:text-sky-100/40"
                />
                {phoneTouched && !isPhoneValid ? (
                  <p className="text-xs text-rose-200/80">
                    Ingresá tu WhatsApp con código internacional (ej: +54 9 11 1234 5678).
                  </p>
                ) : null}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Button
                  onClick={startConversation}
                  disabled={!isPhoneValid || conversation.status !== "disconnected"}
                  className="rounded-full bg-sky-500 px-4 py-3 text-xs font-semibold uppercase tracking-[0.28em] text-sky-50 hover:bg-sky-400 disabled:opacity-50"
                >
                  {conversation.status === "connecting" ? "Conectando..." : "Iniciar charla"}
                </Button>
                <Button
                  variant="outline"
                  onClick={stopConversation}
                  disabled={conversation.status === "disconnected"}
                  className="rounded-full border-white/25 bg-white/5 px-4 py-3 text-xs font-semibold uppercase tracking-[0.28em] text-sky-100 hover:bg-white/15 disabled:opacity-50"
                >
                  Finalizar
                </Button>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-xs text-sky-100/75">
                Tip: Pedile a Linky que te cuente algo sobre Ford y después pedile que te saque la foto.
                Apenas termine, la selfie llega directo a tu WhatsApp.
              </div>
            </div>
          </div>
        </div>
        <canvas ref={canvasRef} className="hidden" />
      </div>
    );
  }
  if (isKiosk) {
    const isConnecting = conversation.status === "connecting";
    const isActive = conversation.status === "connected";
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center bg-[#020b1a] px-6 py-12 text-sky-100">
        <div className="flex w-full max-w-[420px] flex-col items-center gap-10">
          <div className="relative w-full overflow-hidden rounded-[2.5rem] border border-white/15 bg-black/50 shadow-[0_30px_90px_rgba(2,18,46,0.65)]">
            <video
              ref={videoRef}
              playsInline
              autoPlay
              muted
              className="h-[480px] w-full object-cover"
            />
            {captureCountdown !== null ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative h-32 w-32">
                  <div className="absolute inset-0 rounded-full border-4 border-white/20" />
                  <div className="absolute inset-0 rounded-full border-4 border-white/60 animate-ping" />
                </div>
              </div>
            ) : null}
            {captureStatus === "uploading" ? (
              <div className="absolute inset-0 flex items-center justify-center bg-[#020b1a]/70 backdrop-blur-sm">
                <Loader2 className="h-14 w-14 animate-spin" aria-hidden="true" />
              </div>
            ) : null}
            {captureStatus === "success" ? (
              <div className="absolute inset-0 flex items-center justify-center bg-emerald-400/15 backdrop-blur-[2px]">
                <Check className="h-16 w-16 text-emerald-200" aria-hidden="true" />
              </div>
            ) : null}
          </div>
          <Orb
            agentState={agentState}
            className="h-[260px] w-[260px]"
            colors={["#8ED2FF", "#0F2D6C"]}
          />
          <div className="flex items-center justify-center gap-6">
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={() => {
                setAutoStartEnabled((current) => !current);
              }}
              aria-pressed={autoStartEnabled}
              className={cn(
                "h-16 w-16 rounded-full border border-white/20 bg-white/10 backdrop-blur transition hover:bg-white/20",
                autoStartEnabled ? "ring-2 ring-sky-300/60" : "opacity-70"
              )}
            >
              {autoStartEnabled ? (
                <PauseCircle className="h-7 w-7" aria-hidden="true" />
              ) : (
                <PlayCircle className="h-7 w-7" aria-hidden="true" />
              )}
              <span className="sr-only">
                {autoStartEnabled ? "Desactivar inicio automatico" : "Activar inicio automatico"}
              </span>
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={() => {
                void startConversation();
              }}
              disabled={isConnecting || isActive}
              className="h-16 w-16 rounded-full border border-white/20 bg-white/10 backdrop-blur transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <PhoneCall className="h-7 w-7" aria-hidden="true" />
              <span className="sr-only">Iniciar conversacion</span>
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={() => {
                void stopConversation();
              }}
              disabled={!isActive && !isConnecting}
              className="h-16 w-16 rounded-full border border-white/20 bg-white/10 backdrop-blur transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <PhoneOff className="h-7 w-7" aria-hidden="true" />
              <span className="sr-only">Finalizar conversacion</span>
            </Button>
          </div>
        </div>
        <canvas ref={canvasRef} className="hidden" />
      </div>
    );
  }
  return (
    <div
      id="experiencia"
      className="relative flex flex-col gap-12 text-sky-100"
    >
      <section className="grid gap-6 md:gap-8 lg:gap-10 lg:grid-cols-2">
        <Card className="relative overflow-hidden rounded-3xl border border-white/15 bg-[#0C1A3C]/80 text-sky-100 shadow-[0_25px_80px_rgba(3,17,40,0.45)] backdrop-blur">
          <div className="absolute -left-24 top-[-10%] h-48 w-48 rounded-full bg-[#64B5F6]/30 blur-3xl" />
          <div className="absolute right-[-30%] bottom-[-20%] h-72 w-72 rounded-full bg-[#003DA5]/35 blur-[120px]" />
          <CardHeader className="relative z-10 space-y-3 bg-transparent px-4 py-4 pb-2 sm:px-5">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-400/20 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.35em] text-emerald-100">
                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-200" />
                <span>tiempo real</span>
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleOpenModal(1)}
                className="rounded-full border border-white/10 bg-white/5 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-sky-100/90 transition hover:bg-white/10"
              >
                ¿Cómo funciona?
              </Button>
            </div>
            <CardTitle className="text-xl font-semibold text-sky-50 sm:text-2xl leading-tight">
              Preguntame sobre Ford y sacate una selfie
            </CardTitle>
            <p className="text-sm text-sky-100/70 leading-relaxed max-w-md">

              Tu imagen animada llegará en unos minutos.
            </p>
          </CardHeader>
          <CardContent className="relative z-10 px-5 pb-6 pt-1 sm:px-2">
            <div className="grid gap-5 md:gap-6 lg:grid-cols-2">
              <div className="flex flex-col gap-5">
                <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur">
                  <div className="flex w-full flex-col items-center gap-4">
                    <div
                      className={cn(
                        "relative w-full max-w-[320px] overflow-hidden rounded-3xl border border-white/10 bg-black/40 transition",
                        isCameraVisible ? "opacity-100" : "opacity-70"
                      )}
                    >
                      <video
                        ref={videoRef}
                        playsInline
                        autoPlay
                        muted
                        className="h-40 w-full rounded-3xl object-cover sm:h-48"
                      />
                      {captureCountdown !== null ? (
                        <div className="absolute inset-0 flex items-center justify-center bg-[#020B1A]/70 text-4xl font-semibold text-sky-100 sm:text-5xl">
                          {captureCountdown > 0 ? captureCountdown : "Smile!"}
                        </div>
                      ) : null}
                      {captureStatus === "uploading" ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#020B1A]/70 text-sky-100">
                          <Loader2 className="h-7 w-7 animate-spin sm:h-8 sm:w-8" />
                          <span className="text-xs uppercase tracking-[0.32em] sm:text-sm">
                            Enviando...
                          </span>
                        </div>
                      ) : null}
                      {captureStatus === "success" ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-emerald-500/20 text-emerald-100">
                          <Check className="h-8 w-8 sm:h-10 sm:w-10" />
                          <span className="text-xs font-semibold uppercase tracking-[0.3em] sm:text-sm">
                            Selfie enviada
                          </span>
                        </div>
                      ) : null}
                    </div>
                    <Orb
                      agentState={agentState}
                      className="h-[220px] w-full max-w-[320px] sm:h-[240px]"
                      colors={["#8ED2FF", "#0F2D6C"]}
                    />
                    {captureInfo ? (
                      <div className="w-full max-w-[320px] rounded-2xl border border-white/15 bg-white/5 p-3 text-xs text-sky-100/85">
                        <p>
                          {captureInfo.instructions ||
                            captureInfo.reason ||
                            "El Voicebot sugirio activar la camara. Preparando selfie Ford."}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-sky-100/60">
                          <span>
                            Motivo: {captureInfo.reason ?? "Indicacion del Voicebot"}
                          </span>
                          {typeof captureInfo.confidence === "number" ? (
                            <span>
                              Confianza {Math.round(captureInfo.confidence * 100)}%
                            </span>
                          ) : null}
                        </div>
                      </div>
                    ) : (
                      <p className="w-full max-w-[320px] rounded-2xl border border-dashed border-white/10 bg-white/5 p-3 text-xs text-sky-100/70">
                        Pedile a Linky que te tome una foto.
                        <br />
                        También podés capturar la foto manualmente si no.
                      </p>
                    )}
                    {cameraMessage ? (
                      <p className="max-w-[320px] text-center text-xs text-sky-100/70">{cameraMessage}</p>
                    ) : null}
                  </div>
                  <div className="mt-4 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
                    <span
                      className={cn(
                        "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.3em]",
                        captureStatus === "success"
                          ? "border-emerald-400/60 bg-emerald-400/15 text-emerald-100"
                          : captureStatus === "error"
                            ? "border-rose-400/60 bg-rose-500/15 text-rose-100"
                            : "border-white/15 bg-white/5 text-sky-100/80"
                      )}
                    >
                      {captureStatus === "uploading" || captureStatus === "warming" ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : captureStatus === "success" ? (
                        <Check className="h-3.5 w-3.5" />
                      ) : captureStatus === "error" ? (
                        <AlertCircle className="h-3.5 w-3.5" />
                      ) : (
                        <Camera className="h-3.5 w-3.5" />
                      )}
                      {captureStatusLabel}
                    </span>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setCaptureInfo({
                          message: "Captura manual",
                          instructions:
                            "Selfie manual activada. Sonrie y quedate frente a la camara.",
                          reason: "Manual trigger",
                          confidence: 1,
                          triggeredAt: new Date().toISOString(),
                          source: "manual",
                        });
                        captureInFlightRef.current = false;
                        void triggerAutoCapture("manual");
                      }}
                      className="rounded-full border-white/20 bg-white/5 px-4 py-3 text-xs font-semibold uppercase tracking-[0.28em] text-sky-100 hover:bg-white/15"
                    >
                      Captura manual
                    </Button>                    <Button
                      variant="ghost"
                      onClick={handleCameraToggle}
                      className="rounded-full border border-white/10 bg-white/5 px-4 py-3 text-xs font-semibold uppercase tracking-[0.28em] text-sky-100 hover:bg-white/10"
                      disabled={captureStatus === "uploading"}
                    >
                      {cameraButtonLabel}
                    </Button>
                    {captureInfo?.source === "auto" ? (
                      <span className="inline-flex items-center gap-2 rounded-full border border-sky-200/30 bg-sky-200/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-sky-100/90">
                        <Sparkles className="h-3 w-3" />
                        Captura automática
                      </span>
                    ) : null}
                  </div>
                  <canvas ref={canvasRef} className="hidden" />
                  {captureError ? (
                    <div className="mt-3 flex items-start gap-2 rounded-2xl border border-rose-400/30 bg-rose-500/15 px-3 py-2 text-xs text-rose-100">
                      <AlertCircle className="mt-0.5 h-4 w-4" />
                      {captureError}
                    </div>
                  ) : null}
                  {uploadSummary ? (
                    <div className="mt-3 rounded-2xl border border-emerald-400/25 bg-emerald-400/15 px-3 py-2 text-xs text-emerald-100">
                      {uploadSummary}
                    </div>
                  ) : null}
                </div>
              </div>
              <div className="flex flex-col gap-5">
                <div className="space-y-3">
                  <label
                    htmlFor="phone"
                    className="text-sm font-medium text-sky-100"
                  >
                    Ingresá tu número de WhatsApp
                  </label>
                  <Input
                    id="phone"
                    placeholder="+54 9 11 1234 5678"
                    value={phoneNumber}
                    onChange={handlePhoneChange}
                    onBlur={() => setPhoneTouched(true)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        startConversation();
                      }
                    }}
                  />
                  <p className="text-xs text-sky-100/65 max-w-sm leading-relaxed">
                    Recibiras la imagen en unos minutos.
                  </p>
                  {phoneTouched && !isPhoneValid ? (
                    <p className="text-xs font-semibold text-rose-200">
                      Ingresá un número válido con código de país (ej: +54 9 11 1234 5678).
                    </p>
                  ) : null}
                </div>
                <div className="rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-semibold uppercase tracking-[0.3em] text-sky-100">
                      Estado
                    </span>
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-sky-100/85">
                      <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                      {conversation.status === "connected" ? "En vivo" : "Offline"}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-sky-100/80">{statusLabel}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {stageIndicators.map((stage) => (
                      <span
                        key={stage.label}
                        className={cn(
                          "inline-flex items-center gap-2 rounded-full border px-3 py-[6px] text-[11px] font-semibold uppercase tracking-[0.3em]",
                          stage.done
                            ? "border-emerald-400/50 bg-emerald-400/20 text-emerald-100"
                            : "border-white/15 bg-white/5 text-sky-100/70"
                        )}
                      >
                        {stage.done ? (
                          <Check className="h-3.5 w-3.5" />
                        ) : (
                          <span className="h-2 w-2 rounded-full bg-sky-100/70" />
                        )}
                        {stage.label}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur">
                  <div className="flex flex-col gap-3">
                    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-sky-100/80">
                      {"* Ingresá tu número para comenzar."}
                      <br />
                      {"* Luego hacé clic en \"Iniciar\" y hablá con el voicebot."}
                    </div>
                    <div className="grid w-full gap-3 sm:grid-cols-2">
                      <Button
                        onClick={startConversation}
                        disabled={
                          !isPhoneValid ||
                          conversation.status !== "disconnected"
                        }
                        className="rounded-full px-4 py-3 text-xs font-semibold uppercase tracking-[0.28em] sm:text-sm"
                      >
                        {conversation.status === "connecting"
                          ? "Conectando..."
                          : "Iniciar"}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={stopConversation}
                        disabled={conversation.status === "disconnected"}
                        className="rounded-full border-white/25 bg-white/5 px-4 py-3 text-xs font-semibold uppercase tracking-[0.28em] text-sky-100 hover:bg-white/15 sm:text-sm"
                      >
                        Detener
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        <div className="flex flex-col items-center gap-6 text-center lg:items-start lg:gap-8 lg:text-left">
          <span className="inline-flex items-center gap-2 self-start rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.32em] text-sky-100/85 shadow-[0_6px_24px_rgba(16,64,160,0.35)] backdrop-blur">
            <Sparkles className="h-3.5 w-3.5 text-sky-200" />
            LinkSolution AI
          </span>
          <div className="space-y-3">
            <h1 className="text-3xl font-semibold tracking-tight text-sky-50 sm:text-4xl md:text-5xl leading-tight max-w-2xl">
              Habla con Linky el VoiceBot historiador de Ford con IA
            </h1>
            <p className="max-w-2xl text-base text-sky-100/80 leading-relaxed">
            Ingresá tu número y hablá con nuestro voicebot de Ford. Podés preguntarle algún dato interesante de la marca o pedirle que te saque una foto.
            
            
            ¡En pocos minutos, te enviaremos una versión animada de tu foto por WhatsApp!
            </p>
          </div>
          <div className="grid w-full max-w-[520px] gap-3 sm:grid-cols-2">
            {VISIBLE_FEATURES.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur"
                >
                  <span
                    className={cn(
                      "inline-flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-lg shadow-blue-900/40",
                      feature.accent
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold text-sky-50">
                      {feature.title}
                    </h3>
                    <p className="text-xs text-sky-100/80">
                      {feature.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 lg:justify-start">
            <Button
              size="lg"
              onClick={() => handleOpenModal(0)}
              className="rounded-full px-5 py-3 text-xs font-semibold uppercase tracking-[0.28em] sm:text-sm"
            >
              paso a paso
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => handleOpenModal(2)}
              className="rounded-full border-white/20 bg-white/5 px-5 py-3 text-xs font-semibold uppercase tracking-[0.28em] text-sky-100 hover:bg-white/15 sm:text-sm"
            >
              Como sacarme una selfie
            </Button>
          </div>
          <p className="max-w-sm text-xs text-sky-100/70 sm:text-sm">
            Te invitamos a compartir tu imagen con tus conocidos!
          </p>
        </div>
      </section>
      <AnimatePresence>
        {isFlowModalOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#020B1A]/80 px-4 py-10 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-white/15 bg-gradient-to-br from-[#0F172A]/95 via-[#0C1A3C]/92 to-[#020B1A]/94 p-8 text-sky-100 shadow-[0_25px_80px_rgba(1,10,26,0.65)]"
              initial={{ opacity: 0, scale: 0.92, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 40 }}
              transition={{ duration: 0.2 }}
            >
              <button
                onClick={closeModal}
                aria-label="Cerrar modal"
                className="absolute right-5 top-5 inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/5 text-sky-100 transition hover:bg-white/10"
              >
                x
              </button>
              <div className="mb-6 flex items-center justify-between gap-4">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.35em] text-sky-100/80">
                  Paso {currentStepIndex + 1} / {FLOW_STEPS.length}
                </div>
                <div className="h-1 w-40 overflow-hidden rounded-full bg-white/10">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-[#64B5F6] to-[#0A96FF]"
                    initial={false}
                    animate={{ width: `${progressValue}%` }}
                  />
                </div>
              </div>
              <div className="relative min-h-[200px]">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentStep.title}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-6"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                      <span
                        className={cn(
                          "inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-lg shadow-blue-900/40",
                          currentStep.accent
                        )}
                      >
                        <StepIcon className="h-7 w-7" />
                      </span>
                      <div className="space-y-3">
                        <h3 className="text-2xl font-semibold text-sky-50">
                          {currentStep.title}
                        </h3>
                        <p className="text-base text-sky-100/80">
                          {currentStep.description}
                        </p>
                        <div className="rounded-2xl border border-white/15 bg-white/5 p-4 text-sm text-sky-100/85">
                          {currentStep.highlight}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>
              <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  {FLOW_STEPS.map((step, index) => (
                    <button
                      key={step.title}
                      onClick={() => setActiveStep(index)}
                      aria-label={`Ir al paso ${index + 1}`}
                      className={cn(
                        "h-2.5 w-10 rounded-full transition",
                        index <= currentStepIndex
                          ? "bg-[#64B5F6]"
                          : "bg-white/15 hover:bg-white/25"
                      )}
                    />
                  ))}
                </div>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() =>
                      setActiveStep((prev) => Math.max(0, prev - 1))
                    }
                    disabled={currentStepIndex === 0}
                    className="rounded-full border-white/20 bg-white/5 px-6 text-xs font-semibold uppercase tracking-[0.3em] text-sky-100 hover:bg-white/10 disabled:opacity-50"
                  >
                    Anterior
                  </Button>
                  <Button
                    onClick={() => {
                      setActiveStep((prev) =>
                        prev >= FLOW_STEPS.length - 1 ? prev : prev + 1
                      );
                      if (currentStepIndex >= FLOW_STEPS.length - 1) {
                        closeModal();
                      }
                    }}
                    className="rounded-full px-6 text-xs font-semibold uppercase tracking-[0.3em]"
                  >
                    {currentStepIndex >= FLOW_STEPS.length - 1
                      ? "Listo, a conversar!"
                      : "Siguiente"}
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
