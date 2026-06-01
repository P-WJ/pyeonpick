const GEMINI_API_BASE_URL =
  "https://generativelanguage.googleapis.com/v1beta/models";
const GEMINI_MODEL = "gemini-2.0-flash";

interface GeminiContentPart {
  text: string;
}

interface GeminiContent {
  parts: GeminiContentPart[];
  role: "user" | "model";
}

interface GeminiRequestBody {
  contents: GeminiContent[];
  generationConfig?: {
    temperature?: number;
    responseMimeType?: string;
  };
}

interface GeminiResponseCandidate {
  content: {
    parts: GeminiContentPart[];
    role: string;
  };
}

interface GeminiResponseBody {
  candidates?: GeminiResponseCandidate[];
  error?: {
    message: string;
    code: number;
  };
}

export async function generateTextFromPrompt(prompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY 환경변수가 설정되지 않았습니다.");
  }

  const endpoint = `${GEMINI_API_BASE_URL}/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

  const requestBody: GeminiRequestBody = {
    contents: [
      {
        role: "user",
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: {
      temperature: 0.7,
    },
  };

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Gemini API 요청 실패 (HTTP ${response.status}): ${errorText}`
    );
  }

  const responseBody = (await response.json()) as GeminiResponseBody;

  if (responseBody.error) {
    throw new Error(
      `Gemini API 오류 (코드 ${responseBody.error.code}): ${responseBody.error.message}`
    );
  }

  const text = responseBody.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error("Gemini API 응답에서 텍스트를 찾을 수 없습니다.");
  }

  return text;
}
