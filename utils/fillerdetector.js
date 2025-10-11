class FillerDetector {
  constructor() {
    this.fillerWords = [
      'um', 'uh', 'like', 'you know', 'basically', 'actually',
      'literally', 'sort of', 'kind of', 'i mean', 'you see',
      'well', 'so', 'right', 'okay', 'hmm', 'ah'
    ];
  }

  detectFillers(transcript) {
    const words = transcript.toLowerCase().split(/\s+/);
    const totalWords = words.length;

    const detectedFillers = {};
    let totalFillerCount = 0;

    this.fillerWords.forEach(filler => {
      const pattern = new RegExp(`\\b${filler}\\b`, 'gi');
      const matches = transcript.match(pattern);
      const count = matches ? matches.length : 0;

      if (count > 0) {
        detectedFillers[filler] = count;
        totalFillerCount += count;
      }
    });

    const fillerPercentage = ((totalFillerCount / totalWords) * 100).toFixed(2);

    return {
      totalFillers: totalFillerCount,
      fillerRate: parseFloat(fillerPercentage),
      breakdown: detectedFillers,
      rating: this.getRating(parseFloat(fillerPercentage))
    };
  }

  getRating(percentage) {
    if (percentage < 2) return 'excellent';
    if (percentage < 5) return 'good';
    if (percentage < 10) return 'fair';
    return 'needs improvement';
  }
}

export default new FillerDetector();