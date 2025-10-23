import Groq from "groq-sdk";
import dotenv from "dotenv"

dotenv.config({
  path: './config.env'
})


class AIServices {
  constructor() {
    this.groq = new Groq({
      apiKey: process.env.GROQ_SECRET_KEY,
    });
    console.log("groq initiated success !")
  }

  async generateQuestion(role, previousQuestions, userProfiles) {
    const prompt = `You are an expert technical interviewer for a ${role} postion 
    Previous questions asked: 
    ${previousQuestions.map((q, i) => `${i + 1}. ${q}`).join("\n")}

    Generate the next interview question that 
    1. Is relevant to ${role}
    2. Doesn't repeat previous topics
    3. Matches ${userProfiles.experienceLevel} experienc level
    4. Is clear and specific

    Return only the question text , nothing else `;

    const response = await this.groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        { role: "system", content: "You are expert technical interviewer." },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 200,
    });

    return response.choices[0].message.content.trim();
  }

  
  async analyzeAnswer(question, userAnswer, idealAnswer) {
    const prompt = `Analyze this interview answer:
    Question: ${question}
    User's Answer: ${userAnswer}
   ${idealAnswer ? `Ideal Answer: ${idealAnswer}` : ""}

    Provide a JSON analysis with:
    - relevanceScore (0-10): How relevant the answer is
    - technicalAccuracy (0-10): Technical correctness
    - structureScore (0-10): Answer organization
    - strengths: Array of 2-3 strengths
    - weaknesses: Array of 2-3 areas for improvement
    - suggestions: Array of 2-3 specific suggestions

    Return ONLY valid JSON, no other text.`;

    const response = await this.groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        {
          role: "system",
          content:
            "You are an expert at evaluating interview answers. Always respond with valid JSON.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.3,
      max_completion_tokens: 1024
    });
    return JSON.parse(response.choices[0].message.content);
  }
}

export default new AIServices();
