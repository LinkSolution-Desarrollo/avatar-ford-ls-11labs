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

## Environment variables

| Variable | Required | Purpose | Expected format & defaults | API routes / usage notes |
| --- | --- | --- | --- | --- |
| `AGENT_ID` | ✅ | Identifies the ElevenLabs Conversational AI agent that issues signed session URLs. | ElevenLabs agent UUID (e.g. `a1b2c3d4-...`). No default; must be provisioned in the ElevenLabs dashboard. | Consumed by `GET /api/signed-url`, which forwards the ID to `ElevenLabsClient.conversationalAi.getSignedUrl`. |
| `ELEVENLABS_API_KEY` | ✅ | Authenticates server-to-server requests to ElevenLabs. | Secret string issued by ElevenLabs. No default. Store securely (e.g. `.env`, cloud secret manager). | Required by `GET /api/signed-url`; without it the route responds with a 500 error. |
| `FORD_CAPTURE_ENDPOINT` | ✅ | Destination webhook that receives selfie capture payloads. | HTTPS URL (e.g. `https://example.com/webhooks/capture`). No default. | Used by `POST /api/capture` to forward phone, image, and metadata. Missing value returns a 500 error. |
| `NEXT_PUBLIC_KIOSK_PHONE` | ❌ | Pre-fills the kiosk experience with a WhatsApp number. | Phone number in [E.164](https://en.wikipedia.org/wiki/E.164) format (`+5491122334455`). Leave empty to require manual input. | Read by the kiosk UI in `/app/orb` and `/app/foto`; sanitized via `normalizePhoneInput`. |
| `NEXT_PUBLIC_KIOSK_AUTO_START` | ❌ | Controls whether the kiosk voicebot starts automatically. | Case-insensitive boolean string. Defaults to `true`. Set to `false`, `0`, `off`, or `no` to require manual start. | Evaluated in `components/ConvAI` when rendering the kiosk. |
| `NEXT_PUBLIC_BACKGROUND_VIDEO_URL` | ❌ | Overrides the looping background animation. | HTTPS URL to an MP4/WEBM asset or relative path. Defaults to `/background.mp4` bundled in `public/`. | Used by the `BackgroundWave` component to choose the video source. |
| `NEXT_PUBLIC_ALLOWED_ORIGIN` | ❌ | Restricts CORS responses from API routes. | Origin string (e.g. `https://app.example.com`). Defaults to `*`, which is safe for local development but should be narrowed in production. | Applied by `lib/cors.ts` to every API route (`/api/signed-url`, `/api/capture`, `/api/detect-capture`). |

2. Install dependencies and start the dev server:

   ```bash
   npm install
   npm run dev
   ```

## Docker

The provided `docker-compose.yml` expects an external Docker network called `root_default` so the service can communicate with other containers in the same stack. Create the network ahead of time:

```bash
docker network create root_default
```

If you prefer Docker Compose to manage an internal network automatically, remove the `external: true` stanza (and optionally rename the network) inside `docker-compose.yml`.

Build and run the production image with Docker Compose:

```bash
docker compose up --build
```

The app will be available on `http://localhost:3000`. Override the exposed port with `PORT=4000 docker compose up`.

### Managing secrets in production

When deploying to production with Docker, avoid checking secrets into version control or baking them into images. Recommended practices include:

* Store sensitive values in a secrets manager (AWS Secrets Manager, Vault, Doppler, etc.) and inject them as environment variables during deployment.
* If you are using Docker Compose or Swarm, leverage [Docker secrets](https://docs.docker.com/engine/swarm/secrets/) to mount encrypted values as files or environment variables.
* Limit the scope of `.env` files to development, encrypt at rest, and restrict file permissions when they must exist on disk.
* Rotate credentials regularly and revoke unused ones to reduce blast radius in case of compromise.

The Compose configuration already loads variables from a `.env` file alongside `docker-compose.yml` (following `.env.example`), but in production you should prefer the secure approaches listed above.
