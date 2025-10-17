"use client";
import { useState } from "react";
import Modal from "@/components/Modal";
import { UploadCloud, CheckCircle } from "lucide-react";
import { tbl_Generos } from "@/data/mockData";

export default function UploadPage() {
  const [open, setOpen] = useState(false);
  const [fileName, setFileName] = useState("");

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-xl font-semibold">Subir libro</h1>
      <div className="card p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input placeholder="Título" className="rounded-lg px-3 py-2" spellCheck={false} style={{ backgroundColor: "var(--color-card)", color: "var(--color-foreground)" }} />
          <input placeholder="Autor" className="rounded-lg px-3 py-2" spellCheck={false} style={{ backgroundColor: "var(--color-card)", color: "var(--color-foreground)" }} />
          <select className="rounded-lg px-3 py-2" style={{ backgroundColor: "var(--color-card)", color: "var(--color-foreground)" }}>
            {tbl_Generos.map((g) => (
              <option key={g.id_genero} value={g.id_genero}>{g.nombre}</option>
            ))}
          </select>
          <textarea placeholder="Descripción" rows={3} className="md:col-span-2 rounded-lg px-3 py-2" spellCheck={false} style={{ backgroundColor: "var(--color-card)", color: "var(--color-foreground)" }} />
        </div>
        <div className="rounded-xl border border-dashed border-white/20 p-6 text-center bg-white/5">
          <UploadCloud className="mx-auto h-8 w-8" style={{ color: "var(--color-accent)" }} />
          <p className="mt-2 text-sm" style={{ color: "var(--color-foreground)" }}>{fileName || "Selecciona un archivo PDF (simulado)"}</p>
          <button className="btn-primary mt-3" onClick={() => setFileName("MiLibro.pdf")}>Seleccionar archivo</button>
        </div>
        <div className="flex justify-end">
          <button className="btn-primary" onClick={() => setOpen(true)}>Subir libro</button>
        </div>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Tu libro ha sido subido correctamente 🎉">
        <div className="flex flex-col items-center text-center space-y-3">
          <CheckCircle className="h-10 w-10 text-[color:var(--color-accent)]" />
          <p>Gracias por contribuir a la biblioteca de LOOM.</p>
          <button className="btn-primary" onClick={() => setOpen(false)}>Cerrar</button>
        </div>
      </Modal>
    </div>
  );
}
