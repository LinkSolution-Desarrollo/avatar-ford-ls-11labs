# Avatar Ford Linky

## Introducción

Avatar Ford Linky es una experiencia inmersiva que combina un voicebot con captura de selfies animadas para los fans de Ford. La página principal guía a la persona usuaria con un hero en tres pasos, un llamado a la acción y el módulo conversacional que inicia la charla con Linky para obtener la selfie animada. El componente `ConvAI` coordina el flujo de conversación, la solicitud del número de WhatsApp y el proceso de captura/carga de la foto, incluyendo indicadores de estado, modal del flujo y controles de la cámara.

Consulta la [tabla de modos](#modos-clave) para identificar rápidamente cada ruta disponible o dirígete al [flujo principal](#flujo-principal) para conocer cómo se estructura la experiencia central.

![Hero y sticker](./public/sticker-header.png)

## Flujo principal

El flujo estándar (`/`) presenta el hero introductorio, el resumen de pasos y el módulo `ConvAI` en su variante simple para que Linky solicite el número de WhatsApp, active la conversación guiada y gestione la captura automática de la selfie antes de enviarla por mensajería.

![Linky conversando](./public/linky.png)

## Modos clave

| Ruta | Descripción |
| --- | --- |
| `/` | Experiencia principal con hero guiado y `ConvAI` en modo simple para demostraciones rápidas. |
| `/main` | Interfaz completa del voicebot con todas las secciones informativas y controles extendidos de captura. |
| `/orb` | Modo kiosco para eventos, inicia el voicebot y cámara en pantalla completa con número preconfigurado. |
| `/orb-dev` | Variante de desarrollo del kiosco para pruebas locales del orb y ajustes de cámara/voz. |
| `/bar-demo` | Demo reducida enfocada en interacciones breves dentro de espacios de activación o barras. |

## Setup

1. Duplicate the example env file and fill in the required keys:

   ```bash
   cp .env.example .env
   ```

   Optional variables:

   - `NEXT_PUBLIC_KIOSK_PHONE` pre-fills the WhatsApp number for the `/orb` kiosk mode.
   - `NEXT_PUBLIC_KIOSK_AUTO_START=false` disables the automatic voicebot start in kiosk mode.
   - `NEXT_PUBLIC_BACKGROUND_VIDEO_URL` can point to a hosted video (MP4/WEBM) for the animated background.
   - `NEXT_PUBLIC_ALLOWED_ORIGIN` sets the CORS origin for the API routes (default `*`).

2. Install dependencies and start the dev server:

   ```bash
   npm install
   npm run dev
   ```

## Docker

Build and run the production image with Docker Compose:

```bash
docker compose up --build
```

The app will be available on `http://localhost:3000`. Override the exposed port with `PORT=4000 docker compose up`.

To provide secrets when deploying with Docker Compose, create a `.env` file alongside `docker-compose.yml` (following `.env.example`) and it will be loaded automatically via the `env_file` directive.
