import BookPlayer from "@/components/BookPlayer";
import {
  tbl_Libros,
  tbl_PlaybackRate,
  tbl_Voces,
  getAutoresByLibroId,
  getGenerosByLibroId,
} from "@/data/mockData";

export default async function BookDetail({ params }) {
  const { id } = await params; // Next 15: params is a Promise in server components
  const numId = Number(id);
  const book = tbl_Libros.find((b) => b.id_libro === numId);
  if (!book) {
    return (
      <div className="card p-6">
        <h1 className="text-xl font-semibold mb-2">Libro no encontrado</h1>
        <p className="text-gray-300">El recurso que buscas no existe. Vuelve al inicio para explorar más títulos.</p>
      </div>
    );
  }
  const autores = getAutoresByLibroId(book.id_libro);
  const generos = getGenerosByLibroId(book.id_libro);

  // Estado interactivo movido al componente cliente <BookPlayer />

  return (
    <div className="grid lg:grid-cols-[280px_1fr] gap-6">
      <div className="card p-4">
        <div className="aspect-[3/4] w-full overflow-hidden rounded-lg bg-white/5">
          <div className="h-full w-full bg-cover bg-center" style={{ backgroundImage: `url(${book.portada})` }} />
        </div>
        <div className="mt-4 space-y-1">
          <h1 className="text-xl font-semibold">{book.titulo}</h1>
          <p className="text-gray-300">{autores.map((a)=>a.nombre).join(", ")}</p>
          <p className="text-xs text-gray-400">{generos.map((g)=>g.nombre).join(" · ")}</p>
        </div>
      </div>

      <div className="space-y-6">
        <div className="card p-4">
          <h2 className="font-semibold mb-2">Descripción</h2>
          <p className="text-gray-300">{book.descripcion}</p>
        </div>

        <BookPlayer
          playbackRates={tbl_PlaybackRate}
          voices={tbl_Voces}
          defaultRateId={2}
          defaultVoiceId={1}
          defaultProgress={0.32}
          fragment={book.descripcion}
        />

        <div className="card p-4">
          <h2 className="font-semibold mb-2">Sobre el autor</h2>
      <p className="text-gray-300">{autores?.[0]?.descripcion}</p>
        </div>
      </div>
    </div>
  );
}
