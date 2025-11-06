import { ConvAI } from "@/components/ConvAI";

export default function Home() {
  return (
    <div className="relative flex min-h-screen w-full justify-center px-4 pb-24 pt-28 sm:px-10 md:pt-36">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-32 top-16 h-72 w-72 rounded-full bg-[#0A96FF]/20 blur-3xl sm:-left-24 sm:h-80 sm:w-80" />
        <div className="absolute right-[-20%] top-0 h-96 w-96 rounded-full bg-[#003DA5]/18 blur-[140px] sm:right-[-10%]" />
        <div className="absolute bottom-0 left-1/2 h-96 w-[120%] -translate-x-1/2 rounded-[60%] bg-gradient-to-t from-[#021124]/80 via-transparent to-transparent blur-3xl" />
      </div>
      <main className="w-full max-w-6xl">
        <ConvAI />
      </main>
    </div>
  );
}
