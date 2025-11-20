import { GoogleGenAI, Type } from "@google/genai";
import { QuizItem, QuizSet } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Generates a quiz set including title and questions from an image.
 */
export const generateQuizFromImage = async (base64Image: string): Promise<QuizSet> => {
  try {
    const cleanBase64 = base64Image.split(',')[1] || base64Image;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: cleanBase64
            }
          },
          {
            text: `
            画像のテキストを分析し、学習用の問題セットを作成してください。
            1. 重要な教育的概念を抽出する。
            2. この学習セッションの短いタイトルを作成する（例：「日本史：明治時代」）。
            3. テキストの内容に厳密に基づいた、学習効果の高い問題を3〜5問作成する。
            4. 正解と、その根拠となる元のテキストの抜粋を提供する。
            `
          }
        ]
      },
      config: {
        systemInstruction: "あなたは熟練した教育者です。曖昧な出題は避け、明確で事実に基づいたクイズを作成してください。",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: "A short title for this quiz set based on the content." },
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  question: { type: Type.STRING },
                  answer: { type: Type.STRING },
                  originalContext: { type: Type.STRING }
                },
                required: ["question", "answer"]
              }
            }
          },
          required: ["title", "items"]
        }
      }
    });

    if (response.text) {
        const data = JSON.parse(response.text);
        const timestamp = Date.now();
        
        const items = data.items.map((item: any, index: number) => ({
            ...item,
            id: `q-${timestamp}-${index}`,
            generatedHints: [] // Initialize empty hints
        }));

        return {
            id: `set-${timestamp}`,
            title: data.title || "Study Session",
            createdAt: timestamp,
            items: items
        };
    }
    throw new Error("No response text generated.");

  } catch (error) {
    console.error("Gemini Quiz Generation Error:", error);
    throw error;
  }
};

/**
 * Generates a progressive hint based on the level (1-3).
 */
export const generateInteractiveHint = async (
    question: string, 
    answer: string, 
    level: number, // 1, 2, or 3
    context?: string
): Promise<string> => {
    try {
        let systemPrompt = "";
        let userPrompt = "";
        
        // レベルに応じた厳格な指示
        switch(level) {
            case 1:
                // Level 1: 概念・抽象
                systemPrompt = `
                あなたは「謎かけの達人」です。
                以下のルールを【絶対に】守ってください：
                1. 答えそのもの、または答えに含まれる単語は絶対に使用しないこと。
                2. 抽象的な概念、アナロジー、または比喩を使うこと。
                3. 「それは何か」ではなく「どのような性質か」を説明すること。
                4. 20文字以内の短い日本語で答えること。
                `;
                userPrompt = "概念的なヒントをください。核心には触れないでください。";
                break;
            case 2:
                // Level 2: 具体的な属性・文脈
                systemPrompt = `
                あなたは「親切な家庭教師」です。
                以下のルールを【絶対に】守ってください：
                1. 答えを直接言わないこと。
                2. 答えの属性（時代、場所、カテゴリー、色、用途など）を具体的に一つ挙げること。
                3. 思考を特定の領域に絞り込ませるような情報を出すこと。
                4. 30文字以内の日本語で答えること。
                `;
                userPrompt = "もう少し具体的なヒントをください。どの分野や属性のものですか？";
                break;
            case 3:
                // Level 3: 構造・頭文字（ほぼ答え）
                systemPrompt = `
                あなたは「答えを教えたくてたまらない同級生」です。
                以下のルールを【絶対に】守ってください：
                1. 答えの「最初の1文字」または「文字数」を教えること。
                2. もしくは、答えの一部を伏せ字（例：〇〇時代）にして提示すること。
                3. ユーザーが「あと一歩で思い出せる」状態にすること。
                4. 極めて短く簡潔にすること。
                `;
                userPrompt = "決定的なヒントをください。最初の文字や構成を教えてください。";
                break;
            default:
                systemPrompt = "学習を助けるヒントを出してください。";
        }

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `
            Question: "${question}"
            Correct Answer: "${answer}"
            Original Text Context: "${context || 'N/A'}"
            
            Request: ${userPrompt}
            `,
            config: {
                systemInstruction: systemPrompt,
                temperature: 0.7, // 少し創造性を抑えて指示に従わせる
            }
        });
        return response.text || "よく考えてみましょう。";
    } catch (error) {
        console.error("Gemini Hint Generation Error:", error);
        return "ヒントの取得に失敗しました。";
    }
}