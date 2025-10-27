"use client";
import { useEffect, useState } from "react";
import { getApiUrl, getToken } from "@/lib/auth";

export default function BookReadingActions({ bookId }) {
  const [reading, setReading] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  async function fetchReading() {
    const api = getApiUrl();
    const token = getToken();
    setError(null);
    try {
      setLoading(true);
      const res = await fetch(`${api}/books/${bookId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        cache: 'no-store',
      });
      const data = await res.json().catch(() => ({}));
      setReading(data?.reading || null);
    } catch (e) {
      setError("No se pudo cargar el estado de lectura");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchReading(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [bookId]);

  async function startReading() {
    const api = getApiUrl();
    const token = getToken();
    if (!token) { setError("Inicia sesión para comenzar a leer"); return; }
    try {
      const res = await fetch(`${api}/books/${bookId}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || 'Error');
      setReading(data.reading || null);
    } catch (e) {
      setError("No se pudo iniciar la lectura");
    }
  }

  async function resumeReading() {
    // For now just a no-op that ensures the relation exists
    if (!reading) return startReading();
  }

  async function readAgain() {
    const api = getApiUrl();
    const token = getToken();
    if (!token) { setError("Inicia sesión para leer nuevamente"); return; }
    try {
      const res = await fetch(`${api}/books/${bookId}/reading`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id_estado: 3 }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || 'Error');
      setReading(data.reading || null);
    } catch (e) {
      setError("No se pudo reactivar la lectura");
    }
  }

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="font-semibold">Tu progreso</h2>
          {loading ? (
            <p className="text-gray-400 text-sm">Cargando…</p>
          ) : reading ? (
            <p className="text-gray-400 text-sm">
              {Number(reading.progreso || 0) * 100 | 0}% completado · página {reading.pagina || 0}
            </p>
          ) : (
            <p className="text-gray-400 text-sm">Aún no has empezado este libro</p>
          )}
          {error && <p className="text-red-400 text-sm mt-1">{error}</p>}
        </div>
        <div className="flex items-center gap-2">
          {!loading && !reading && (
            <button onClick={startReading} className="rounded-lg bg-[color:var(--color-primary)] px-3 py-2 text-white hover:opacity-90">Empezar a leer</button>
          )}
          {!loading && reading && Number(reading.id_estado) === 3 && (
            <button onClick={resumeReading} className="rounded-lg hover-glass px-3 py-2">Continuar</button>
          )}
          {!loading && reading && Number(reading.id_estado) === 4 && (
            <button onClick={readAgain} className="rounded-lg bg-white/10 hover:bg-white/20 px-3 py-2">Leer de nuevo</button>
          )}
        </div>
      </div>
    </div>
  );
}
