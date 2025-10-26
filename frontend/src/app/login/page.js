"use client";
import { useState } from "react";
import { BookOpen, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const trimmed = email.trim();
    // Validación muy básica de correo
    const isValid = /.+@.+\..+/.test(trimmed);
    if (!isValid) {
      setError("Ingresa un correo electrónico válido");
      return;
    }

    try {
      const api = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
      let res = await fetch(`${api}/auth/login?correo=${encodeURIComponent(trimmed)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      let data = await res.json();
      if (!res.ok) {
        // Si está inactiva, ofrecer reactivar
        if (res.status === 403 && data?.code === 'inactive_user') {
          const confirmRe = window.confirm('Tu cuenta está inactiva. ¿Deseas reactivarla?');
          if (!confirmRe) return;
          res = await fetch(`${api}/auth/reactivate?correo=${encodeURIComponent(trimmed)}`, { method: 'POST' });
          data = await res.json();
        }
        if (!res.ok) throw new Error(data?.message || "No se pudo iniciar sesión");
      }
      // Persistir sesión
      localStorage.setItem("loom:user_email", trimmed);
      if (data?.token) localStorage.setItem("loom:token", data.token);
      if (data?.user) localStorage.setItem("loom:user", JSON.stringify(data.user));
      router.push("/");
    } catch (err) {
      setError(err?.message || "Error de inicio de sesión");
    }
  };
  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#1F1F25] via-[#262633] to-[#1F1F25]" />
      <div className="pointer-events-none absolute -top-40 -left-40 h-80 w-80 rounded-full bg-[#6C63FF]/25 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-80 w-80 rounded-full bg-[#A78BFA]/25 blur-3xl" />

      <div className="relative mx-auto grid min-h-screen max-w-6xl grid-cols-1 md:grid-cols-2">
        {/* Brand panel */}
        <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }} className="flex items-center p-8">
          <div>
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-2xl bg-[color:var(--color-primary)] flex items-center justify-center shadow-xl">
                <BookOpen className="h-6 w-6 text-white" />
              </div>
              <span className="text-2xl font-semibold text-gradient">LOOM</span>
            </div>
            <h1 className="mt-6 text-3xl md:text-4xl font-bold leading-tight">Donde los libros se <span className="text-gradient">escuchan</span></h1>
            <p className="mt-3 text-gray-300 max-w-md">Inicia sesión para acceder a tu biblioteca, continuar tu lectura y descubrir nuevas narraciones con voz humana.</p>
            <ul className="mt-6 grid gap-3 text-sm text-gray-200">
              <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[color:var(--color-accent)]" /> Continuar escuchando donde ibas</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[color:var(--color-accent)]" /> Voces naturales y velocidades personalizadas</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[color:var(--color-accent)]" /> Sube tus propios libros en PDF</li>
            </ul>
          </div>
        </motion.div>

        {/* Login card */}
        <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }} className="flex items-center p-8">
          <div className="glass w-full rounded-3xl p-8 md:p-10">
            <h2 className="text-2xl font-semibold">Iniciar sesión</h2>
            <p className="mt-1 text-gray-300 text-sm">Ingresa tu correo electrónico y pulsa Entrar.</p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm text-gray-300 mb-1">Correo electrónico</label>
                <input
                  id="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="tu@correo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl bg-white/10 px-4 py-3 text-white placeholder:text-gray-400 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-[color:var(--color-primary)]"
                  required
                />
                {error && <p className="mt-2 text-xs text-red-300">{error}</p>}
              </div>
              <button type="submit" className="w-full btn-primary">Entrar</button>
            </form>

            <p className="mt-4 text-center text-xs text-gray-400">Al continuar aceptas nuestros <span className="underline decoration-white/20">Términos</span> y <span className="underline decoration-white/20">Privacidad</span>.</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
