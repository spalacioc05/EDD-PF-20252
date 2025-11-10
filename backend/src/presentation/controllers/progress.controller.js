// Replace decorator-based controller with router registrations to avoid param decorator parsing issues.
import { UpdateReadingUseCase } from '../../application/books/use-cases/update-reading.use-case';

export function registerProgressRoutes(app, container) {
	const relRepo = container.get?.('LibrosUsuariosRepository');
	const updateUC = container.get?.(UpdateReadingUseCase);

	if (!app) return;
	app.get('/progress/books/:id', async (req, res) => {
		try {
			const id_libro = Number(req.params.id);
			const id_usuario = Number(req.headers['x-user-id']);
			if (!Number.isFinite(id_libro)) return res.status(400).json({ statusCode: 400, message: 'Invalid book id' });
			if (!Number.isFinite(id_usuario)) return res.status(400).json({ statusCode: 400, message: 'Missing user id' });
			const reading = await relRepo.findByUserAndBook(id_usuario, id_libro);
			if (!reading) return res.status(404).json({ statusCode: 404 });
			res.json({ ok: true, reading });
		} catch (e) {
			res.status(e?.status || 500).json({ statusCode: e?.status || 500, message: e?.message || 'Error', error: String(e) });
		}
	});

	app.put('/progress/books/:id', async (req, res) => {
		try {
			const id = Number(req.params.id);
			const auth = req.headers.authorization;
			const token = (auth || '').replace(/^Bearer\s+/i, '');
			const payload = {
				token,
				id,
				pagina: req.body?.pagina !== undefined ? Number(req.body.pagina) : undefined,
				palabra: req.body?.palabra !== undefined ? Number(req.body.palabra) : undefined,
				progreso: req.body?.progreso !== undefined ? Number(req.body.progreso) : undefined,
				tiempo_escucha: req.body?.tiempo_escucha !== undefined ? Number(req.body.tiempo_escucha) : undefined,
				id_estado: req.body?.id_estado !== undefined ? Number(req.body.id_estado) : undefined,
				audio: req.body?.audio,
				id_voz: req.body?.voiceId !== undefined ? Number(req.body.voiceId) : (req.body?.id_voz !== undefined ? Number(req.body.id_voz) : undefined),
				id_playbackrate: req.body?.playbackRate !== undefined ? Number(req.body.playbackRate) : (req.body?.id_playbackrate !== undefined ? Number(req.body.id_playbackrate) : undefined),
			};
			const result = await updateUC.execute(payload);
			res.json({ ok: true, ...result });
		} catch (e) {
			res.status(e?.status || 500).json({ statusCode: e?.status || 500, message: e?.message || 'Error', error: String(e) });
		}
	});
}

export default registerProgressRoutes;