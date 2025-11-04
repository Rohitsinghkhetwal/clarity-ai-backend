// services/sttService.js
import { TranscribeStreamingClient, StartStreamTranscriptionCommand } from "@aws-sdk/client-transcribe-streaming";
import { PassThrough } from "stream";
import dotenv from "dotenv";

dotenv.config();

class STTService {
  constructor() {
    this.client = new TranscribeStreamingClient({
      region: process.env.AWS_REGION || "us-east-1",
      credentials: {
        accessKeyId: process.env.AWS_TRANSCRIBE_ACCESS_KEY,
        secretAccessKey: process.env.AWS_TRANSCRIBE_SECRET_KEY
      }
    });

    this.audioStream = null;
    this.socket = null;
    this.transcriptionActive = false;
    this.sampleRate = 44100;
  }

  async start(socket, sampleRate = 16000) {
    this.socket = socket;
    this.transcriptionActive = true;
    this.sampleRate = Number(sampleRate) || 16000;
    
  
    this.audioStream = new PassThrough();

    this._bindSocketEvents();

    const command = new StartStreamTranscriptionCommand({
      LanguageCode: "en-US",
      MediaEncoding: "pcm",
      MediaSampleRateHertz: this.sampleRate,
      AudioStream: this._getAudioStream()
    });

    try {
      const response = await this.client.send(command);
      this._handleTranscriptionResponse(response);
      
      console.log("🎤 Transcription started @", this.sampleRate, "Hz");
    } catch (err) {
      console.error("❌ Error starting transcription:", err);
      socket.emit("transcriptionError", err.message);
    }
  }

  // ✅ FIXED: Proper async generator that AWS SDK accepts
  _getAudioStream() {
    const stream = this.audioStream;
    
    return (async function* () {
      for await (const chunk of stream) {
        if (chunk && chunk.length > 0) {
          yield { AudioEvent: { AudioChunk: chunk } };
        }
      }
    })();
  }

  async _handleTranscriptionResponse(response) {
    try {
      for await (const event of response.TranscriptResultStream) {
        if (event.TranscriptEvent) {
          const results = event.TranscriptEvent.Transcript.Results;

          if (results.length > 0) {
            const text = results[0].Alternatives[0].Transcript;
            const isPartial = results[0].IsPartial;

            if (!isPartial && text.trim()) {
              this.socket.emit("transcription", {
                text,
                isFinal: true
              });
            }
          }
        }
      }
    } catch (err) {
      console.error("❌ Error handling transcription stream:", err);
      if (this.socket) {
        this.socket.emit("transcriptionError", err.message);
      }
    }
  }

  _bindSocketEvents() {
    if (!this.socket) return;

    this.socket.on("audio-chunk", (data) => {
      if (this.transcriptionActive && this.audioStream && data.audioData) {
        try {
          // Accept Buffer or ArrayBuffer
          const buffer = Buffer.isBuffer(data.audioData)
            ? data.audioData
            : Buffer.from(data.audioData);
            console.log("* 🟢 Recieved chunk ", buffer.length, "byte")
          this.audioStream.write(buffer);
        } catch (err) {
          console.error("❌ Error writing audio chunk:", err);
        }
      }
    });

    this.socket.on("stop-recording", () => {
      this.stop();
    });

    this.socket.on("disconnect", () => {
      this.stop();
    });
  }

  stop() {
    if (this.transcriptionActive && this.audioStream) {
      this.audioStream.end();
      this.transcriptionActive = false;
      this.audioStream = null;
      console.log("🛑 Transcription stopped");
    }
  }
}

export default new STTService();
