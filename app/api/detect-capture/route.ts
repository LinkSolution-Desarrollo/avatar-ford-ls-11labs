import { NextResponse } from "next/server";
import { applyCors, handleCorsOptions } from "@/lib/cors";

export function OPTIONS() {
  return handleCorsOptions();
}

type DetectionResponse = {
  shouldCapture: boolean;
  instructions?: string;
  reason?: string;
  confidence?: number;
};

export async function POST(request: Request) {
  try {
    const { message } = (await request.json()) as { message?: string };
    const text = message?.toLowerCase() ?? "";
    const triggers = ["foto", "selfie", "sacá", "saca", "captura", "capturá"];

    const matched = triggers.some((word) => text.includes(word));
    if (!matched) {
      return applyCors(
        NextResponse.json<DetectionResponse>({
          shouldCapture: false,
        })
      );
    }

    return applyCors(
      NextResponse.json<DetectionResponse>({
        shouldCapture: true,
        instructions:
          "¡Perfecto! Mirá a la cámara y mantené la sonrisa unos segundos.",
        reason: "Detectamos pedido de selfie en la conversación",
        confidence: 0.8,
      })
    );
  } catch (error) {
    console.error("detect-capture error:", error);
    return applyCors(
      NextResponse.json<DetectionResponse>(
        {
          shouldCapture: false,
        },
        { status: 200 }
      )
    );
  }
}
