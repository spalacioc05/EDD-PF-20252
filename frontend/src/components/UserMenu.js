"use client";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { User, LogOut, Pencil, ChevronDown } from "lucide-react";
import Modal from "@/components/Modal";
import { tbl_Usuarios } from "@/data/mockData";

export default function UserMenu() {
  const router = useRouter();
  const [user, setUser] = useState(tbl_Usuarios[0]);
  useEffect(() => {
    try {
      const raw = localStorage.getItem("loom:user");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.correo) setUser((u) => ({ ...u, ...parsed }));
      } else {
        const correo = localStorage.getItem("loom:user_email");
        if (correo) setUser((u) => ({ ...u, correo }));
      }
    } catch {}
  }, []);
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const onClick = (e) => {
      if (open && ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full px-2 py-1 hover:bg-white/5"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <div className="h-8 w-8 rounded-full bg-[url('/media/profile1.jpg')] bg-cover bg-center border border-white/10" />
        <ChevronDown className="h-4 w-4 text-gray-300 hidden md:block" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            className="absolute right-0 mt-2 w-64 glass rounded-xl p-3 shadow-xl"
            role="menu"
          >
            <div className="flex items-center gap-3 p-2">
              <div className="h-10 w-10 rounded-full bg-[url('/media/profile1.jpg')] bg-cover bg-center border border-white/10" />
              <div>
                <p className="text-sm font-medium leading-5">{user.nombre}</p>
                <p className="text-xs text-gray-400 leading-4">{user.correo}</p>
              </div>
            </div>
            <div className="my-2 h-px bg-white/10" />
            <div className="flex flex-col">
              <Link href="/profile" className="rounded-lg px-3 py-2 hover:bg-white/5 flex items-center gap-2" role="menuitem">
                <User className="h-4 w-4" /> Ver perfil
              </Link>
              <button className="rounded-lg px-3 py-2 hover:bg-white/5 flex items-center gap-2 text-left" onClick={() => { setEditOpen(true); setOpen(false); }} role="menuitem">
                <Pencil className="h-4 w-4" /> Editar perfil
              </button>
              <button
                className="rounded-lg px-3 py-2 hover:bg-white/5 flex items-center gap-2 text-red-300 text-left"
                role="menuitem"
                onClick={async () => {
                  setOpen(false);
                  try {
                    const api = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
                    const token = typeof window !== 'undefined' ? localStorage.getItem("loom:token") : null;
                    await fetch(`${api}/auth/logout`, {
                      method: "POST",
                      headers: token ? { Authorization: `Bearer ${token}` } : {},
                    });
                  } catch {}
                  try {
                    localStorage.removeItem("loom:token");
                    localStorage.removeItem("loom:user");
                    localStorage.removeItem("loom:user_email");
                  } catch {}
                  router.push('/login');
                }}
              >
                <LogOut className="h-4 w-4" /> Cerrar sesión
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Editar perfil">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input className="rounded-lg bg-white/5 px-3 py-2" defaultValue={user.nombre} />
            <input className="rounded-lg bg-white/5 px-3 py-2" defaultValue={user.pais || "Colombia"} />
          </div>
          <input className="w-full rounded-lg bg-white/5 px-3 py-2" defaultValue={user.correo} />
          <div className="flex justify-end gap-2">
            <button className="rounded-lg px-4 py-2 bg-white/10" onClick={() => setEditOpen(false)}>Cancelar</button>
            <button className="btn-primary" onClick={() => setEditOpen(false)}>Guardar</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
