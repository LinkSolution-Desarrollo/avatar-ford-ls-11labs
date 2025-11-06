import { NextResponse } from "next/server";
type CapturePayload = {
  phoneNumber?: string;
  imageBase64?: string;
  conversationId?: string;
  agentMessage?: string;
  instructions?: string;
};
export async function POST(request: Request) {
  let payload: CapturePayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }
  const endpoint = process.env.FORD_CAPTURE_ENDPOINT;
  if (!endpoint) {
    return NextResponse.json(
      { error: "FORD_CAPTURE_ENDPOINT is not configured" },
      { status: 500 }
    );
  }
  const phone = payload.phoneNumber?.trim();
  const imageBase64 = payload.imageBase64?.trim();
  if (!phone || !imageBase64) {
    return NextResponse.json(
      { error: "phoneNumber and imageBase64 are required" },
      { status: 400 }
    );
  }
  const normalizedBase64 = imageBase64.replace(/^data:image\/[a-zA-Z+]+;base64,/, "");
  const dataUrl = imageBase64.startsWith("data:")
    ? imageBase64
    : `data:image/jpeg;base64,${normalizedBase64}`;
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        phoneNumber: phone,
        imageBase64: normalizedBase64,
        imageDataUrl: dataUrl,
        imageMimeType: "image/jpeg",
        conversationId: payload.conversationId ?? null,
        agentMessage: payload.agentMessage ?? null,
        instructions: payload.instructions ?? null,
        metadata: {
          source: "ford-convai-demo",
          capturedAt: new Date().toISOString(),
        },
      }),
    });
    const text = await response.text();
    let responseBody: unknown = text;
    try {
      responseBody = JSON.parse(text);
    } catch {
      // Leave as raw string if not JSON.
    }
    return NextResponse.json(
      {
        success: response.ok,
        status: response.status,
        response: responseBody,
      },
      { status: response.ok ? 200 : 502 }
    );
  } catch (error) {
    console.error("Capture forwarding error:", error);
    return NextResponse.json(
      { error: "Failed to forward capture payload" },
      { status: 502 }
    );
  }
}
