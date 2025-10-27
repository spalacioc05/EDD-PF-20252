"use client";
import { Volume2 } from "lucide-react";
import { motion } from "framer-motion";

export default function VoiceSelector({ voices = [], selectedId }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {voices.map((v, idx) => {
        const vid = v.id_voz ?? v.id ?? idx;
        const active = (v.id_voz ?? v.id) === selectedId;
        const generoNombre = v.generoNombre || v.genero || "";
        const idiomaCodigo = v.idiomaCodigo || v.idioma || "";
        return (
          <motion.div key={vid} whileHover={{ y: -3 }} className={`card p-3 flex items-center gap-3 ${active ? "ring-2 ring-[color:var(--color-primary)]" : ""}`}>
            <div className="h-10 w-10 rounded-lg bg-white/5 flex items-center justify-center">
              <Volume2 className="h-5 w-5 text-[color:var(--color-accent)]" />
            </div>
            <div>
              <p className="text-sm font-medium" style={{ color: "var(--color-foreground)" }}>{v.nombre || `Voz ${vid}`}</p>
              {(generoNombre || idiomaCodigo) && (
                <p className="text-xs text-muted">{[generoNombre, idiomaCodigo].filter(Boolean).join(" · ")}</p>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
