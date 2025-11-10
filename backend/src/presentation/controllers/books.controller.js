import { Controller, Post, Get, Param, Query, Body, Headers, Dependencies } from '@nestjs/common';
import { GenerateBookAudioUseCase } from '../../application/books/use-cases/generate-book-audio.use-case';
import { UpdateReadingUseCase } from '../../application/books/use-cases/update-reading.use-case';
import { LibrosUsuariosRepositoryImpl } from '../../infrastructure/database/supabase/libros_usuarios.repository.impl';
import { VocesRepositoryImpl } from '../../infrastructure/database/supabase/voces.repository.impl';
import { LibrosRepositoryImpl } from '../../infrastructure/database/supabase/libros.repository.impl';
import { ListVoicesForBookUseCase } from '../../application/books/use-cases/list-voices-for-book.use-case';
import { SupabaseService } from '../../infrastructure/supabase/supabase.service';
import EdgeTtsService from '../../infrastructure/tts/providers/edge-tts.service';
import { env } from '../../infrastructure/config/env';
import { downloadPdfBuffer, extractPdfText } from '../../application/books/services/pdf-text.service';

// Simple chunking helper (could be moved to a dedicated service file later)
function chunkTextByWords(text, maxWords = 800) {
	const words = text.trim().split(/\s+/).filter(Boolean);
	const chunks = [];
	for (let i = 0; i < words.length; i += maxWords) {
		const slice = words.slice(i, i + maxWords);
		chunks.push({ index: chunks.length + 1, startWord: i, endWord: i + slice.length - 1, text: slice.join(' ') });
	}
	return { chunks, totalWords: words.length };
}

@Controller('books')
@Dependencies('LibrosRepository', 'VocesRepository', 'LibrosUsuariosRepository', SupabaseService, EdgeTtsService, GenerateBookAudioUseCase, UpdateReadingUseCase, ListVoicesForBookUseCase)
export class BooksController {
	constructor(librosRepository, vocesRepository, librosUsuariosRepository, supabase, tts, generateAudioUC, updateReadingUC, listVoicesUC) {
		this.librosRepository = librosRepository;
		this.vocesRepository = vocesRepository;
		this.librosUsuariosRepository = librosUsuariosRepository;
		this.supabase = supabase;
		this.tts = tts;
		this.generateAudioUC = generateAudioUC;
		this.updateReadingUC = updateReadingUC;
		this.listVoicesUC = listVoicesUC;
	}

	// Legacy single-file generation (already implemented in use-case)
	@Post(':id/audio')
	async generateSingle(@Param('id') id, @Body() body, @Headers('authorization') auth) {
		const token = auth?.replace(/^Bearer\s+/i, '') || body.token;
		const { voiceId, id_playbackrate } = body;
		const result = await this.generateAudioUC.execute({ token, id: Number(id), id_voz: Number(voiceId), id_playbackrate: Number(id_playbackrate) });
		return { ok: true, type: 'single', ...result };
	}

	// New chunked generation endpoint
	@Post(':id/audio-chunks')
	async generateChunks(@Param('id') id, @Body() body, @Headers('authorization') auth) {
		const token = auth?.replace(/^Bearer\s+/i, '') || body.token;
		const id_libro = Number(id);
		const voiceId = Number(body.voiceId || body.id_voz);
		const playbackRate = body.playbackRate ? Number(body.playbackRate) : 1.0;
		if (!voiceId || !Number.isFinite(voiceId)) return { ok: false, error: 'Invalid voiceId' };
		if (!id_libro || !Number.isFinite(id_libro)) return { ok: false, error: 'Invalid book id' };

		// Verify book & voice
		const book = await this.librosRepository.findById(id_libro);
		if (!book) return { ok: false, error: 'Libro no encontrado', status: 404 };
		const voice = await this.vocesRepository.findById(voiceId);
		if (!voice) return { ok: false, error: 'Voz no encontrada', status: 404 };
		const shortName = voice.short_name;

		const bucket = env.bucketAudios || 'audios_libros';
		const manifestPath = `${id_libro}/${voiceId}/manifest.json`;

		// If manifest exists return it
		try {
			const existing = await this.supabase.admin.storage.from(bucket).download(manifestPath);
			if (existing?.data) {
				const buf = Buffer.from(await existing.data.arrayBuffer());
				const manifest = JSON.parse(buf.toString('utf-8'));
				return { ok: true, reused: true, manifest };
			}
		} catch (_) { /* ignore */ }

		// Extract text
		const pdfBuffer = await downloadPdfBuffer(this.supabase, book.archivo);
		let text = await extractPdfText(pdfBuffer);
		if (!text || text.length < 50) {
			text = (book.descripcion || book.titulo || '').trim();
		}
		if (!text || text.length < 50) return { ok: false, error: 'No se pudo extraer texto significativo' };

		const { chunks, totalWords } = chunkTextByWords(text, 800);
		const audioMeta = [];
		for (const ch of chunks) {
			const audioBuf = await this.tts.synthesize({ text: ch.text, shortName });
			const fileName = `chunk-${String(ch.index).padStart(3, '0')}.mp3`;
			const path = `${id_libro}/${voiceId}/${fileName}`;
			const { error: upErr } = await this.supabase.admin.storage.from(bucket).upload(path, audioBuf, { contentType: 'audio/mpeg', upsert: true });
			if (upErr) throw new Error(upErr.message);
			const { data: pub } = this.supabase.admin.storage.from(bucket).getPublicUrl(path);
			audioMeta.push({ index: ch.index, file: fileName, url: pub.publicUrl, startWord: ch.startWord, endWord: ch.endWord });
		}

		const manifest = {
			bookId: id_libro,
			voiceId,
			shortName,
			playbackRate,
			createdAt: new Date().toISOString(),
			totalChunks: audioMeta.length,
			totalWords,
			chunks: audioMeta,
		};

		const manifestBuffer = Buffer.from(JSON.stringify(manifest));
		const { error: manErr } = await this.supabase.admin.storage.from(bucket).upload(manifestPath, manifestBuffer, { contentType: 'application/json', upsert: true });
		if (manErr) throw new Error(manErr.message);

		return { ok: true, reused: false, manifest };
	}

		@Get(':id/voices')
		async listVoices(@Param('id') id) {
			const id_libro = Number(id);
			if (!id_libro || !Number.isFinite(id_libro)) return { ok: false, error: 'Invalid book id' };
			const voices = await this.listVoicesUC.execute({ id: id_libro });
			return { ok: true, voices };
		}

	// Retrieve existing manifest & chunk URLs
	@Get(':id/audio-chunks')
	async getChunks(@Param('id') id, @Query('voiceId') voiceId) {
		const id_libro = Number(id);
		const vId = Number(voiceId);
		if (!id_libro || !Number.isFinite(id_libro)) return { ok: false, error: 'Invalid book id' };
		if (!vId || !Number.isFinite(vId)) return { ok: false, error: 'Invalid voiceId' };
		const bucket = env.bucketAudios || 'audios_libros';
		const manifestPath = `${id_libro}/${vId}/manifest.json`;
		try {
			const existing = await this.supabase.admin.storage.from(bucket).download(manifestPath);
			if (!existing?.data) return { ok: false, status: 404, error: 'Manifest no encontrado' };
			const buf = Buffer.from(await existing.data.arrayBuffer());
			const manifest = JSON.parse(buf.toString('utf-8'));
			return { ok: true, manifest };
		} catch (e) {
			return { ok: false, status: 404, error: 'Manifest no encontrado' };
		}
	}
}

export default BooksController;