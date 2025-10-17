"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import ProgressBar from "@/components/ProgressBar";
import { getAutorNamesByLibroId } from "@/data/mockData";

export default function BookCard({ book, progreso = 0 }) {
  const autores = getAutorNamesByLibroId(book.id_libro);
  return (
    <Link href={`/book/${book.id_libro}`}>
      <motion.div whileHover={{ y: -4 }} whileTap={{ scale: 0.98 }} className="card p-3">
        <div className="aspect-[3/4] w-full overflow-hidden rounded-lg bg-white/5 relative">
          {/* Fondo (portada si existe) */}
          <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: book.portada ? `url(${book.portada})` : "none" }} />
          {/* Capa oscura para legibilidad */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/30 to-black/50" />
          {/* Contenido: letra inicial y descripción (usamos schema) */}
          <div className="absolute inset-0 p-4 flex flex-col">
            <div className="flex-1 flex items-center justify-center">
              <div className="text-5xl font-extrabold text-white/90 drop-shadow-lg select-none">
                {book.titulo?.[0] || "?"}
              </div>
            </div>
            {book.descripcion && (
              <p className="mt-2 text-[11px] italic line-clamp-3" style={{ color: "var(--color-foreground)" }}>
                “{book.descripcion}”
              </p>
            )}
          </div>
        </div>
        <div className="mt-3">
          <h3 className="text-sm font-semibold line-clamp-1" style={{ color: "var(--color-foreground)" }}>{book.titulo}</h3>
          <p className="text-xs line-clamp-1 text-muted">{autores}</p>
          <div className="mt-2">
            <ProgressBar value={progreso} />
          </div>
        </div>
      </motion.div>
    </Link>
  );
}
