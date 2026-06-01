// Groq API를 사용한 AI 텍스트 생성 (Gemini 대체)
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.3-70b-versatile";

interface GroqMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface GroqResponseBody {
  choices?: { message: { content: string } }[];
  error?: { message: string };
}

export async function generateTextFromPrompt(prompt: string): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("GROQ_API_KEY 환경변수가 설정되지 않았습니다.");
  }

  const messages: GroqMessage[] = [
    {
      role: "system",
      content:
        "You are a Korean convenience store shopping expert. Always respond with valid JSON only. No explanation, no markdown, just the JSON object.",
    },
    { role: "user", content: prompt },
  ];

  const response = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages,
      temperature: 0.7,
      max_tokens: 2048,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Groq API 요청 실패 (HTTP ${response.status}): ${errorText}`);
  }

  const body = (await response.json()) as GroqResponseBody;

  if (body.error) {
    throw new Error(`Groq API 오류: ${body.error.message}`);
  }

  const text = body.choices?.[0]?.message?.content;
  if (!text) {
    throw new Error("Groq API 응답에서 텍스트를 찾을 수 없습니다.");
  }

  return text;
}
