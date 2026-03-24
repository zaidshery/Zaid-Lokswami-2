export {};

const path = require('node:path') as typeof import('node:path');
const Module = require('node:module') as typeof import('node:module') & {
  _resolveFilename: (
    request: string,
    parent: NodeModule | null,
    isMain: boolean,
    options?: { paths?: string[] }
  ) => string;
};
const dotenv = require('dotenv') as typeof import('dotenv');

const projectRoot = path.resolve(__dirname, '..');
const originalResolveFilename = Module._resolveFilename;

Module._resolveFilename = function resolveFilenameWithAlias(
  request: string,
  parent: NodeModule | null,
  isMain: boolean,
  options?: { paths?: string[] }
) {
  const nextRequest = request.startsWith('@/') ? path.join(projectRoot, request.slice(2)) : request;
  return originalResolveFilename.call(this, nextRequest, parent, isMain, options);
};

async function main() {
  dotenv.config({
    path: path.join(projectRoot, '.env.local'),
    override: false,
  });

  const { synthesizeGeminiSpeech } = require('../lib/ai/geminiTts') as typeof import('../lib/ai/geminiTts');

  const result = await synthesizeGeminiSpeech({
    text:
      'लोकस्वामी ऑडियो टेस्ट। यह एक छोटा समाचार वाचन परीक्षण है ताकि हम Gemini text to speech integration की जांच कर सकें।',
    languageCode: 'hi-IN',
  });

  if (result.mode === 'unavailable') {
    throw new Error(result.reason);
  }

  const audioBuffer = Buffer.from(result.audioBase64, 'base64');
  const riffHeader = audioBuffer.subarray(0, 4).toString('ascii');
  const waveHeader = audioBuffer.subarray(8, 12).toString('ascii');

  if (riffHeader !== 'RIFF' || waveHeader !== 'WAVE') {
    throw new Error('Generated Gemini TTS payload is not a valid WAV file.');
  }

  console.log('PASS: Gemini TTS returned playable WAV audio');
  console.log(`provider=${result.provider}`);
  console.log(`model=${result.model}`);
  console.log(`voice=${result.voice}`);
  console.log(`chunkCount=${result.chunkCount}`);
  console.log(`bytes=${audioBuffer.length}`);
}

void main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`FAIL: ${message}`);
  process.exit(1);
});
