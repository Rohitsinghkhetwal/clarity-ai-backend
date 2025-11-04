import aiservice from "./aiservice.js";
import fillerdetector from "../utils/fillerdetector.js";
import speechAnalizer from "../utils/speechAnalizer.js";

class AnalysisService {
  async analyzeAnswer(question, userAnswer, audioMetadata) {
    try {
      const [
        qualityAnalysis,
        fillerAnalysis,
        // paceAnalysis
      ] = await Promise.all([
        aiservice.analyzeAnswer(question.questionText || question.question, userAnswer, question.idealAnswer),
        Promise.resolve(fillerdetector.detectFillers(userAnswer)),
        // Promise.resolve(speechAnalizer.analyzePace(
        //   transcription,
        //   audioMetadata.durationSeconds
        // ))
      ]);

      return {
        relevanceScore: qualityAnalysis.relevanceScore,
        technicalAccuracy: qualityAnalysis.technicalAccuracy,
        structureScore: qualityAnalysis.structureScore,
        sentiment: 'neutral', // Default sentiment since we removed sentiment analysis
        confidence: 0.7, // Default confidence
        fillerWords: fillerAnalysis,
        // speechPace: paceAnalysis,
        strengths: qualityAnalysis.strengths,
        weaknesses: qualityAnalysis.weaknesses,
        suggestions: qualityAnalysis.suggestions
      };
    } catch (error) {
      console.error('Analysis error:', error);
      throw error;
    }
  }

  // calculateCommunicationScore(fillerRate, paceRating, confidence) {
  //   let score = 10;

  //   // Deduct for filler words
  //   if (fillerRate > 10) score -= 3;
  //   else if (fillerRate > 5) score -= 2;
  //   else if (fillerRate > 2) score -= 1;

  //   // Deduct for pace issues
  //   if (paceRating === 'too slow' || paceRating === 'too fast') score -= 2;
  //      score = score * confidence;

  //   return Math.max(0, Math.min(10, score));
  // }
}

export default new AnalysisService();