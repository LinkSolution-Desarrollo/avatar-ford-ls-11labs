import type {Metadata} from "next";
import "./globals.css";
import {BackgroundWave} from "@/components/background-wave";
import Link from "next/link";
import Image from "next/image";

export const metadata: Metadata = {
    title: "Linky TechDay",
};

export default function RootLayout({children}: Readonly<{ children: React.ReactNode }>) {
    return (
        <html lang="en" className={"h-full w-full"}>
        <body className={`antialiased w-full h-full flex flex-col`}>
        <div className="flex flex-col flex-grow w-full items-center justify-center sm:px-4">
            <nav
                className="sm:fixed left-0 right-0 top-0 z-40 flex w-full items-center justify-between px-6 py-4 text-sky-100 sm:px-10"
            >
                <div className="flex items-center gap-6">
                    <Link href={"/"} prefetch={true}>
                        <Image
                            src="https://logos-world.net/wp-content/uploads/2021/05/Ford-Logo.png"
                            alt="Ford logo"
                            width={230}
                            height={80}
                            priority
                            className="h-20 w-auto drop-shadow-[0_0_24px_rgba(10,65,155,0.6)] transition duration-200 hover:scale-[1.04]"
                        />
                    </Link>
                    <Image
                        src="https://exportargentina.org.ar/companyimages/16952433094675.png"
                        alt="LinkSolution logo"
                        width={190}
                        height={76}
                        priority
                        className="h-14 w-auto drop-shadow-[0_0_18px_rgba(25,64,120,0.5)]"
                    />
                </div>

                <div className="flex items-center gap-3">
                    <span className="hidden rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium uppercase tracking-[0.35em] text-sky-100/80 sm:inline-flex">
                        Historiador Linky
                    </span>
                </div>
            </nav>
            {children}
            <BackgroundWave/>
        </div>
        </body>
        </html>
    );
}
