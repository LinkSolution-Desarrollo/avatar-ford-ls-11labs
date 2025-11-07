"use client";

import { ConvAI } from "@/components/ConvAI";
import Image from "next/image";
import { useEffect } from "react";

const SIMPLE_STEPS = [
  {
    title: "1. Dejanos tu WhatsApp",
    description: "Escribí tu número con código de país para recibir la selfie animada.",
    image: "/placeholder1.png",
  },
  {
    title: "2. Hablá con Linky",
    description: "Contale quién sos, preguntale algo sobre Ford y pedile la foto.",
    image: "/placeholder1.png",
  },
  {
    title: "3. Sonreí para la selfie",
    description: "Cuando Linky te avise, mira a la cámara. La imagen llega por WhatsApp en minutos.",
    image: "/placeholder1.png",
  },
];

export default function Home() {
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, []);

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
            <span className="text-xs font-semibold uppercase tracking-[0.3em] text-sky-200/80">
              Avatar Linky
            </span>
            <div className="flex flex-row items-center gap-4">
              <p className="text-2xl font-semibold text-sky-50 sm:text-3xl">
                Probá el voicebot y llevate tu selfie Ford animada:
              </p>
              <Image
                src="/sticker-header.png"
                alt="Sticker"
                width={160}
                height={160}
                className="ml-4 h-40 w-40 object-contain"
                priority
              />
            </div>

          </div>
          
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {SIMPLE_STEPS.map((step) => (
              <div
                key={step.title}
                className="rounded-2xl border border-white/10 bg-[#06122A]/60 p-4 text-sm text-sky-100/85 shadow-[0_12px_40px_rgba(3,17,40,0.35)] flex flex-col items-center"
              >
                <h2 className="text-base font-semibold text-sky-50">{step.title}</h2>
                <p className="mt-2 leading-relaxed text-center">{step.description}</p>
                <Image
                  src={step.image}
                  alt={`${step.title} icon`}
                  width={96}
                  height={96}
                  className="mt-4 h-24 w-24 object-contain"
                />
              </div>
            ))}
          </div>
          <div className="mt-6 flex justify-center">
            <button
              onClick={() => window.scrollTo({ top: window.innerHeight * 1, behavior: 'smooth' })}
              className="inline-flex items-center justify-center rounded-full border border-white/30 bg-white/10 px-5 py-2 text-sm font-semibold uppercase tracking-[0.28em] text-sky-100 transition hover:bg-white/20"
            >
              Comenzar experiencia
            </button>
          </div>
        </section>

        <section className="rounded-[28px] border border-white/10 bg-[#081632]/70 p-4 shadow-[0_20px_60px_rgba(2,18,46,0.5)] backdrop-blur-md sm:p-6">
          <ConvAI variant="simple" />
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-5 text-sm text-sky-100/70 backdrop-blur sm:flex sm:items-center sm:justify-between sm:gap-6 sm:p-6">
          <div>
            <h2 className="text-base font-semibold uppercase tracking-[0.24em] text-sky-200">
              ¿Querés ver la experiencia completa?
            </h2>
            <p className="mt-2 max-w-xl leading-relaxed">
              Visitá el modo completo para seguir cada detalle de la experiencia, conocer todas las funciones y ver la guía paso a paso en más profundidad.
            </p>
          </div>
          <a
            className="mt-4 inline-flex items-center justify-center rounded-full border border-white/30 bg-white/10 px-5 py-2 text-sm font-semibold uppercase tracking-[0.28em] text-sky-100 transition hover:bg-white/20 sm:mt-0"
            href="/main"
          >
            Abrir modo completo
          </a>
        </section>
      </main>
    </div>
  );
}
