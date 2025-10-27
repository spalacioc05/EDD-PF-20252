"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import ProfileCard from "@/components/ProfileCard";
import Modal from "@/components/Modal";
import BookCard from "@/components/BookCard";
import { tbl_Publicados, tbl_Libros } from "@/data/mockData";
import { getApiUrl } from "@/lib/auth";

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [editNombre, setEditNombre] = useState("");
  const [photos, setPhotos] = useState([]);
  const [preview, setPreview] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const token = localStorage.getItem("loom:token");
        if (!token) { router.replace('/login'); return; }
        const res = await fetch(`${getApiUrl()}/users/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('No se pudo cargar el perfil');
        const data = await res.json();
        setUser(data.user);
        setEditNombre(data.user?.nombre || "");
        // cargar historial de fotos
        const ph = await fetch(`${getApiUrl()}/users/me/photos`, { headers: { Authorization: `Bearer ${token}` } });
        if (ph.ok) {
          const list = await ph.json();
          setPhotos(Array.isArray(list.files) ? list.files : []);
        }
      } catch (e) {
        // fallback: redirect to login
        router.replace('/login');
      } finally { setLoading(false); }
    })();
  }, [router]);

  const misLibros = user ? tbl_Publicados
    .filter((p) => p.id_usuario === user.id_usuario)
    .map((p) => tbl_Libros.find((b) => b.id_libro === p.id_libro)) : [];

  if (loading) return <div className="py-10 text-center text-gray-400">Cargando perfil...</div>;
  if (!user) return null;

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
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3">
            <label className="text-sm text-gray-300">Nombre</label>
            <input className="rounded-lg bg-white/5 px-3 py-2" value={editNombre} onChange={e=>setEditNombre(e.target.value)} />
          </div>
          <div className="grid grid-cols-1 gap-2">
            <label className="text-sm text-gray-300">Foto de perfil</label>
            {preview ? (
              <div className="flex items-center gap-3">
                <img src={preview} alt="Vista previa" className="h-16 w-16 rounded-full object-cover border border-white/10" />
                <button className="rounded-lg px-3 py-2 bg-white/10" onClick={() => setPreview(null)}>Quitar</button>
              </div>
            ) : null}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="rounded-lg bg-white/5 px-3 py-2"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) {
                  const url = URL.createObjectURL(f);
                  setPreview(url);
                } else {
                  setPreview(null);
                }
              }}
            />
            <div className="flex gap-2">
              <button
                className="rounded-lg bg-white/10 px-3 py-2"
                onClick={async () => {
                  try {
                    if (!fileInputRef.current?.files?.[0]) return;
                    const token = localStorage.getItem('loom:token');
                    const fd = new FormData();
                    fd.append('file', fileInputRef.current.files[0]);
                    const res = await fetch(`${getApiUrl()}/users/me/photo`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd });
                    let data = null;
                    try { data = await res.json(); } catch { /* puede venir HTML si hay error inesperado */ }
                    if (res.ok) {
                      setUser(data.user);
                      localStorage.setItem('loom:user', JSON.stringify(data.user));
                      window.dispatchEvent(new Event('loom:user-updated'));
                      // actualizar galería
                      setPhotos((prev) => [{ name: (data.path||'').split('/').pop(), path: data.path, url: data.url }, ...prev]);
                      // limpiar input y preview
                      if (fileInputRef.current) fileInputRef.current.value = '';
                      if (preview) { URL.revokeObjectURL(preview); setPreview(null); }
                    } else {
                      const msg = (data && data.message) ? data.message : `Error ${res.status}`;
                      alert(msg || 'No se pudo subir la foto');
                    }
                  } catch (e) {
                    alert('No se pudo subir la foto');
                  }
                }}
              >Subir nueva foto</button>
            </div>
            {photos?.length ? (
              <div className="mt-2">
                <div className="text-sm text-gray-300 mb-2">Historial de fotos</div>
                <div className="grid grid-cols-5 gap-2">
                  {photos.map((p) => (
                    <button key={p.path || p.url}
                      className={`relative rounded-lg overflow-hidden border ${user?.foto_perfil && (user.foto_perfil === p.url) ? 'border-indigo-400' : 'border-white/10'}`}
                      onClick={async () => {
                        try {
                          const token = localStorage.getItem('loom:token');
                          const body = p.path && !p.url?.startsWith('http') ? { path: p.path } : { path: (p.path || new URL(p.url).pathname.substring(1)) };
                          const res = await fetch(`${getApiUrl()}/users/me/photo`, { method: 'PATCH', headers: { 'Content-Type':'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(body) });
                          const data = await res.json();
                          if (res.ok) {
                            setUser(data.user);
                            localStorage.setItem('loom:user', JSON.stringify(data.user));
                            window.dispatchEvent(new Event('loom:user-updated'));
                          } else {
                            alert(data?.message || 'No se pudo actualizar la foto');
                          }
                        } catch (e) {
                          alert('Error al actualizar la foto');
                        }
                      }}
                    >
                      <img src={p.url} alt={p.name} className="h-16 w-16 object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-300">Estado: {Number(user.id_estado) === 1 ? 'Activo' : 'Inactivo'}</div>
            <button className="rounded-lg px-4 py-2 bg-white/10 text-red-300" onClick={async()=>{
              if (!confirm('¿Deseas inactivar tu cuenta?')) return;
              const token = localStorage.getItem('loom:token');
              const res = await fetch(`${getApiUrl()}/users/me`, { method: 'PATCH', headers: { 'Content-Type':'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ id_estado: 2 }) });
              if (res.ok) {
                // Cerrar sesión y enviar a login
                localStorage.removeItem('loom:token');
                localStorage.removeItem('loom:user');
                localStorage.removeItem('loom:user_email');
                router.replace('/login');
              }
            }}>Inactivar cuenta</button>
          </div>
          <div className="flex justify-end gap-2">
            <button className="rounded-lg px-4 py-2 bg-white/10" onClick={()=>setEditOpen(false)}>Cerrar</button>
            <button className="btn-primary" onClick={async ()=>{
              const token = localStorage.getItem('loom:token');
              const res = await fetch(`${getApiUrl()}/users/me`, { method: 'PATCH', headers: { 'Content-Type':'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ nombre: editNombre }) });
              const data = await res.json();
              if (res.ok) { setUser(data.user); localStorage.setItem('loom:user', JSON.stringify(data.user)); setEditOpen(false); }
            }}>Guardar</button>
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
