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

## Flujo de captura

1. **Obtener credenciales de conversación**
   - `ConvAI` solicita un `signedUrl` llamando a `GET /api/signed-url` cuando el usuario inicia la sesión de voz.
   - El endpoint crea un cliente de ElevenLabs y responde `{ signedUrl: string }`. Si falta `ELEVENLABS_API_KEY` o falla la petición, devuelve `{ error: string }` con código `500`.
2. **Iniciar sesión de voz**
   - Con la URL firmada, `ConvAI` inicia la sesión de conversación de ElevenLabs. `Orb` refleja el estado visual (conectado, escuchando, hablando) a partir de los callbacks de `useConversation`.
   - Cualquier error en la conexión se captura con `onError`, se registra en consola y se muestra una alerta al usuario para reintentar.
3. **Detectar intención de captura**
   - Cada mensaje del agente ElevenLabs se envía a `POST /api/detect-capture`. El endpoint responde:
     - `200 OK` con `{ shouldCapture: false }` si no hay coincidencia.
     - `200 OK` con `{ shouldCapture: true, instructions, reason, confidence }` cuando detecta palabras clave.
     - En caso de error interno, devuelve `200 OK` con `{ shouldCapture: false }` y registra el error.
   - Si `shouldCapture` es verdadero, `ConvAI` activa la cámara, muestra instrucciones y prepara el temporizador.
4. **Capturar y enviar la imagen**
   - Tras la cuenta regresiva, `ConvAI` renderiza el fotograma de la cámara, lo codifica en Base64 y realiza `POST /api/capture` con:
     ```json
     {
       "phoneNumber": "+5491112345678",
       "imageBase64": "...",
       "conversationId": "<session>",
       "agentMessage": "",
       "instructions": ""
     }
     ```
   - `POST /api/capture` reenvía el payload a `FORD_CAPTURE_ENDPOINT`. La respuesta incluye:
     - `200 OK` con `{ success: true, status: <n>, response: <body> }` cuando el endpoint externo respondió 2xx.
     - `502 Bad Gateway` con `{ success: false, status: <n>, response, error? }` si el servicio externo devolvió error.
     - `400 Bad Request` con `{ error: "phoneNumber and imageBase64 are required" }` cuando faltan campos.
     - `500 Internal Server Error` con `{ error: "FORD_CAPTURE_ENDPOINT is not configured" }` si falta la variable de entorno.
     - `502 Bad Gateway` con `{ error: "Failed to forward capture payload" }` ante excepciones de red.
   - `ConvAI` muestra mensajes de éxito o error según `success` y mantiene el estado visible en `Orb` y en la UI.

### Relación de componentes y endpoints

```
Usuario ⇄ ConvAI (React)
              │
              ├── Orb (estado visual de conversación)
              │
              ├── GET /api/signed-url ──▶ ElevenLabs signed URL
              ├── POST /api/detect-capture ──▶ lógica de palabras clave
              └── POST /api/capture ──▶ FORD_CAPTURE_ENDPOINT (servicio externo)
```

### Manejo de errores comunes

- **Falla al obtener signed URL**: revisar `ELEVENLABS_API_KEY` y `AGENT_ID`. La UI muestra una alerta y el usuario puede reintentar iniciar la conversación.
- **Permiso de micrófono o cámara denegado**: la app solicita nuevamente permiso y muestra mensajes específicos para guiar al usuario a habilitarlos.
- **FORD_CAPTURE_ENDPOINT sin configurar**: la API devuelve error `500`; verificar la variable de entorno en el despliegue.
- **Errores del servicio externo**: se encapsulan en la respuesta `{ success: false, status, response }`. Implementaciones que consumen `POST /api/capture` deben registrar el `status` y mostrar un mensaje al usuario, además de reintentar o derivar a soporte.
- **Tiempo de espera o red inestable**: se captura la excepción, se muestra `"Error al enviar. Verifica tu conexión e intenta nuevamente."` y se reinicia el estado de captura para otro intento.
