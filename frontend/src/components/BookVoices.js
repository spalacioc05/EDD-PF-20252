"use client";
import { useEffect, useMemo, useState } from "react";
import BookPlayer from "@/components/BookPlayer";
import { getApiUrl } from "@/lib/auth";

export default function BookVoices({ bookId, fragment }) {
  const [tones, setTones] = useState([]);
  const [selectedToneIds, setSelectedToneIds] = useState([]);
  const [voices, setVoices] = useState([]);
  const playbackRates = useMemo(() => ([
    { id: 1, value: 0.75 }, { id: 2, value: 1 }, { id: 3, value: 1.25 }, { id: 4, value: 1.5 }
  ]), []);

  useEffect(() => {
    let canceled = false;
    (async () => {
      try {
        const api = getApiUrl();
        // We may not have a tones endpoint wired yet; render without tones if missing
        const res = await fetch(`${api}/tones`);
        if (!res.ok) throw new Error('no tones');
        const data = await res.json().catch(() => ({ tones: [] }));
        if (!canceled) setTones(Array.isArray(data.tones) ? data.tones : []);
      } catch {
        if (!canceled) setTones([]);
      }
    })();
    return () => { canceled = true; };
  }, []);

  useEffect(() => {
    let canceled = false;
    (async () => {
      try {
        const api = getApiUrl();
  const url = new URL(`${api}/books/${bookId}/voices`);
        if (selectedToneIds.length) url.searchParams.set('tones', selectedToneIds.join(','));
        const res = await fetch(url.toString(), { cache: 'no-store' });
  const data = await res.json().catch(() => ({ voices: [] }));
  const list = Array.isArray(data.voces) ? data.voces : (Array.isArray(data.voices) ? data.voices : []);
  if (!canceled) setVoices(list);
      } catch {
        if (!canceled) setVoices([]);
      }
    })();
    return () => { canceled = true; };
  }, [bookId, selectedToneIds]);


  return (
    <div className="space-y-3">
      {tones.length > 0 && (
        <div className="card p-4">
          <h3 className="font-medium mb-2">Filtrar por tonos</h3>
          <div className="flex flex-wrap gap-2">
            {tones.map((t) => {
              const selected = selectedToneIds.includes(t.id_tono);
              return (
                <button key={t.id_tono} onClick={() => {
                  setSelectedToneIds((prev) => selected ? prev.filter((id) => id !== t.id_tono) : [...prev, t.id_tono]);
                }} className={`px-3 py-1.5 rounded-full text-sm ${selected ? 'bg-[color:var(--color-primary)] text-white' : 'hover-glass'}`}>{t.nombre}</button>
              );
            })}
          </div>
        </div>
      )}

      <BookPlayer
        bookId={bookId}
        playbackRates={playbackRates}
        voices={voices.map((v, i) => ({ id: v.id_voz ?? i, id_voz: v.id_voz ?? i, nombre: v.display_name ?? v.nombre }))}
        defaultRateId={2}
        defaultVoiceId={(voices && voices.find((v)=> v.id_voz === 1)?.id_voz) || voices[0]?.id_voz}
        defaultProgress={0}
        fragment={""}
      />
    </div>
  );
}
