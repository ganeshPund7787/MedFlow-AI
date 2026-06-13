// import { GoogleGenerativeAI } from "@google/generative-ai";
// import Settings from "../models/settings";

// const DEFAULT_MODEL = "gemini-2.5-flash";
// const DEFAULT_TEMPERATURE = 0.2;

// function getClient() {
//   if (!process.env.GEMINI_KEY) {
//     throw new Error("GEMINI_KEY is not configured on server.");
//   }
//   return new GoogleGenerativeAI(process.env.GEMINI_KEY);
// }

// export async function runGeminiJsonPrompt<T>(options: {
//   prompt: string;
//   fallback: T;
//   maxRetries?: number;
// }) {
//   const { prompt, fallback, maxRetries = 2 } = options;

//   let settingsModel = DEFAULT_MODEL;

//   console.log(
//     "[ai] GEMINI_KEY present:",
//     !!process.env.GEMINI_KEY,
//     "Model:",
//     settingsModel,
//   );

//   let temperature = DEFAULT_TEMPERATURE;
//   try {
//     const settings = await Settings.findOne().lean();
//     settingsModel = settings?.aiModelName || DEFAULT_MODEL;
//     const validModels = [
//       "gemini-2.5-flash",
//       "gemini-2.0-flash-lite",
//       "gemini-2.5-flash-preview-05-20",
//       "gemini-2.5-pro-preview-05-06",
//     ];
//     const dbModel = settings?.aiModelName;
//     settingsModel =
//       dbModel && validModels.includes(dbModel) ? dbModel : DEFAULT_MODEL;
//     settingsModel = settings?.aiModelName || DEFAULT_MODEL;

//     temperature = settings?.aiTemperature ?? DEFAULT_TEMPERATURE;
//   } catch {
//     // Keep defaults when settings query fails.
//   }

//   const model = getClient().getGenerativeModel({ model: settingsModel });

//   let lastError: unknown = null;
//   for (let attempt = 0; attempt <= maxRetries; attempt++) {
//     try {
//       const result = await model.generateContent({
//         generationConfig: {
//           temperature,
//           responseMimeType: "application/json",
//         },
//         contents: [{ role: "user", parts: [{ text: prompt }] }],
//       });
//       const text = result.response.text();
//       if (!text?.trim()) {
//         throw new Error("Gemini returned empty response");
//       }
//       return JSON.parse(text) as T;
//     } catch (error) {
//       lastError = error;
//       if (attempt >= maxRetries) {
//         break;
//       }
//       await new Promise((resolve) => setTimeout(resolve, 300 * (attempt + 1)));
//     }
//   }

//   console.error("[ai] Gemini JSON prompt failed:", lastError);
//   return fallback;
// }

import { GoogleGenerativeAI } from "@google/generative-ai";
import Settings from "../models/settings";

const DEFAULT_MODEL = "gemini-2.5-flash";
const DEFAULT_TEMPERATURE = 0.2;

function getClient() {
  if (!process.env.GEMINI_KEY) {
    throw new Error("GEMINI_KEY is not configured on server.");
  }
  return new GoogleGenerativeAI(process.env.GEMINI_KEY);
}

// export async function runGeminiJsonPrompt<T>(options: {
//   prompt: string;
//   fallback: T;
//   maxRetries?: number;
// }) {
//   const { prompt, fallback, maxRetries = 2 } = options;

//   let settingsModel = DEFAULT_MODEL;
//   let temperature = DEFAULT_TEMPERATURE;

//   try {
//     const settings = await Settings.findOne().lean();
//     const validModels = [
//       "gemini-2.5-flash",
//       "gemini-2.0-flash-lite",
//       "gemini-2.5-flash-preview-05-20",
//       "gemini-2.5-pro-preview-05-06",
//     ];
//     const dbModel = settings?.aiModelName;
//     settingsModel =
//       dbModel && validModels.includes(dbModel) ? dbModel : DEFAULT_MODEL;
//     // ❌ REMOVE the duplicate line that was here
//     temperature = settings?.aiTemperature ?? DEFAULT_TEMPERATURE;
//   } catch {
//     // Keep defaults
//   }

//   console.log(
//     "[ai] GEMINI_KEY present:",
//     !!process.env.GEMINI_KEY,
//     "Model:",
//     settingsModel, // ← now logs AFTER settings are resolved
//   );

//   const model = getClient().getGenerativeModel({ model: settingsModel });

//   let lastError: unknown = null;
//   for (let attempt = 0; attempt <= maxRetries; attempt++) {
//     try {
//       const result = await model.generateContent({
//         generationConfig: {
//           temperature,
//           responseMimeType: "application/json",
//         },
//         contents: [{ role: "user", parts: [{ text: prompt }] }],
//       });
//       const text = result.response.text();
//       if (!text?.trim()) {
//         throw new Error("Gemini returned empty response");
//       }
//       return JSON.parse(text) as T;
//     } catch (error) {
//       lastError = error;
//       // ✅ Log each attempt so you can see the REAL error
//       console.error(`[ai] Gemini attempt ${attempt + 1} failed:`, error);
//       if (attempt >= maxRetries) {
//         break;
//       }
//       await new Promise((resolve) => setTimeout(resolve, 300 * (attempt + 1)));
//     }
//   }

//   console.error("[ai] Gemini JSON prompt failed after all retries:", lastError);
//   return fallback;
// }

export async function runGeminiJsonPrompt<T>(options: {
  prompt: string;
  fallback: T;
  maxRetries?: number;
}) {
  const { prompt, fallback } = options;

  try {
    const client = getClient();

    const model = client.getGenerativeModel({ model: "gemini-2.5-flash" });

    const result = await model.generateContent({
      generationConfig: {
        temperature: 0.2,
        responseMimeType: "application/json",
      },
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });

    const text = result.response.text();

    const parsed = JSON.parse(text);
    return parsed as T;
  } catch (error: any) {
    console.error("[ai-debug] ❌ CAUGHT ERROR:");
    console.error("[ai-debug] message:", error?.message);
    console.error("[ai-debug] status:", error?.status);
    console.error("[ai-debug] code:", error?.code);
    console.error("[ai-debug] full:", JSON.stringify(error, null, 2));
    return fallback;
  }
}
