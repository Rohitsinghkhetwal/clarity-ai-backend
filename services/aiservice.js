import OpenAI from "openai";

class AIServices {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPEN_AI_API_KEY,
    });
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

    const response = await this.openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: "You are expert technical interviewer." },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
      max_completion_tokens: 150,
    });

    return response.choices[0].message.content.trim();
  }

  //analyze answer quality
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

    const response = await this.openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content:
            "You are an expert at evaluating interview answers. Always respond with valid JSON.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.3,
      response_format: {type: 'json_object'}
    });
    return JSON.parse(response.choices[0].message.content);
  }
}

export default new AIServices();
