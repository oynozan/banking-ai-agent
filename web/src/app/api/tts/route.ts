import fs from "fs";
import path from "path";
import { EdgeTTS } from "node-edge-tts";
import { NextRequest, NextResponse } from "next/server";

const OUTPUT = "tts-output.mp3";
const VOICE = "en-US-AriaNeural";
const FORMAT = "audio-24khz-48kbitrate-mono-mp3";

export async function POST(request: NextRequest) {
    try {
        const { text } = await request.json();

        if (!text || !text.trim()) {
            return NextResponse.json({ error: "Text is required" }, { status: 400 });
        }

        const tts = new EdgeTTS({
            voice: VOICE,
            outputFormat: FORMAT,
        });

        const outputPath = path.join(process.cwd(), "public", OUTPUT);

        // Generate TTS audio
        await tts.ttsPromise(text, outputPath);

        console.log(`[TTS] Audio saved → ${outputPath}`);

        // Read the file and return as audio
        const audioBuffer = fs.readFileSync(outputPath);

        return new NextResponse(audioBuffer, {
            status: 200,
            headers: {
                "Content-Type": "audio/mpeg",
                "Content-Length": audioBuffer.length.toString(),
            },
        });
    } catch (error) {
        console.error("[TTS] Error:", error);
        return NextResponse.json({ error: "Failed to generate speech" }, { status: 500 });
    }
}
