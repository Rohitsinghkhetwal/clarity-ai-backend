import sttservices from "../services/sttservices.js";
import ttosrvservice from "../services/ttosrvservice.js"
// import aiservice from "../services/aiservice.js";
import analysisService from "../services/analysisService.js";
import InterviewModel from "../models/interviewsession.model.js"
import storageService from "../services/storageService.js";


class InterviewSocketHandler {
  constructor(io) {
    this.io = io;
    this.activeConnections = new Map();
  }

  initialize() {
    this.io.on('connection', (socket) => {
      console.log(`Client connected: ${socket.id}`);

      // Join interview room
      socket.on('join-interview', async (data) => {
        await this.handleJoinInterview(socket, data);
      });

      // Start recording
      socket.on('start-recording', async (data) => {
        try {
          const sampleRate = Number(data?.sampleRate) || 44100;
          await sttservices.start(socket, sampleRate);
          socket.emit('recording-started', { success: true });
        } catch (err) {
          console.log("Error starting transcription", err);
          socket.emit('error', { message: 'Failed to start transcription' });
        }
      });

      // Audio stream chunks
      // socket.on('audio-chunk', async (data) => {
      //   // await this.handleAudioChunk(socket, data);
      //   sttservices.socket?.emit("audio-chunk", data)
      // });

      // Stop recording
      socket.on('stop-recording', async (data) => {
        // await this.handleStopRecording(socket, data);
        try {
          if(sttservices) {
            sttservices.stop();
          }

          socket.emit('recording-stopped', {success: true})

        }catch(err) {
          console.log("Error stoping the recording ")

        }
        // if(sttservices) sttservices.stop()
      });

      // Skip question
      socket.on('skip-question', async (data) => {
        await this.handleSkipQuestion(socket, data);
      });

      // Disconnect
      socket.on('disconnect', () => {
        this.handleDisconnect(socket);
      });
    });
  }

  async handleJoinInterview(socket, { sessionId, userId }) {
    try {
      // Verify session
      const session = await InterviewModel.findOne({
        _id: sessionId,
        userId: userId
      });

      if (!session) {
        socket.emit('error', { message: 'Invalid session' });
        return;
      }

      // Join room
      socket.join(sessionId);

      // Store connection info
      this.activeConnections.set(socket.id, {
        sessionId,
        userId,
        audioChunks: [],
        transcription: '',
        startTime: null
      });

      // Send current question
      const currentQuestion = session.questions[session.currentQuestionIndex];
      socket.emit('question-ready', {
        question: currentQuestion,
        questionNumber: session.currentQuestionIndex + 1,
        totalQuestions: session.questions.length
      });

      console.log(`User ${userId} joined interview session ${sessionId}`);
    } catch (error) {
      console.error('Join interview error:', error);
      socket.emit('error', { message: 'Failed to join interview' });
    }
  }

  async handleStartRecording(socket, { sessionId }) {
    try {
      const connectionData = this.activeConnections.get(socket.id);
      // console.log("THIS IS CONNECTION DATA HERE ", connectionData)
      if (!connectionData) {
        console.log("ERROR emitted from backend => ")
        socket.emit('error', { message: 'Connection not found' });
        return;
      }

      // console.log('LINE 6')

      // Initialize Deepgram live transcription
      const deepgramLive = await sttservices.createLiveTranscription();

      // console.log("DEEPGRAM LIVE ", deepgramLive)

      // Store live connection
      connectionData.deepgramLive = deepgramLive;
      connectionData.startTime = Date.now();
      connectionData.audioChunks = [];
      connectionData.transcription = '';

      deepgramLive.on('open', () => {
        console.log("Deepgram live connection opened ")
      })

      deepgramLive.on("close", () => {
        console.log("Deep gram live connection closed ")
      })

      // Handle transcription results
      console.log('line 7')
      deepgramLive.on('transcriptReceived', (data) => {
        const transcript = data?.channel?.alternatives?.[0]?.transcript || '';
        console.log("THIS IS THE TRANSCRIPT ", transcript)
        
        if (transcript && transcript.trim().length > 0) {
          connectionData.transcription += transcript + ' ';
          
          // Send real-time transcription to client
          socket.emit('transcription-update', {
            transcript,
            isFinal: Boolean(data?.isFinal ?? data?.isFinal)
          });
        }
      });

      console.log('line 8')



      deepgramLive.on('error', (error) => {
        console.error('Deepgram error:', error);
        socket.emit('error', { message: 'Transcription error' });
      });

      socket.emit('recording-started', { message: 'Recording started' });
    } catch (error) {
      console.error('Start recording error:', error);
      socket.emit('error', { message: 'Failed to start recording' });
    }
  }

  async handleAudioChunk(socket, { audioData, sessionId }) {
    try {
      const connectionData = this.activeConnections.get(socket.id);
      // console.log("CONNECTION DATA ", connectionData)
      if (!connectionData || !connectionData.deepgramLive) {
        return;
      }

      let chunk;

      if(Buffer.isBuffer(audioData)) {
        chunk = audioData 
        console.log("audio data is already a buffer ")
      } else if(typeof audioData === 'string') {
        const base64 = audioData.startsWith('data:')
        ? audioData.split(',')[1]
        : audioData.includes('base64')
        ? audioData.split('base64')[1]
        : audioData
        chunk = Buffer.from(base64, 'base64')
      } else {
        console.log("unsupported audio format ", typeof audioData)
        return 
      }

      if(!chunk || chunk.length=== 0 ){
        console.log("Empty audio chunk ")
        return 

      }

      // Store chunk for later processing
      connectionData.audioChunks.push(chunk);

      const readyState = connectionData.deepgramLive.getReadyState?.() || connectionData.deepgramLive.conn?.readyState

      console.log("Deepgram connection state ", readyState)

      if(readyState === 1) {
        connectionData.deepgramLive.send(chunk);
        console.log(`Sent ${chunk.length} bytes to deepgram `)
      }else {
        console.log(`Deep gram not ready ${readyState}`)
      }

      console.log("THIS IS THE CONNECTION DATA HERE  =====", connectionData)

      // Send to Deepgram for real-time transcription
      
    } catch (error) {
      console.error('Audio chunk error:', error);
    }
  }

  async handleStopRecording(socket, { sessionId }) {
    try {
      const connectionData = this.activeConnections.get(socket.id);
      if (!connectionData) {
        socket.emit('error', { message: 'Connection not found' });
        return;
      }

      // Close Deepgram connection
      if (connectionData.deepgramLive) {
        connectionData.deepgramLive.finish();
      }

      const endTime = Date.now();
      const durationSeconds = (endTime - connectionData.startTime) / 1000;

      socket.emit('processing-answer', { message: 'Processing your answer...' });

      // Get session
      const session = await InterviewModel.findById(sessionId);
      const currentQuestion = session.questions[session.currentQuestionIndex];

      // Combine audio chunks into a single buffer (optional: for upload)
      const audioBuffer = Buffer.concat(connectionData.audioChunks);

      // Analyze the answer using aggregated transcription
      const analysis = await analysisService.analyzeAnswer(
        currentQuestion,
        connectionData.transcription,
        connectionData.transcription,
        { durationSeconds }
      );

      // Update session with answer and analysis
      session.questions[session.currentQuestionIndex].userAnswer = connectionData.transcription;
      session.questions[session.currentQuestionIndex].transcription = connectionData.transcription;
      // Optionally upload audio and set audioUrl here in future
      // const audioUrl = await storageService.uploadAudio(audioBuffer, `${sessionId}_q${session.currentQuestionIndex}.webm`);
      // session.questions[session.currentQuestionIndex].audioUrl = audioUrl;
      session.questions[session.currentQuestionIndex].analysis = analysis;
      session.questions[session.currentQuestionIndex].answeredAt = new Date();

      // Move to next question or complete
      session.currentQuestionIndex += 1;

      if (session.currentQuestionIndex < session.questions.length) {
        const nextQuestion = session.questions[session.currentQuestionIndex];
        await session.save();

        // Send next question
        socket.emit('answer-processed', {
          analysis,
          nextQuestion,
          questionNumber: session.currentQuestionIndex + 1,
          totalQuestions: session.questions.length
        });
      } else {
        // Interview complete
        session.status = 'completed';
        session.completedAt = new Date();

        // Calculate overall scores
        const scores = this.calculateOverallScores(session.questions);
        session.overallScore = scores.overall;
        session.scores = scores.breakdown;

        await session.save();

        socket.emit('interview-completed', {
          analysis,
          overallScore: scores.overall,
          scores: scores.breakdown,
          sessionId: session._id
        });
      }

      // Clear connection data
      connectionData.audioChunks = [];
      connectionData.transcription = '';
    } catch (error) {
      console.error('Stop recording error:', error);
      socket.emit('error', { message: 'Failed to process answer' });
    }
  }

  async handleSkipQuestion(socket, { sessionId }) {
    try {
      const connectionData = this.activeConnections.get(socket.id);
      if (!connectionData) return;

      const session = await InterviewModel.findById(sessionId);
      console.log("SESSION INSIDE THE HANDLE SKIP DATA ", session)
      
      // Mark as skipped
      session.questions[session.currentQuestionIndex].userAnswer = '[Skipped]';
      session.questions[session.currentQuestionIndex].analysis = {
        relevanceScore: 0,
        technicalAccuracy: 0,
        structureScore: 0,
        sentiment: 'neutral',
        confidence: 0
      };

      session.currentQuestionIndex += 1;

      if (session.currentQuestionIndex < session.questions.length) {
        await session.save();
        const nextQuestion = session.questions[session.currentQuestionIndex];
        socket.emit('question-ready', {
          question: nextQuestion,
          questionNumber: session.currentQuestionIndex + 1,
          totalQuestions: session.questions.length
        });
      } else {
        session.status = 'completed';
        session.completedAt = new Date();
        await session.save();
        socket.emit('interview-completed', { sessionId: session._id });
      }
    } catch (error) {
      console.error('Skip question error:', error);
    }
  }

  handleDisconnect(socket) {
    const connectionData = this.activeConnections.get(socket.id);
    if (connectionData?.deepgramLive) {
      connectionData.deepgramLive.finish();
    }
    this.activeConnections.delete(socket.id);
    console.log(`Client disconnected: ${socket.id}`);
  }

  async generateQuestionAudio(questionText, sessionId) {
    try {
      const { filePath, fileName } = await ttosrvservice.generateSpeech(
        questionText,
        sessionId
      );

      // Upload to cloud storage
      const audioUrl = await storageService.uploadFile(filePath, fileName);

      // Delete local file
      const fs = require('fs');
      fs.unlinkSync(filePath);

      return { audioUrl };
    } catch (error) {
      console.error('Question audio generation error:', error);
      return { audioUrl: null };
    }
  }

  calculateOverallScores(questions) {
    const validQuestions = questions.filter(q => q.analysis && q.userAnswer !== '[Skipped]');
    
    if (validQuestions.length === 0) {
      return {
        overall: 0,
        breakdown: {
          technical: 0,
          communication: 0,
          structure: 0,
          confidence: 0
        }
      };
    }

    const avgTechnical = validQuestions.reduce((sum, q) => 
      sum + (q.analysis.technicalAccuracy || 0), 0) / validQuestions.length;
    
    const avgStructure = validQuestions.reduce((sum, q) => 
      sum + (q.analysis.structureScore || 0), 0) / validQuestions.length;
    
    const avgConfidence = validQuestions.reduce((sum, q) => 
      sum + (q.analysis.confidence || 0) * 10, 0) / validQuestions.length;
    
    const avgCommunication = validQuestions.reduce((sum, q) => {
      const fillerRate = q.analysis.fillerWords?.fillerRate || 0;
      const commScore = analysisService.calculateCommunicationScore(
        fillerRate,
        q.analysis.speechPace?.rating || 'good',
        q.analysis.confidence || 0.5
      );
      return sum + commScore;
    }, 0) / validQuestions.length;

    const overall = (
      avgTechnical * 0.4 +
      avgCommunication * 0.3 +
      avgStructure * 0.2 +
      avgConfidence * 0.1
    );

    return {
      overall: Math.round(overall * 10) / 10,
      breakdown: {
        technical: Math.round(avgTechnical * 10) / 10,
        communication: Math.round(avgCommunication * 10) / 10,
        structure: Math.round(avgStructure * 10) / 10,
        confidence: Math.round(avgConfidence * 10) / 10
      }
    };
  }
}

export default InterviewSocketHandler;
