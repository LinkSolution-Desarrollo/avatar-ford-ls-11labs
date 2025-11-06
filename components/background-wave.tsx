"use client";
import { motion } from "framer-motion";

export const BackgroundWave = () => {
  const videoSrc = process.env.NEXT_PUBLIC_BACKGROUND_VIDEO_URL ?? "/background.mp4";
  return (
    <motion.video
      src={videoSrc}
      autoPlay
      playsInline
      muted
      loop
      controls={false}
      className="pointer-events-none fixed bottom-0 left-0 z-[-1] hidden w-full max-h-[140vh] object-cover opacity-25 mix-blend-screen md:block"
    />
  );
};
