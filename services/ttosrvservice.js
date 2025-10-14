import axios from "axios";
import fs from "fs"
import path from "path";
import { fileURLToPath } from "url";


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


class TTS_Service {
  constructor() {
    this.apiKey = process.env.ELEVENLABS_API_KEY;
    this.voiceId = process.env.VOICE_ID;
  }

  async generateSpeech(text, sessionId) {
    try{
      const response = await axios.post(`https://api.elevenlabs.io/v1/text-to-speech/${this.voiceId}`,
        {
          text,
          model_id: 'eleven_monolingual_v1',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.5
          }
        },
        {
          headers: {
            'Accept': 'audio/mpeg',
            'xi-api-key': this.apiKey,
            'Content-Type': 'application/json'
          },
          responseType: 'arraybuffer'
        }
      )

      // console.log("text inside the genreeate speech", response.data)
      // console.log('sessionId-=-=-=-=-=-=-', sessionId)

      const tempDir = path.join(__dirname, "../temp");
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
        console.log("Created temp directory:", tempDir);
      }


      const fileName = `question_${sessionId}_${Date.now()}.mp3`;
      const filepath = path.join(tempDir, fileName)
      console.log('file name ', fileName)
      console.log("file path=======================?", filepath)
   
      fs.writeFileSync(filepath, response.data);

      return {
        filepath,
        fileName
      }

    }catch(err) {
      throw new Error(`Text to Speech Error ${err.message}`)
    }
  }

}


export default new TTS_Service();