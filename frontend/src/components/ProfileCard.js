"use client";
import { Calendar, Mail, Phone, Pencil } from "lucide-react";
import { motion } from "framer-motion";

export default function ProfileCard({ user, onEdit }) {
  const foto = typeof user.foto_perfil === 'string' && user.foto_perfil.startsWith('http') ? user.foto_perfil : '';
  const initials = (user?.nombre || user?.correo || 'U').trim().split(/\s+/).map(s=>s[0]).slice(0,2).join('').toUpperCase();
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="card p-4 flex items-center gap-4">
      <div className="h-16 w-16 rounded-full border border-white/10 overflow-hidden flex items-center justify-center bg-gradient-to-br from-purple-600/40 to-indigo-600/40">
        {foto ? (
          <div className="h-full w-full bg-cover bg-center" style={{ backgroundImage: `url('${foto}')` }} />
        ) : (
          <span className="text-white/90 font-semibold">{initials}</span>
        )}
      </div>
      <div className="flex-1">
        <h3 className="text-lg font-semibold">{user.nombre}</h3>
        <div className="mt-1 space-y-1 text-sm" style={{ color: "var(--color-foreground)" }}>
          <div className="flex items-center gap-2"><Mail size={16} className="icon-muted" />{user.correo}</div>
          {user.telefono && <div className="flex items-center gap-2"><Phone size={16} className="icon-muted" />{user.telefono}</div>}
          <div className="flex items-center gap-2"><Calendar size={16} className="icon-muted" />Registro: {new Date(user.fecha_registro).toLocaleDateString()}</div>
        </div>
      </div>
      <button onClick={onEdit} className="btn-primary"><Pencil size={16} />Editar perfil</button>
    </motion.div>
  );
}
