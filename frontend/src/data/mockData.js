// Datos simulados 100% alineados al esquema proporcionado

// ===================
// TABLAS BASE
// ===================
export const tbl_Estados = [
  { id_estado: 1, nombre: "activo" },
  { id_estado: 2, nombre: "inactivo" },
];

export const tbl_Paises = [
  { id_pais: 1, nombre: "Colombia" },
  { id_pais: 2, nombre: "México" },
  { id_pais: 3, nombre: "España" },
];

export const tbl_Usuarios = [
  {
    id_usuario: 1,
    id_supabase: "user_123",
    nombre: "Sofía Palacios",
    correo: "sofia@example.com",
    telefono: "+57 300 000 0000",
    fecha_nacimiento: "2003-04-10",
    fecha_registro: "2025-01-12T10:00:00Z",
    foto_perfil: "/media/profile1.jpg",
    id_estado: 1,
    ultimo_login: "2025-10-10T12:00:00Z",
  },
];

// ===================
// LIBROS Y RELACIONES
// ===================
export const tbl_Libros = [
  {
    id_libro: 101,
    titulo: "Latidos en la Ciudad",
    descripcion: "Una historia de amor en medio del caos urbano.",
    fecha_publicacion: "2022-05-01",
    portada: "/media/cover1.jpg",
    archivo: "/media/sample1.pdf",
    url_audio: null,
    paginas: 320,
    palabras: 78000,
    id_estado: 1,
  },
  {
    id_libro: 102,
    titulo: "Éter y Silicio",
    descripcion: "Viaje a un futuro donde las emociones son código.",
    fecha_publicacion: "2023-02-10",
    portada: "/media/cover2.jpg",
    archivo: "/media/sample2.pdf",
    url_audio: null,
    paginas: 280,
    palabras: 69000,
    id_estado: 1,
  },
  {
    id_libro: 103,
    titulo: "La Sombra del Recuerdo",
    descripcion: "Una detective enfrenta su pasado.",
    fecha_publicacion: "2021-09-18",
    portada: "/media/cover3.jpg",
    archivo: "/media/sample3.pdf",
    url_audio: null,
    paginas: 350,
    palabras: 92000,
    id_estado: 1,
  },
  {
    id_libro: 104,
    titulo: "Reinos de Bruma",
    descripcion: "Magia antigua despierta en un mundo dividido.",
    fecha_publicacion: "2024-06-20",
    portada: "/media/cover4.jpg",
    archivo: "/media/sample4.pdf",
    url_audio: null,
    paginas: 410,
    palabras: 110000,
    id_estado: 1,
  },
];

export const tbl_Autores = [
  { id_autor: 1, nombre: "Isabel Márquez", descripcion: "Autora de novelas románticas contemporáneas.", foto: null, fecha_nacimiento: "1985-03-11", fecha_muerte: null, id_pais: 1 },
  { id_autor: 2, nombre: "Lucas Andrade", descripcion: "Ciencia ficción con enfoque humano y ético.", foto: null, fecha_nacimiento: "1990-07-24", fecha_muerte: null, id_pais: 2 },
  { id_autor: 3, nombre: "Ana Rivas", descripcion: "Misterios psicológicos con giros inesperados.", foto: null, fecha_nacimiento: "1978-12-02", fecha_muerte: null, id_pais: 3 },
];

export const tbl_Generos = [
  { id_genero: 1, nombre: "Romance" },
  { id_genero: 2, nombre: "Ciencia Ficción" },
  { id_genero: 3, nombre: "Misterio" },
  { id_genero: 4, nombre: "Fantasía" },
  { id_genero: 5, nombre: "No Ficción" },
];

export const tbl_Libros_X_Autores = [
  { id_libro_autor: 1, id_libro: 101, id_autor: 1 },
  { id_libro_autor: 2, id_libro: 102, id_autor: 2 },
  { id_libro_autor: 3, id_libro: 103, id_autor: 3 },
  { id_libro_autor: 4, id_libro: 104, id_autor: 2 },
];

export const tbl_Libros_X_Generos = [
  { id_libro_genero: 1, id_libro: 101, id_genero: 1 },
  { id_libro_genero: 2, id_libro: 102, id_genero: 2 },
  { id_libro_genero: 3, id_libro: 103, id_genero: 3 },
  { id_libro_genero: 4, id_libro: 104, id_genero: 4 },
];

// ===================
// VOCES Y CONFIGURACIONES
// ===================
export const tbl_Modelos = [
  { id_modelo: 1, nombre: "wavenet" },
  { id_modelo: 2, nombre: "neural2" },
];

export const tbl_Tonos = [
  { id_tono: 1, nombre: "neutral" },
  { id_tono: 2, nombre: "happy" },
];

export const tbl_Idiomas = [
  { id_idioma: 1, codigo: "es-ES", nombre: "Español (España)" },
  { id_idioma: 2, codigo: "en-US", nombre: "Inglés (EE.UU.)" },
];

export const tbl_GenerosVoz = [
  { id_genero_voz: 1, nombre: "Femenino" },
  { id_genero_voz: 2, nombre: "Masculino" },
];

export const tbl_Voces = [
  { id_voz: 1, nombre: "Lucía", id_idioma: 1, id_genero_voz: 1, id_tono: 1, id_modelo: 1 },
  { id_voz: 2, nombre: "Mateo", id_idioma: 1, id_genero_voz: 2, id_tono: 1, id_modelo: 2 },
  { id_voz: 3, nombre: "Ava", id_idioma: 2, id_genero_voz: 1, id_tono: 2, id_modelo: 1 },
];

export const tbl_PlaybackRate = [
  { id_playbackrate: 1, velocidad: 0.75 },
  { id_playbackrate: 2, velocidad: 1.0 },
  { id_playbackrate: 3, velocidad: 1.25 },
  { id_playbackrate: 4, velocidad: 1.5 },
  { id_playbackrate: 5, velocidad: 2.0 },
];

// ===================
// LECTURA Y PROGRESO
// ===================
export const tbl_Libros_X_Usuarios = [
  { id_libro_usuario: 1, id_usuario: 1, id_libro: 101, id_voz: 1, id_playbackrate: 2, pagina: 55, palabra: 12, progreso: 65.0, tiempo_escucha: 2400, fecha_ultima_lectura: "2025-10-10", id_estado: 1 },
  { id_libro_usuario: 2, id_usuario: 1, id_libro: 102, id_voz: 2, id_playbackrate: 2, pagina: 12, palabra: 3, progreso: 20.0, tiempo_escucha: 600, fecha_ultima_lectura: "2025-10-09", id_estado: 1 },
  { id_libro_usuario: 3, id_usuario: 1, id_libro: 103, id_voz: 1, id_playbackrate: 3, pagina: 200, palabra: 8, progreso: 90.0, tiempo_escucha: 4000, fecha_ultima_lectura: "2025-10-08", id_estado: 1 },
];

export const tbl_Publicados = [
  { id_publicado: 1, id_usuario: 1, id_libro: 104 },
];

// ===================
// HELPERS
// ===================
export const getAutorById = (id) => tbl_Autores.find((a) => a.id_autor === id);
export const getGeneroById = (id) => tbl_Generos.find((g) => g.id_genero === id);
export const getIdiomaById = (id) => tbl_Idiomas.find((i) => i.id_idioma === id);
export const getGeneroVozById = (id) => tbl_GenerosVoz.find((g) => g.id_genero_voz === id);

export const getAutoresByLibroId = (id_libro) => {
  const joins = tbl_Libros_X_Autores.filter((j) => j.id_libro === id_libro);
  return joins.map((j) => getAutorById(j.id_autor));
};

export const getGenerosByLibroId = (id_libro) => {
  const joins = tbl_Libros_X_Generos.filter((j) => j.id_libro === id_libro);
  return joins.map((j) => getGeneroById(j.id_genero));
};

export const getAutorNamesByLibroId = (id_libro) => {
  const autores = getAutoresByLibroId(id_libro) || [];
  return autores.map((a) => a?.nombre).filter(Boolean).join(", ");
};

export const getVozMeta = (voz) => {
  const idioma = getIdiomaById(voz.id_idioma);
  const genero = getGeneroVozById(voz.id_genero_voz);
  return { idiomaCodigo: idioma?.codigo, idiomaNombre: idioma?.nombre, generoNombre: genero?.nombre };
};