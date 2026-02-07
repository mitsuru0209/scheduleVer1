
import { GoogleGenAI, Type } from "@google/genai";
import { Subject } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const suggestSchedule = async (subjects: Subject[], context: string) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `あなたは学校の時間割作成のエキスパートです。
      以下の科目を3年制の学校の月曜から金曜、1日5時限の時間割に最適に配置してください。
      
      科目リスト: ${JSON.stringify(subjects.map(s => s.name))}
      追加の要望: ${context}
      
      出力はJSON形式で、3学年それぞれの5日間×5時限の配置を提案してください。`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            suggestions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  year: { type: Type.STRING },
                  schedule: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        day: { type: Type.STRING },
                        periods: {
                          type: Type.ARRAY,
                          items: { type: Type.STRING }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    const responseText = response.text;
    if (responseText) {
      return JSON.parse(responseText);
    }
    return null;
  } catch (error) {
    console.error("AI Schedule Suggestion Error:", error);
    return null;
  }
};
