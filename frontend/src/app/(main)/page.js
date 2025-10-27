"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Search, Headphones, Sparkles } from "lucide-react";
import BookCard from "@/components/BookCard";
import Link from "next/link";
import { getApiUrl, getToken } from "@/lib/auth";

export default function HomePage() {
  const [activeGenre, setActiveGenre] = useState(null);
  const [q, setQ] = useState("");
  const [genres, setGenres] = useState([]);
  const [books, setBooks] = useState([]);
  const [loadingBooks, setLoadingBooks] = useState(false);
  const [reading, setReading] = useState([]);

  // Load genres and initial books
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const api = getApiUrl();
        const g = await fetch(`${api}/genres`);
        const gj = await g.json().catch(() => ({ genres: [] }));
        if (!cancelled) setGenres(Array.isArray(gj.genres) ? gj.genres : []);
      } catch {}
    })();
    return () => { cancelled = true; };
  }, []);

  // Load books when genre changes
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoadingBooks(true);
        const api = getApiUrl();
        const url = new URL(`${api}/books`);
        if (activeGenre != null) url.searchParams.set('genreId', String(activeGenre));
        const res = await fetch(url.toString());
        const data = await res.json().catch(() => ({ books: [] }));
        if (!cancelled) setBooks(Array.isArray(data.books) ? data.books : []);
      } catch {
        if (!cancelled) setBooks([]);
      } finally {
        if (!cancelled) setLoadingBooks(false);
      }
    })();
    return () => { cancelled = true; };
  }, [activeGenre]);

  // Load current user's reading list
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const api = getApiUrl();
        const token = getToken();
        if (!token) return;
        const res = await fetch(`${api}/users/me/reading?limit=12`, { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json().catch(() => ({ items: [] }));
        if (!cancelled) setReading(Array.isArray(data.items) ? data.items : []);
      } catch {}
    })();
    return () => { cancelled = true; };
  }, []);

  const qLower = q.trim().toLowerCase();
  const base = books;
  const filtrados = base.filter((b) => !qLower || (b.titulo || '').toLowerCase().includes(qLower));

  return (
    <div className="space-y-10">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#6C63FF]/20 via-transparent to-[#A78BFA]/10 p-6 md:p-8">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-2xl text-center">
          <h1 className="text-2xl md:text-3xl font-bold leading-tight">Descubre historias con <span className="text-gradient">voz humana</span></h1>
          <p className="mt-2 text-muted">Explora tu biblioteca, continúa donde te quedaste y disfruta de narraciones naturales.</p>
          <div className="relative z-10 mt-4 flex flex-wrap items-center justify-center gap-2">
            <Link href="/upload" className="rounded-xl px-4 py-2 bg-white/10 hover:bg-white/20 flex items-center gap-2"><Sparkles className="h-4 w-4" />Subir libro</Link>
          </div>
          {/* Prominent search */}
          <div className="relative mt-5 max-w-xl mx-auto">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar libros por título…"
              spellCheck={false}
              suppressHydrationWarning
              autoComplete="off"
              className="w-full rounded-xl px-11 py-3 focus:outline-none focus:ring-2 focus:ring-[color:var(--color-primary)]"
              style={{ backgroundColor: "var(--color-card)", color: "var(--color-foreground)" }}
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 icon-muted" />
          </div>
        </motion.div>
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
      </section>

      {/* Resultados de búsqueda (aparecen por encima de Continuar leyendo) */}
      {qLower && (
        <section>
          <motion.h2 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-xl font-semibold">
            Resultados {filtrados.length > 0 && <span className="text-sm text-gray-400">({filtrados.length})</span>}
          </motion.h2>
          {filtrados.length === 0 ? (
            <div className="card mt-4 p-6 text-center text-gray-300">No encontramos títulos que coincidan.</div>
          ) : (
            <div className="mt-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filtrados.map((libro)=> (
                <BookCard key={libro.id_libro} book={libro} progreso={0} />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Continuar leyendo */}
      <section>
        <motion.h2 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-xl font-semibold flex items-center gap-2"><Headphones className="h-5 w-5" />Continuar leyendo</motion.h2>
        <div className="mt-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {reading.map((it) => {
            const libro = it.tbl_libros || it.libro || { id_libro: it.id_libro, titulo: 'Libro', portada: null };
            const progreso = Number(it.progreso || 0);
            return <BookCard key={libro.id_libro} book={libro} progreso={progreso} />;
          })}
        </div>
      </section>

      {/* (Sección Destacados eliminada a solicitud) */}

      {/* Explora por género con chips interactivos (solo si no hay búsqueda) */}
      {!qLower && (
        <section>
          <motion.h2 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-xl font-semibold">Explora por género</motion.h2>
          <div className="mt-3 flex flex-wrap gap-2">
            <button onClick={()=>setActiveGenre(null)} className={`px-3 py-1.5 rounded-full text-sm ${activeGenre===null?"bg-[color:var(--color-primary)] text-white":"hover-glass"}`}>Todos</button>
            {genres.map((g)=> (
              <button key={g.id_genero} onClick={()=>setActiveGenre(g.id_genero)} className={`px-3 py-1.5 rounded-full text-sm ${activeGenre===g.id_genero?"bg-[color:var(--color-primary)] text-white":"hover-glass"}`}>{g.nombre}</button>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {loadingBooks ? (
              <div className="col-span-full text-center text-gray-400">Cargando libros…</div>
            ) : (
              filtrados.map((libro)=> (
                <BookCard key={libro.id_libro} book={libro} progreso={0} />
              ))
            )}
          </div>
        </section>
      )}
    </div>
  );
}
