import BookPlayer from "@/components/BookPlayer";
import BookReadingActions from "@/components/BookReadingActions";
import BookVoices from "@/components/BookVoices";
import { getApiUrl } from "@/lib/auth";

export default async function BookDetail({ params }) {
  const { id } = await params; // Next 15: params is a Promise in server components
  const numId = Number(id);
  const api = getApiUrl();
  let book = null;
  try {
    const res = await fetch(`${api}/books/${numId}`, { cache: 'no-store' });
    if (res.ok) {
      book = await res.json();
    }
  } catch {}

  if (!book) {
    return (
      <div className="card p-6">
        <h1 className="text-xl font-semibold mb-2">Libro no encontrado</h1>
        <p className="text-gray-300">El recurso que buscas no existe. Vuelve al inicio para explorar más títulos.</p>
      </div>
    );
  }

  return (
    <div className="grid lg:grid-cols-[280px_1fr] gap-6">
      <div className="card p-4">
        <div className="aspect-[3/4] w-full overflow-hidden rounded-lg bg-white/5">
          <div className="h-full w-full bg-cover bg-center" style={{ backgroundImage: `url(${book.portada || ''})` }} />
        </div>
        <div className="mt-4 space-y-1">
          <h1 className="text-xl font-semibold">{book.titulo}</h1>
          {book.paginas != null && (
            <p className="text-xs text-gray-400">{book.paginas} páginas · {book.palabras ?? 0} palabras</p>
          )}
        </div>
      </div>

      <div className="space-y-6">
        <div className="card p-4">
          <h2 className="font-semibold mb-2">Descripción</h2>
          <p className="text-gray-300">{book.descripcion || 'Sin descripción'}</p>
        </div>

        <BookReadingActions bookId={numId} />
        <BookVoices bookId={numId} fragment={book.descripcion || ''} />
        {/* BookPlayer is rendered inside BookVoices with proper voices list */}
      </div>
    </div>
  );
}
