"use client";
import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";

export default function FeaturedCarousel({ children }) {
  const ref = useRef(null);
  const scrollBy = (delta) => {
    if (!ref.current) return;
    ref.current.scrollBy({ left: delta, behavior: "smooth" });
  };

  return (
    <div className="relative">
      <button
        aria-label="Anterior"
        className="absolute left-0 top-1/2 -translate-y-1/2 z-10 hidden md:flex h-10 w-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20"
        onClick={() => scrollBy(-320)}
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <div
        ref={ref}
        className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory scroll-smooth"
      >
        {children}
      </div>
      <button
        aria-label="Siguiente"
        className="absolute right-0 top-1/2 -translate-y-1/2 z-10 hidden md:flex h-10 w-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20"
        onClick={() => scrollBy(320)}
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  );
}
