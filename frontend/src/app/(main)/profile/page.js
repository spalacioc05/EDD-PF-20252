"use client";
import { useState } from "react";
import ProfileCard from "@/components/ProfileCard";
import Modal from "@/components/Modal";
import BookCard from "@/components/BookCard";
import { tbl_Usuarios, tbl_Publicados, tbl_Libros } from "@/data/mockData";

export default function ProfilePage() {
  const user = tbl_Usuarios[0];
  const [editOpen, setEditOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const misLibros = tbl_Publicados
    .filter((p) => p.id_usuario === user.id_usuario)
    .map((p) => tbl_Libros.find((b) => b.id_libro === p.id_libro));

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <ProfileCard user={user} onEdit={() => setEditOpen(true)} />
        <div className="hidden md:flex flex-col items-end gap-2">
          <a href="/login" className="rounded-lg px-4 py-2 bg-white/10 hover:bg-white/20">Cerrar sesión</a>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Mis libros</h2>
        <button onClick={() => setUploadOpen(true)} className="btn-primary">Subir nuevo libro</button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {misLibros.map((b) => (
          <BookCard key={b.id_libro} book={b} />
        ))}
      </div>

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Editar perfil">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input className="rounded-lg bg-white/5 px-3 py-2" defaultValue={user.nombre} />
            <input className="rounded-lg bg-white/5 px-3 py-2" defaultValue={user.pais} />
          </div>
          <input className="w-full rounded-lg bg-white/5 px-3 py-2" defaultValue={user.correo} />
          <div className="flex justify-end gap-2">
            <button className="rounded-lg px-4 py-2 bg-white/10">Cancelar</button>
            <button className="btn-primary" onClick={() => setEditOpen(false)}>Guardar</button>
          </div>
        </div>
      </Modal>

      <Modal open={uploadOpen} onClose={() => setUploadOpen(false)} title="Subir nuevo libro">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input placeholder="Título" className="rounded-lg bg-white/5 px-3 py-2" />
            <input placeholder="Autor" className="rounded-lg bg-white/5 px-3 py-2" />
          </div>
          <textarea placeholder="Descripción" className="w-full rounded-lg bg-white/5 px-3 py-2" rows={3} />
          <button className="rounded-lg bg-white/10 px-3 py-2 w-full">Seleccionar PDF</button>
          <div className="flex justify-end gap-2">
            <button className="rounded-lg px-4 py-2 bg-white/10">Cancelar</button>
            <button className="btn-primary" onClick={() => setUploadOpen(false)}>Subir</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
