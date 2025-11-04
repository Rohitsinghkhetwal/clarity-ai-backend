import Groq from "groq-sdk";
import dotenv from "dotenv";

dotenv.config({
  path: "./config.env",
});

class AIServices {
  constructor() {
    this.groq = new Groq({
      apiKey: process.env.GROQ_SECRET_KEY,
    });
    console.log("groq initiated success !");
  }

  async generateQuestion(role, previousQuestions, userProfiles) {
    const prompt = `You are an expert technical interviewer for a ${role} postion 
    Previous questions asked: 
    ${previousQuestions.map((q, i) => `${i + 1}. ${q}`).join("\n")}

    Generate the next interview question that 
    1. Is relevant to ${role}
    2. Doesn't repeat previous topics
    3. Matches ${userProfiles.experienceLevel} experience level
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
      max_completion_tokens: 1024,
    });
    return JSON.parse(response.choices[0].message.content);
  }

  async recieveResponse(userArray) {
    try {
      const response = await grok.chat.completions.create({
        model: "llama-3.1-8b-instant",
        message: [
          {
            role: "system",
            content: `You are a JSON-only data formatter and analyzer.

         You will receive an array of objects, where each object represents a question and its corresponding AI analysis (e.g., tone, confidence, score, etc.).

         Your job is to:
         1. Read all the objects in the array.
         2. Calculate the overall/average values (e.g., average score, average confidence).
         3. Summarize the candidate's overall performance in a concise way.
         

         Rules:
         - Always return strictly valid JSON.
         - Do NOT include any markdown, text, or explanation.
         - Ensure numeric values are rounded to two decimal places.
         `,
          },
          {
            role: "user",
            content: ` Analyze the following user data and return JSON with name, role, experienceLevel, and summary.
            Return only valid JSON.
            Data: 
            ${JSON.stringify(userArray)}
            `
          }
        ],
      });
      const output = JSON.parse(response.choices[0].message.content)
      return output
    } catch (err) {
      console.log("Error !");
    }
  }
}

export default new AIServices();
