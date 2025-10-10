
import mongoose from "mongoose"; 

const questionResponseSchema = new mongoose.Schema({
  questionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question'
  },
  questionText: String,
  userAnswer: String,
  transcription: String,
  audioUrl: String,
  analysis: {
    relevanceScore: { type: Number, min: 0, max: 10 },
    technicalAccuracy: { type: Number, min: 0, max: 10 },
    structureScore: { type: Number, min: 0, max: 10 },
    sentiment: String,
    confidence: { type: Number, min: 0, max: 1 },
    fillerWords: {
      count: Number,
      words: [String],
      percentage: Number
    },
    speechPace: {
      wpm: Number,
      rating: String
    }
  },
  askedAt: Date,
  answeredAt: Date
});

const interviewSessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  role: {
    type: String,
    required: true
  },
  company: String,
  status: {
    type: String,
    enum: ['scheduled', 'in-progress', 'completed', 'cancelled'],
    default: 'scheduled'
  },
  startedAt: Date,
  completedAt: Date,
  currentQuestionIndex: {
    type: Number,
    default: 0
  },
  questions: [questionResponseSchema],
  overallScore: {
    type: Number,
    min: 0,
    max: 100
  },
  scores: {
    technical: Number,
    communication: Number,
    structure: Number,
    confidence: Number
  },
  feedback: {
    strengths: [String],
    weaknesses: [String],
    suggestions: [String]
  }
}, {
  timestamps: true
});

const InterviewModel = mongoose.model('InterviewSession', interviewSessionSchema);
export default InterviewModel;