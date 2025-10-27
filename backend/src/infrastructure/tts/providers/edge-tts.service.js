import { Injectable, Dependencies } from '@nestjs/common';
import { env } from '../../config/env';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from 'ffmpeg-static';

let edgeTTS = null;
try {
  // Lazy import to avoid failing environments without network
  edgeTTS = require('edge-tts');
} catch (_) {
  edgeTTS = null;
}

@Injectable()
export class EdgeTtsService {
  constructor() {
    if (ffmpegPath) {
      try { ffmpeg.setFfmpegPath(ffmpegPath); } catch (_) {}
    }
  }

  async synthesize({ text, shortName, format = 'audio-24khz-48kbitrate-mono-mp3' }) {
    if (!text || !shortName) throw new Error('Missing text or shortName');
    const disabled = process.env.DISABLE_TTS === '1' || process.env.DISABLE_TTS === 'true' || env.ttsDisabled;
    if (process.env.DEBUG_TTS) {
      // eslint-disable-next-line no-console
      console.log('[EdgeTtsService] disabled?', !!disabled, 'edgeTTS?', !!edgeTTS);
    }
    if (disabled || !edgeTTS) {
      if (process.env.NODE_ENV === 'test') {
        // In tests, keep a tiny silent file to avoid network
        return await this._generateSilentMp3(1);
      }
      throw new Error('TTS is disabled or unavailable');
    }
    try {
      const stream = await edgeTTS.synthesize({ input: text, voice: shortName, format });
      // edge-tts returns { audioData: Buffer, ... } in recent versions
      if (stream?.audioData) return Buffer.from(stream.audioData);
      // Some versions return AsyncIterable chunks
      const chunks = [];
      for await (const data of stream) {
        if (data?.type === 'audio') chunks.push(Buffer.from(data.data));
      }
      const buf = Buffer.concat(chunks);
      if (!buf || buf.length < 1000) throw new Error('Generated audio too short');
      return buf;
    } catch (e) {
      if (process.env.NODE_ENV === 'test') {
        return await this._generateSilentMp3(1);
      }
      throw e;
    }
  }

  _generateSilentMp3(seconds = 2) {
    return new Promise((resolve, reject) => {
      const chunks = [];
      try {
        ffmpeg()
          .input('anullsrc')
          .inputFormat('lavfi')
          .audioCodec('libmp3lame')
          .audioBitrate('128k')
          .duration(seconds)
          .format('mp3')
          .on('error', (err) => reject(err))
          .on('end', () => resolve(Buffer.concat(chunks)))
          .pipe()
          .on('data', (d) => chunks.push(d));
      } catch (e) {
        reject(e);
      }
    });
  }
}

export default EdgeTtsService;