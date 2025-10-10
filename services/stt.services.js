import { createClient } from "@deepgram/sdk";


 class STTService {
  constructor() {
    this.deepgram = createClient(process.env.DEEP_GRAM_KEY)
  }

  //Transcription begins from here 
  async createLiveTranscription() {
    const live = this.deepgram.listen.live({
      model:"nova-2",
      language: 'en',
      smart_format: true,
      punctuate: true,
      interim_results: true
    })
    return live;
  }

  async transcribeFile(audioBuffer) {
    try {
      const { result } = await this.deepgram.listen.prerecorded.transcribeFile(audioBuffer,{
        model: 'nova-2',
        smart_format:true,
        punctuate:true,
        paragraphs: true
      })
      return {
        transcript: result.results.channels[0].alternatives[0].transcript,
        confidence: result.results.channels[0].alternatives[0].confidence,
        words: result.results.channels[0].alternatives[0].words
      }

    }catch(err) {
      throw new Error(`STT Error ${err.message}`)

    }
  }
}

export default new STTService();

