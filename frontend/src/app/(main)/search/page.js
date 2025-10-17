"use client";
import { useState } from "react";
import { Search } from "lucide-react";
import BookCard from "@/components/BookCard";
import { tbl_Libros, tbl_Generos, getGenerosByLibroId } from "@/data/mockData";

export default function SearchPage() {
  const [q, setQ] = useState("");
  const [genre, setGenre] = useState(null);
  const filtered = tbl_Libros.filter((b) => {
    const matchesText = !q || b.titulo.toLowerCase().includes(q.toLowerCase());
    const matchesGenre = !genre || getGenerosByLibroId(b.id_libro).some((g)=> g.id_genero === genre);
    return matchesText && matchesGenre;
  });

  return (
    <div className="space-y-6">
      <div className="relative">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar libros…"
          spellCheck={false}
          suppressHydrationWarning
          autoComplete="off"
          className="w-full rounded-xl px-10 py-3 focus:outline-none focus:ring-2 focus:ring-[color:var(--color-primary)]"
          style={{ backgroundColor: "var(--color-card)", color: "var(--color-foreground)" }}
        />
  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 icon-muted" />
      </div>

      <div className="flex flex-wrap gap-2">
  <button onClick={() => setGenre(null)} className={`px-3 py-1.5 rounded-full text-sm ${genre===null?"bg-[color:var(--color-primary)] text-white":"hover-glass"}`}>Todos</button>
        {tbl_Generos.map((g) => (
          <button key={g.id_genero} onClick={() => setGenre(g.id_genero)} className={`px-3 py-1.5 rounded-full text-sm ${genre===g.id_genero?"bg-[color:var(--color-primary)] text-white":"hover-glass"}`}>{g.nombre}</button>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filtered.map((b) => (
          <BookCard key={b.id_libro} book={b} />
        ))}
      </div>
    </div>
  );
}
