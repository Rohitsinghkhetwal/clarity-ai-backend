
import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema({
  category: {
    type: String,
    enum: ['technical', 'behavioral', 'situational', 'system-design', 'non-technical'],
    required: true
  },
  role: {
    type: String,
    required: true // e.g., "Software Engineer", "Data Scientist"
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium'
  },
  question: {
    type: String,
    required: true
  },
  idealAnswer: String,
  keywords: [String],
  followUpQuestions: [String],
  tags: [String]
}, {
  timestamps: true
});

const questionModel = mongoose.model('Question', questionSchema);
export default questionModel