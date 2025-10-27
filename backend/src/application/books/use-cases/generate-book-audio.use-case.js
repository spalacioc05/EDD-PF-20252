import { verify } from 'jsonwebtoken';
import { env } from '../../../infrastructure/config/env';
import { downloadPdfBuffer, extractPdfText } from '../services/pdf-text.service';

export class GenerateBookAudioUseCase {
  constructor(librosRepository, vocesRepository, librosUsuariosRepository, supabaseService, ttsService) {
    this.librosRepository = librosRepository;
    this.vocesRepository = vocesRepository;
    this.librosUsuariosRepository = librosUsuariosRepository;
    this.supabaseService = supabaseService;
    this.ttsService = ttsService;
  }

  async execute({ token, id, id_voz, id_playbackrate } = {}) {
    if (!token) { const err = new Error('Missing token'); err.status = 401; throw err; }
    let payload; try { payload = verify(token, env.jwtSecret); } catch (_) { const err = new Error('Invalid token'); err.status = 401; throw err; }
    const userId = payload?.sub || payload?.id_usuario || payload?.id;
    if (!userId) { const err = new Error('Invalid token payload'); err.status = 401; throw err; }
    if (!id || !Number.isFinite(id)) { const err = new Error('Invalid book id'); err.status = 400; throw err; }
  if (!id_voz || !Number.isFinite(id_voz)) { const err = new Error('Invalid voice id'); err.status = 400; throw err; }
  if (id_voz < 1 || id_voz > 16) { const err = new Error('Voz no permitida'); err.status = 400; throw err; }

    const book = await this.librosRepository.findById(id);
    if (!book) { const err = new Error('Libro no encontrado'); err.status = 404; throw err; }
    const voice = await this.vocesRepository.findById(id_voz);
    if (!voice) { const err = new Error('Voz no encontrada'); err.status = 404; throw err; }
    const shortName = voice.short_name;
    const bucket = env.bucketAudios || 'audios_libros';
    const fileName = `${shortName}.mp3`;
    const dir = `${id}`;
    const path = `${dir}/${fileName}`;

    // If audio exists, return it
    try {
      const { data: list } = await this.supabaseService.admin.storage.from(bucket).list(dir, { search: fileName });
      if (Array.isArray(list) && list.find((f) => f.name === fileName)) {
        const { data: pub } = this.supabaseService.admin.storage.from(bucket).getPublicUrl(path);
        const audioUrl = pub.publicUrl;
        // Update relation with id_voz, id_playbackrate, audio (don't reset progress)
        await this.librosUsuariosRepository.updateProgress(userId, id, { id_voz, id_playbackrate, audio: audioUrl });
        return { audioUrl, reading: await this.librosUsuariosRepository.findByUserAndBook(userId, id) };
      }
    } catch (_) {}

    // Generate TTS audio
    const buffer = await downloadPdfBuffer(this.supabaseService, book.archivo);
    let text = await extractPdfText(buffer);
    if (!text || text.length < 50) {
      // Do not proceed if no real text could be extracted
      const fallback = (book.descripcion || book.titulo || '').trim();
      if (!fallback || fallback.length < 50) {
        const err = new Error('No se pudo extraer texto significativo del PDF');
        err.status = 400;
        throw err;
      }
      text = fallback;
    }
    // Edge-tts is limited by input size; chunk by ~4000 chars to be safe
    const chunks = [];
    const max = 4000;
    for (let i = 0; i < text.length; i += max) chunks.push(text.slice(i, i + max));
    const audioChunks = [];
    for (const chunk of chunks) {
      const b = await this.ttsService.synthesize({ text: chunk, shortName });
      if (!b || b.length === 0) {
        const err = new Error('Fallo la síntesis de audio para un fragmento');
        err.status = 502;
        throw err;
      }
      audioChunks.push(b);
    }
    const audioBuffer = Buffer.concat(audioChunks);
    if (!audioBuffer || audioBuffer.length < 50000) {
      const err = new Error('El audio generado es demasiado corto');
      err.status = 502;
      throw err;
    }

    // Upload to storage
    const { error: upErr } = await this.supabaseService.admin.storage.from(bucket).upload(path, audioBuffer, { contentType: 'audio/mpeg', upsert: true });
    if (upErr) { const err = new Error(upErr.message); err.status = 500; throw err; }
    const { data: pub } = this.supabaseService.admin.storage.from(bucket).getPublicUrl(path);
    const audioUrl = pub.publicUrl;

    // Ensure reading relation exists and update fields
    await this.librosUsuariosRepository.startReading(userId, id);
    await this.librosUsuariosRepository.updateProgress(userId, id, { id_voz, id_playbackrate, audio: audioUrl });
    const reading = await this.librosUsuariosRepository.findByUserAndBook(userId, id);
    return { audioUrl, reading };
  }
}

export default GenerateBookAudioUseCase;