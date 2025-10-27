"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Play, Pause, SkipForward, Volume2 } from "lucide-react";
import ProgressBar from "@/components/ProgressBar";
import VoiceSelector from "@/components/VoiceSelector";
import Modal from "@/components/Modal";
import { getApiUrl, getToken } from "@/lib/auth";

export default function BookPlayer({ bookId, playbackRates = [], voices = [], defaultRateId, defaultVoiceId, defaultProgress = 0 }) {
  const [playing, setPlaying] = useState(false);
  const initialRateId = defaultRateId ?? (playbackRates[0]?.id_playbackrate ?? playbackRates[0]?.id ?? 1);
  const [rate, setRate] = useState(initialRateId);
  const [voice, setVoice] = useState(defaultVoiceId ?? (voices[0]?.id_voz ?? voices[0]?.id ?? 1));
  const [progress, setProgress] = useState(defaultProgress);
  const timer = useRef(null);
  const audioRef = useRef(null);
  const [audioUrl, setAudioUrl] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingVoice, setPendingVoice] = useState(null);
  const [generating, setGenerating] = useState(false);

  // Simular avance palabra por palabra cuando está reproduciendo
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => {
      const dur = audio.duration || 0;
      const cur = audio.currentTime || 0;
      if (dur > 0) setProgress(Math.min(1, Math.max(0, cur / dur)));
    };
    audio.addEventListener('timeupdate', onTime);
    return () => audio.removeEventListener('timeupdate', onTime);
  }, []);

  // Aplicar playbackRate al audio
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const found = playbackRates.find((r) => (r.id_playbackrate ?? r.id) === rate);
    const r = Number(found?.velocidad ?? found?.value ?? 1.0);
    audio.playbackRate = isNaN(r) ? 1.0 : r;
  }, [rate, playbackRates]);

  // Control play/pause botón
  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audioUrl || !audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      try {
        await audio.play();
        setPlaying(true);
      } catch {}
    }
  };

  // Persistir progreso al pausar o salir
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const save = async () => {
      try {
        const token = getToken();
        if (!token) return;
        const api = getApiUrl();
        const found = playbackRates.find((r) => (r.id_playbackrate ?? r.id) === rate);
        const rateVal = Number(found?.velocidad ?? found?.value ?? 1.0);
        const body = {
          progreso: (audio.currentTime && audio.duration) ? (audio.currentTime / audio.duration) : progress,
          tiempo_escucha: Math.floor(audio.currentTime || 0),
          id_estado: 3,
          id_voz: voice,
          id_playbackrate: rateVal,
          audio: audioUrl,
        };
        await fetch(`${api}/books/${bookId}/reading`, {
          method: 'PATCH',
          headers: { 'Content-Type':'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(body)
        });
      } catch {}
    };
    const onPause = () => { setPlaying(false); save(); };
    const onBeforeUnload = () => { save(); };
    audio.addEventListener('pause', onPause);
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      audio.removeEventListener('pause', onPause);
      window.removeEventListener('beforeunload', onBeforeUnload);
    };
  }, [bookId, voice, rate, audioUrl, progress, playbackRates]);

  // Solicitar generación/obtención del audio al seleccionar voz
  const handleSelectVoice = async (vid) => {
    setPendingVoice(vid);
    setConfirmOpen(true);
  };

  const confirmGenerate = async () => {
    setConfirmOpen(false);
    if (!pendingVoice) return;
    try {
      setGenerating(true);
      const api = getApiUrl();
      const token = getToken();
      const found = playbackRates.find((r) => (r.id_playbackrate ?? r.id) === rate);
      const rateVal = Number(found?.velocidad ?? found?.value ?? 1.0);
      const res = await fetch(`${api}/books/${bookId}/tts`, {
        method: 'POST',
        headers: { 'Content-Type':'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id_voz: pendingVoice, id_playbackrate: rateVal })
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.audioUrl) {
          setAudioUrl(data.audioUrl);
          setVoice(pendingVoice);
          // Cargar en audio y reproducir
          const audio = audioRef.current;
          if (audio) {
            audio.src = data.audioUrl;
            audio.currentTime = 0;
            try { await audio.play(); setPlaying(true); } catch {}
          }
        }
      }
    } catch {}
    finally {
      setGenerating(false);
      setPendingVoice(null);
    }
  };

  return (
    <div className="card p-4 space-y-4">
      <h2 className="font-semibold">Escuchar narración</h2>
      <div className="flex items-center gap-3">
        <button className="rounded-full p-3 bg-white/10" onClick={togglePlay} disabled={!audioUrl || generating}>
          {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
        </button>
        <button className="rounded-full p-3 bg-white/10" onClick={() => { const a = audioRef.current; if (a) { a.currentTime = Math.min((a.currentTime||0) + 5, a.duration||a.currentTime||0); } }}>
          <SkipForward className="h-5 w-5" />
        </button>
        <div className="ml-auto flex items-center gap-2">
          <Volume2 className="h-5 w-5 text-gray-300" />
          <select value={rate} onChange={(e)=>setRate(Number(e.target.value))} className="rounded-lg bg-white/5 px-2 py-1 text-sm">
            {playbackRates.map((r, idx)=> {
              const rid = r.id_playbackrate ?? r.id ?? idx;
              const label = (r.velocidad ?? r.value ?? 1) + 'x';
              return (<option key={rid} value={rid}>{label}</option>);
            })}
          </select>
        </div>
      </div>
      <ProgressBar value={progress} />

      {/* Tag de audio para reproducir el MP3 generado o existente */}
      <audio ref={audioRef} preload="auto" />

      {/* Sin texto en tiempo real: solo reproducción de audio */}

      <div className="mt-4 space-y-3">
        <h3 className="font-medium">Seleccionar voz</h3>
        <VoiceSelector voices={voices} selectedId={voice} onSelect={handleSelectVoice} />
      </div>

      {/* Confirmación para generar audio */}
      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)} title="Generar audio con esta voz">
        <p className="text-sm text-gray-300">Se generará o recuperará el audio para esta voz. ¿Deseas continuar?</p>
        <div className="mt-4 flex justify-end gap-2">
          <button className="btn-secondary" onClick={() => setConfirmOpen(false)}>Cancelar</button>
          <button className="btn-primary" onClick={confirmGenerate} disabled={generating}>{generating ? 'Generando…' : 'Sí, continuar'}</button>
        </div>
      </Modal>
    </div>
  );
}
