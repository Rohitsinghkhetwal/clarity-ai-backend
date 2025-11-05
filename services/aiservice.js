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
      const response = await this.groq.chat.completions.create({
        model: "llama-3.1-8b-instant",
        messages: [
          {
            role: "system",
            content: `
          You are an interview evaluator that returns strictly valid JSON.

          You will receive an array of interview question objects. Each object contains:
          - questionText (string)
          - userAnswer (string | null | undefined)
          - analysis (object containing scoring details)

          Your evaluation MUST prioritize userAnswer text over analysis.

          Definition of "answered":
          - userAnswer exists AND contains at least 5 meaningful words.

          Process:
          1. Filter the array to only include answered questions.
          2. If **no questions were answered**:
            Return the following JSON and do not evaluate anything else:

            {
              "overallScore": 0,
              "communicationClarity": 0,
              "responseQuality": 0,
              "confidence": 0,
              "tone": "not enough data",
              "strengths": [],
              "weaknesses": ["No answers were provided"],
              "improvementAreas": ["Please answer the questions so we can evaluate your performance"]
            }

          3. If one or more questions were answered:
            Evaluate ONLY the answered questions and compute:
            - overallScore (0–10, two decimals)
            - communicationClarity (0–100)
            - responseQuality (0–100)
            - confidence (0–100)
            - tone (short phrase describing overall tone)
            - strengths: 2–5 strengths derived from actual answers
            - weaknesses: 2–5 weaknesses derived from actual answers
            - improvementAreas: 2–5 practical suggestions for growth

          Hard Rules:
          - Return ONLY valid JSON.
          - No markdown, no commentary, no explanations.
          - Do NOT output per-question details.
          - Round all numeric values to two decimals.
          `,
                    },

                    {
                      role: "user",
                      content: `
                  Evaluate the following interview data and return final aggregated scoring and feedback ONLY as JSON:

                  ${JSON.stringify(userArray)}
                  `,
                    },
                  ],
      });

      const result = response.choices[0].message.content;
      return JSON.parse(result);
    } catch (error) {
      console.error("AI Summary Error:", error);
      throw new Error("AI summary generation failed");
    }
  }
}

export default new AIServices();
