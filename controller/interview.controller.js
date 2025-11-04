import axios from "axios";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import InterviewModel from "../models/interviewsession.model.js";
import questionModel from "../models/question.model.js";
import aiservice from "../services/aiservice.js";
import ttosrvservice from "../services/ttosrvservice.js";
import storageService from "../services/storageService.js";
import analysisService from "../services/analysisService.js";
// import { session } from "passport";

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

// const VOICE_ID = process.env.VOICE_ID
// const API_KEY = process.env.ELEVENLABS_API_KEY

const startInterview = async (req, res) => {
  try {
    const { role, company, questionCount = 5 } = req.body;
    const userId = req.user._id;

    if (!role) {
      return res.status(400).json({ message: "Role is required" });
    }

    // Fetch questions from database
    let questions = await questionModel
      .find({ role })
      .limit(questionCount)
      .lean();

    // If not enough questions in DB, generate with AI
    if (questions.length < questionCount) {
      const generatedQuestions = [];
      for (let i = questions.length; i < questionCount; i++) {
        const questionText = await aiservice.generateQuestion(
          role,
          [...questions.map((q) => q.question), ...generatedQuestions],
          req.user.profile
        );
        generatedQuestions.push(questionText);
      }

      // Add generated questions
      questions = [
        ...questions,
        ...generatedQuestions.map((q) => ({
          questionText: q,
          category: "technical",
        })),
      ];
    }

    // Create interview session
    const session = await InterviewModel.create({
      userId,
      role,
      company,
      status: "in-progress",
      startedAt: new Date(),
      questions: questions.map((q) => ({
        questionId: q._id,
        questionText: q.question || q.questionText,
        askedAt: new Date(),
      })),
    });

    // Generate audio for first question
    const firstQuestion = session.questions[0];
    // const { audioUrl } = await generateQuestionAudio(
    //   firstQuestion.questionText,
    //   session._id.toString()
    // );
    // console.log("AUDIO URL", audioUrl)
    // firstQuestion.audioUrl = audioUrl;
    await session.save();

    res.status(201).json({
      success: true,
      message: "Interview started",
      session: {
        id: session._id,
        role: session.role,
        currentQuestion: firstQuestion,
        totalQuestions: session.questions.length,
      },
    });
  } catch (error) {
    console.error("Start interview error:", error);
    res
      .status(500)
      .json({ message: "Failed to start interview", error: error.message });
  }
};

// Get interview session
const getSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user._id;

    const session = await InterviewModel.findOne({
      _id: sessionId,
      userId,
    });

    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    res.json({
      success: true,
      session,
    });
  } catch (error) {
    console.error("Get session error:", error);
    res.status(500).json({ message: "Failed to retrieve session" });
  }
};

// Submit answer (for non-WebSocket flow)
const submitAnswer = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { answer } = req.body;
    const userId = req.user._id;

    const session = await InterviewModel.findOne({
      _id: sessionId,
      userId,
    });
    console.log("BACKEND SESSION ", session);

    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    // we will append all the analytical data that we can use it when interview ends
    // we will save and tell the frontend answer is recorded

    //--------------- toast -------------------------

    const currentQuestion = session.questions[session.currentQuestionIndex];
    console.log("Current question ", currentQuestion);

    // Analyze answer
    const analysis = await analysisService.analyzeAnswer(
      currentQuestion,
      answer,
      { durationSeconds: 60 } // Estimate if not provided
    );

    console.log("this is the analysis here ", analysis);

    // Update session
    currentQuestion.userAnswer = answer;
    // currentQuestion.transcription = transcription;
    currentQuestion.analysis = analysis;
    currentQuestion.answeredAt = new Date();

    session.currentQuestionIndex += 1;
    //analysis is saving here save the analysis also ....
    //---------------------save----------------------------
    await session.save();

    res.json({
      success: true,
      analysis,
      nextQuestion: session.questions[session.currentQuestionIndex] || null,
      isComplete: session.currentQuestionIndex >= session.questions.length,
    });
  } catch (error) {
    console.error("Submit answer error:", error);
    res.status(500).json({ message: "Failed to submit answer" });
  }
};

// Complete interview
const completeInterview = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user._id;

    const session = await InterviewModel.findOne({
      _id: sessionId,
      userId,
    });

    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    session.status = "completed";
    session.completedAt = new Date();

    // Calculate scores
    const scores = calculateOverallScores(session.questions);
    session.overallScore = scores.overall;
    session.scores = scores.breakdown;

    // Generate feedback
    session.feedback = await generateFeedback(session.questions);

    await session.save();

    res.json({
      success: true,
      message: "Interview completed",
      results: {
        overallScore: session.overallScore,
        scores: session.scores,
        feedback: session.feedback,
        sessionId: session._id,
      },
    });
  } catch (error) {
    console.error("Complete interview error:", error);
    res.status(500).json({ message: "Failed to complete interview" });
  }
};

// Get user interview history
const getUserHistory = async (req, res) => {
  try {
    const userId = req.user._id;
    const { page = 1, limit = 10 } = req.query;

    const sessions = await InterviewModel.find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select("-questions.analysis -questions.transcription")
      .lean();

    const total = await InterviewModel.countDocuments({ userId });

    // Calculate improvement trend
    const recentScores = sessions.slice(0, 5).map((s) => s.overallScore);
    const improvement =
      recentScores.length > 1
        ? (
            (recentScores[0] - recentScores[recentScores.length - 1]) /
            recentScores.length
          ).toFixed(2)
        : 0;

    res.json({
      success: true,
      sessions,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
      },
      analytics: {
        totalInterviews: total,
        averageScore:
          sessions.reduce((sum, s) => sum + (s.overallScore || 0), 0) /
            sessions.length || 0,
        improvement: parseFloat(improvement),
      },
    });
  } catch (error) {
    console.error("Get history error:", error);
    res.status(500).json({ message: "Failed to retrieve history" });
  }
};

// Helper functions

async function generateQuestionAudio(questionText, sessionId) {
  console.log("THIS IS INSIDE THE GENERATE AUDIO ", questionText, sessionId);
  try {
    const { filepath, fileName } = await ttosrvservice.generateSpeech(
      questionText,
      sessionId
    );
    console.log("this is filepath", filepath);
    console.log("this is fileName", fileName);
    const audioUrl = await storageService.uploadFile(filepath, fileName);
    console.log("Url", audioUrl);

    // Clean up temp file
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
      console.log("Temp file cleaned up:", filepath);
    }

    return { audioUrl };
  } catch (error) {
    console.error("generateQuestionAudio Error:", error.message);
    console.error("Full error:", error);
    return { audioUrl: null };
  }
}

function calculateOverallScores(questions) {
  // Same logic as in WebSocket handler
  const validQuestions = questions.filter(
    (q) => q.analysis && q.userAnswer !== "[Skipped]"
  );

  if (validQuestions.length === 0) {
    return {
      overall: 0,
      breakdown: {
        technical: 0,
        communication: 0,
        structure: 0,
        confidence: 0,
      },
    };
  }

  const avgTechnical =
    validQuestions.reduce(
      (sum, q) => sum + (q.analysis.technicalAccuracy || 0),
      0
    ) / validQuestions.length;
  const avgStructure =
    validQuestions.reduce(
      (sum, q) => sum + (q.analysis.structureScore || 0),
      0
    ) / validQuestions.length;
  const avgConfidence =
    validQuestions.reduce(
      (sum, q) => sum + (q.analysis.confidence || 0) * 10,
      0
    ) / validQuestions.length;
  const avgCommunication = 7; // Simplified

  const overall =
    avgTechnical * 0.4 +
    avgCommunication * 0.3 +
    avgStructure * 0.2 +
    avgConfidence * 0.1;

  return {
    overall: Math.round(overall * 10) / 10,
    breakdown: {
      technical: Math.round(avgTechnical * 10) / 10,
      communication: Math.round(avgCommunication * 10) / 10,
      structure: Math.round(avgStructure * 10) / 10,
      confidence: Math.round(avgConfidence * 10) / 10,
    },
  };
}

async function generateFeedback(questions) {
  const validQuestions = questions.filter((q) => q.analysis);

  const allStrengths = validQuestions.flatMap(
    (q) => q.analysis.strengths || []
  );
  const allWeaknesses = validQuestions.flatMap(
    (q) => q.analysis.weaknesses || []
  );
  const allSuggestions = validQuestions.flatMap(
    (q) => q.analysis.suggestions || []
  );

  return {
    strengths: [...new Set(allStrengths)].slice(0, 5),
    weaknesses: [...new Set(allWeaknesses)].slice(0, 5),
    suggestions: [...new Set(allSuggestions)].slice(0, 5),
  };
}

const responseFromLLm = async (req, res) => {
  const { sessionId } = req.body;
  try {
    const response = await InterviewModel.findOne({ _id: sessionId });
    if (!response) {
      return res.status(400).json({ message: "Session Id is required !" });
    }

    const llmResponse = await aiservice.recieveResponse(response.questions);

    if (!llmResponse) {
      return res.status(400).json({ message: "Something went wrong here !" });
    }

    return res.status(200).json({ response: llmResponse });
  } catch (err) {
    console.error("Something went wrong while getting the response ", err);
    return res.status(500).json({ message: "Internal server error !" });
  }
};

export {
  startInterview,
  getSession,
  submitAnswer,
  completeInterview,
  getUserHistory,
  responseFromLLm,
};
