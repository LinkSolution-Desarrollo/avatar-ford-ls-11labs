## Setup

1. Duplicate the example env file and fill in the required keys:

   ```bash
   cp .env.example .env
   ```

   Optional variables:

   - `NEXT_PUBLIC_KIOSK_PHONE` pre-fills the WhatsApp number for the `/orb` kiosk mode.
   - `NEXT_PUBLIC_KIOSK_AUTO_START=false` disables the automatic voicebot start in kiosk mode.
   - `NEXT_PUBLIC_BACKGROUND_VIDEO_URL` can point to a hosted video (MP4/WEBM) for the animated background.

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
