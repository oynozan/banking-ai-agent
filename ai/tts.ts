// ai/tts.ts
import path from "node:path";
import { EdgeTTS } from "node-edge-tts";

const VOICE = "en-US-AriaNeural"; // change later if you want
const FORMAT = "audio-24khz-48kbitrate-mono-mp3";
const OUTPUT = "tts-output.mp3";

/**
 * Generate speech audio from text and save to tts-output.mp3.
 */
export async function speak(text: string): Promise<void> {
  if (!text || !text.trim()) return;

  try {
    const tts = new EdgeTTS({
      voice: VOICE,
      outputFormat: FORMAT,
    });

    const outputPath = path.join(process.cwd(), OUTPUT);

    // edge-tts API: tts.ttsPromise(text, outputFilePath)
    await tts.ttsPromise(text, outputPath);

    console.log(`[TTS] Audio saved → ${outputPath}`);

    // OPTIONAL: auto-play on Windows
    // import { exec } from "node:child_process";
    // exec(`start "" "${outputPath}"`);
  } catch (err) {
    console.error("[TTS] Error:", err);
  }
}
