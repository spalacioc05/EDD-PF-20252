"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Play, Pause, SkipForward, Volume2 } from "lucide-react";
import ProgressBar from "@/components/ProgressBar";
import VoiceSelector from "@/components/VoiceSelector";

export default function BookPlayer({ playbackRates = [], voices = [], defaultRateId, defaultVoiceId, defaultProgress = 0.32, fragment = "" }) {
  const [playing, setPlaying] = useState(false);
  const [rate, setRate] = useState(defaultRateId ?? (playbackRates[0]?.id_playbackrate || 1));
  const [voice, setVoice] = useState(defaultVoiceId ?? (voices[0]?.id_voz || 1));
  const [progress, setProgress] = useState(defaultProgress);
  const [wordIndex, setWordIndex] = useState(0);
  const words = useMemo(() => (fragment || "Este es un ejemplo de lectura simulada.").split(/\s+/), [fragment]);
  const timer = useRef(null);

  // Simular avance palabra por palabra cuando está reproduciendo
  useEffect(() => {
    if (!playing) {
      if (timer.current) clearInterval(timer.current);
      return;
    }
    const baseMs = 450; // duración base por palabra
  const selectedRate = playbackRates.find((r) => r.id_playbackrate === rate)?.velocidad || 1.0;
    const interval = Math.max(120, baseMs / selectedRate);
    timer.current = setInterval(() => {
      setWordIndex((i) => {
        const next = (i + 1) % words.length;
        // actualizar barra de progreso en función del índice de palabra
        setProgress(next / words.length);
        return next;
      });
    }, interval);
    return () => timer.current && clearInterval(timer.current);
  }, [playing, rate, words.length, playbackRates]);

  return (
    <div className="card p-4 space-y-4">
      <h2 className="font-semibold">Escuchar narración</h2>
      <div className="flex items-center gap-3">
        <button className="rounded-full p-3 bg-white/10" onClick={() => setPlaying(!playing)}>
          {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
        </button>
        <button className="rounded-full p-3 bg-white/10" onClick={() => setProgress((p)=> Math.min(1, p + 0.05))}>
          <SkipForward className="h-5 w-5" />
        </button>
        <div className="ml-auto flex items-center gap-2">
          <Volume2 className="h-5 w-5 text-gray-300" />
          <select value={rate} onChange={(e)=>setRate(Number(e.target.value))} className="rounded-lg bg-white/5 px-2 py-1 text-sm">
            {playbackRates.map((r)=> (
              <option key={r.id_playbackrate} value={r.id_playbackrate}>{r.velocidad}x</option>
            ))}
          </select>
        </div>
      </div>
      <ProgressBar value={progress} />

      {/* Texto simulado con resalte palabra por palabra */}
      <div className="rounded-lg bg-white/5 p-3 text-sm leading-7">
        {words.map((w, i) => (
          <span key={i} className={i === wordIndex ? "bg-[color:var(--color-primary)]/40 rounded px-1" : ""}>
            {w}{" "}
          </span>
        ))}
      </div>

      <div className="mt-4 space-y-3">
        <h3 className="font-medium">Seleccionar voz</h3>
        <VoiceSelector voices={voices} selectedId={voice} />
      </div>
    </div>
  );
}
