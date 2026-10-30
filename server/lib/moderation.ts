import { spawn } from 'node:child_process';
import * as tf from '@tensorflow/tfjs';
import * as nsfwjs from 'nsfwjs';
import sharp from 'sharp';
import ffmpegPath from 'ffmpeg-static';
import { findBlockedTerms } from './moderation-text.js';

// Automatic check of an uploaded work (NSFWJS for images and video frames, word
// lists for text). It only decides between publishing and asking the admin:
// anything it cannot check goes to the admin rather than being published.

export const PENDING_REVIEW_FLAG = 'pending_review';

const SIZE = 224;
const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
const VIDEO_FRAMES = 6;
const FRAME_TIMEOUT_MS = 15_000;

// Paintings and photographs of bodies are common here, so "Sexy" needs more
// confidence than explicit classes. The admin has the last word either way.
const THRESHOLDS: Record<string, number> = { Porn: 0.5, Hentai: 0.6, Sexy: 0.75 };
const COMBINED_THRESHOLD = 0.8;

let modelPromise: Promise<nsfwjs.NSFWJS> | null = null;

function loadModel(): Promise<nsfwjs.NSFWJS> {
  if (!modelPromise) {
    modelPromise = tf
      .setBackend('cpu')
      .then(() => tf.ready())
      .then(() => nsfwjs.load('MobileNetV2'))
      .catch((error) => {
        modelPromise = null;
        throw error;
      });
  }
  return modelPromise;
}

export function flagsFromScores(scores: Record<string, number>): string[] {
  const flags = Object.entries(THRESHOLDS)
    .filter(([name, limit]) => (scores[name] ?? 0) >= limit)
    .map(([name]) => name.toLowerCase());
  const combined = (scores.Porn ?? 0) + (scores.Hentai ?? 0) + (scores.Sexy ?? 0);
  if (!flags.length && combined >= COMBINED_THRESHOLD) flags.push('sexy');
  return flags;
}

async function classifyPixels(pixels: Uint8Array): Promise<string[]> {
  const model = await loadModel();
  const tensor = tf.tensor3d(pixels, [SIZE, SIZE, 3], 'int32');
  try {
    const predictions = await model.classify(tensor);
    return flagsFromScores(Object.fromEntries(predictions.map((p) => [p.className, p.probability])));
  } finally {
    tensor.dispose();
  }
}

async function downloadImage(url: string): Promise<Buffer> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`download ${response.status}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length > MAX_IMAGE_BYTES) throw new Error('image too large');
  return buffer;
}

export async function checkImage(input: string | Buffer): Promise<string[]> {
  const buffer = typeof input === 'string' ? await downloadImage(input) : input;
  const { data } = await sharp(buffer)
    .rotate()
    .flatten({ background: '#ffffff' })
    .resize(SIZE, SIZE, { fit: 'fill' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return classifyPixels(new Uint8Array(data));
}

function runFfmpeg(args: string[]): Promise<{ stdout: Buffer; stderr: string }> {
  return new Promise((resolve, reject) => {
    if (!ffmpegPath) return reject(new Error('ffmpeg unavailable'));
    const child = spawn(ffmpegPath as unknown as string, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    const out: Buffer[] = [];
    let stderr = '';
    const timer = setTimeout(() => child.kill('SIGKILL'), FRAME_TIMEOUT_MS);
    child.stdout.on('data', (chunk) => out.push(chunk));
    child.stderr.on('data', (chunk) => {
      stderr = (stderr + chunk).slice(-4000);
    });
    child.on('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on('close', () => {
      clearTimeout(timer);
      resolve({ stdout: Buffer.concat(out), stderr });
    });
  });
}

async function videoDuration(url: string): Promise<number> {
  const { stderr } = await runFfmpeg(['-hide_banner', '-i', url]);
  const match = stderr.match(/Duration: (\d+):(\d+):(\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]) : 0;
}

async function videoFrame(url: string, second: number): Promise<Uint8Array | null> {
  const { stdout } = await runFfmpeg([
    '-hide_banner', '-loglevel', 'error',
    '-ss', second.toFixed(2),
    '-i', url,
    '-frames:v', '1',
    '-vf', `scale=${SIZE}:${SIZE}`,
    '-f', 'rawvideo',
    '-pix_fmt', 'rgb24',
    'pipe:1',
  ]);
  return stdout.length === SIZE * SIZE * 3 ? new Uint8Array(stdout) : null;
}

export async function checkVideo(url: string): Promise<string[]> {
  const duration = await videoDuration(url);
  if (!duration) throw new Error('video duration unknown');
  const seconds = Array.from({ length: VIDEO_FRAMES }, (_, i) => (duration * (i + 0.5)) / VIDEO_FRAMES);
  const frames = await Promise.all(seconds.map((second) => videoFrame(url, second)));
  const readable = frames.filter((frame): frame is Uint8Array => !!frame);
  if (!readable.length) throw new Error('no readable video frames');

  const flags = new Set<string>();
  for (const frame of readable) {
    for (const flag of await classifyPixels(frame)) flags.add(flag);
  }
  return [...flags];
}

export interface WorkToCheck {
  workType: string;
  fileUrl?: string | null;
  coverUrl?: string | null;
  texts: string[];
}

// Returns policy flags: an empty list means the work can be published directly.
export async function moderateWork({ workType, fileUrl, coverUrl, texts }: WorkToCheck): Promise<string[]> {
  const flags = findBlockedTerms(texts.filter(Boolean).join('\n')).map((term) => `text:${term}`);

  const media: Array<{ url: string; kind: 'image' | 'video'; label: string }> = [];
  if (fileUrl && (workType === 'pintura' || workType === 'fotografia')) media.push({ url: fileUrl, kind: 'image', label: 'image' });
  if (fileUrl && workType === 'video') media.push({ url: fileUrl, kind: 'video', label: 'video' });
  if (coverUrl) media.push({ url: coverUrl, kind: 'image', label: 'cover' });

  for (const { url, kind, label } of media) {
    try {
      const found = kind === 'image' ? await checkImage(url) : await checkVideo(url);
      flags.push(...found.map((flag) => `${label}:${flag}`));
    } catch (error: any) {
      console.error(`[MODERATION] Could not check ${label}:`, error?.message || error);
      flags.push(`${label}:unchecked`);
    }
  }
  return flags;
}
