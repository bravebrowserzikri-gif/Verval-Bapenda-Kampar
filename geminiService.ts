
import { GoogleGenAI, Type } from "@google/genai";
import { TaxRecord } from "./types";
import { START_YEAR, END_YEAR } from "./constants";

const taxRecordSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      nama: { type: Type.STRING, description: "Nama Wajib Pajak" },
      nop: { type: Type.STRING, description: "Nomor Objek Pajak" },
      arrears: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            year: { type: Type.INTEGER },
            kurangBayar: { type: Type.NUMBER, description: "Nilai dari kolom Kurang Bayar" }
          },
          required: ["year", "kurangBayar"]
        }
      }
    },
    required: ["nama", "nop", "arrears"]
  }
};

/**
 * Retries a function with exponential backoff.
 */
async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  let delay = 2000;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (err: any) {
      const isRetryable = err?.message?.includes('429') || err?.message?.includes('500') || err?.message?.includes('503');
      if (i === maxRetries - 1 || !isRetryable) throw err;
      console.warn(`API call failed (Attempt ${i + 1}). Retrying in ${delay}ms...`, err);
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 2;
    }
  }
  throw new Error("Max retries exceeded");
}

export async function processTaxPDF(fileBase64: string, mimeType: string): Promise<TaxRecord[]> {
  // Always create a new instance right before the call to use the most up-to-date API key
  // Directly using process.env.API_KEY as per the library guidelines
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const model = "gemini-3-pro-preview";
  
  const prompt = `
    Extract regional tax arrears data from this PBB-P2 document.
    1. Identify the 'Nama Wajib Pajak' (Nama) and 'Nomor Objek Pajak' (NOP).
    2. Extract all yearly records. Use the value from the 'Kurang Bayar' column.
    3. If 'Kurang Bayar' is 0, record it as 0.
    4. Normalize the data. If a year is missing in the PDF, do not invent it, just provide the ones that exist.
  `;

  const response = await withRetry(async () => {
    return await ai.models.generateContent({
      model,
      contents: {
        parts: [
          { text: prompt },
          { inlineData: { data: fileBase64, mimeType } }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: taxRecordSchema
      }
    });
  });

  const rawData = JSON.parse(response.text || "[]");
  
  return rawData.map((item: any) => {
    const arrearsMap: Record<number, number | null> = {};
    
    // Initialize years
    for (let y = START_YEAR; y <= END_YEAR; y++) {
      arrearsMap[y] = null;
    }

    // Fill with extracted data
    item.arrears.forEach((a: any) => {
      if (a.year >= START_YEAR && a.year <= END_YEAR) {
        arrearsMap[a.year] = a.kurangBayar;
      }
    });

    // Calculate total: sum of values > 0
    const total = Object.values(arrearsMap).reduce((sum: number, val) => {
      const numVal = val as number | null;
      return sum + (numVal !== null && numVal > 0 ? numVal : 0);
    }, 0);

    return {
      nama: item.nama,
      nop: item.nop,
      arrears: arrearsMap,
      total,
      notes: []
    };
  });
}
