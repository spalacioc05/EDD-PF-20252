"use client";
import { BookOpen, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";

export default function LoginPage() {
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
            <p className="mt-1 text-gray-300 text-sm">Accede con tu cuenta de Google. No pedimos correo ni contraseña.</p>

            <Link href="/" className="mt-6 inline-flex w-full items-center justify-center gap-3 rounded-xl bg-white/10 px-4 py-3 text-white hover:bg-white/20 transition">
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="h-5 w-5" />
              <span>Continuar con Google</span>
            </Link>

            <p className="mt-4 text-center text-xs text-gray-400">Al continuar aceptas nuestros <span className="underline decoration-white/20">Términos</span> y <span className="underline decoration-white/20">Privacidad</span>.</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
