class SpeechAnalyzer {
  analyzePace(transcript, durationSeconds) {
    const wordCount = transcript.split(/\s+/).length;
    const wpm = Math.round((wordCount / durationSeconds) * 60);

    let rating;
    if (wpm < 100) rating = 'too slow';
    else if (wpm >= 100 && wpm <= 160) rating = 'good';
    else if (wpm > 160 && wpm <= 180) rating = 'fast';
    else rating = 'too fast';

    return {
      wordsPerMinute: wpm,
      totalWords: wordCount,
      duration: durationSeconds,
      rating
    };
  }

  detectPauses(words) {
    const pauses = [];
    
    for (let i = 1; i < words.length; i++) {
      const prevWord = words[i - 1];
      const currentWord = words[i];
      const pauseDuration = currentWord.start - prevWord.end;

      if (pauseDuration > 2) {
        pauses.push({
          afterWord: prevWord.word,
          duration: pauseDuration,
          timestamp: prevWord.end
        });
      }
    }

    return {
      totalPauses: pauses.length,
      longPauses: pauses.filter(p => p.duration > 3).length,
      averagePauseDuration: pauses.length > 0
        ? pauses.reduce((sum, p) => sum + p.duration, 0) / pauses.length
        : 0,
      pauses
    };
  }
}

export default new SpeechAnalyzer();