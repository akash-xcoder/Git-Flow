import { NextResponse } from "next/server";
import { GoogleGenAI, ThinkingLevel, Type } from "@google/genai";
import {
  deriveArchitectureFromFiles,
  normalizeGeneratedGraph,
} from "@/lib/repo-graph";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      files,
      owner = "github",
      repo = "repository",
      repoUrl: rawRepoUrl,
    } = body;

    if (!files || !Array.isArray(files) || files.length === 0) {
      return NextResponse.json(
        { error: "No repository files provided." },
        { status: 400 }
      );
    }

    const repoUrl =
      typeof rawRepoUrl === "string" && rawRepoUrl.trim()
        ? rawRepoUrl.trim()
        : `https://github.com/${owner}/${repo}`;
    const boilerplatePattern =
      /(?:^|\/)(?:\.gitignore|\.gitattributes|\.eslint[^/]*|\.oxlintrc[^/]*|\.prettier[^/]*|\.vercelignore|package\.json|package-lock\.json|tsconfig[^/]*\.json|readme(?:\.[^/]*)?|license(?:\.[^/]*)?|\.env[^/]*)$/i;
    const nonBoilerplateFiles = files.filter(
      (f): f is string => typeof f === "string" && !boilerplatePattern.test(f)
    );
    const sampledFiles = (
      nonBoilerplateFiles.length > 0 ? nonBoilerplateFiles : files
    ).slice(0, 100);
    const apiKey = process.env.GEMINI_API_KEY;

    // Fallback to deterministic file-tree analyzer if API key is not configured
    if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
      const fallbackGraph = deriveArchitectureFromFiles(sampledFiles, owner, repo);
      return NextResponse.json(fallbackGraph);
    }

    const prompt = `You are an Expert Software Architect. Your task is to analyze the provided GitHub repository file tree and generate a React Flow JSON graph that maps the ACTUAL FUNCTIONAL EXECUTION FLOW of the application.

CRITICAL RULES:
1. IGNORE ALL BOILERPLATE: Completely ignore files like .gitignore, package.json, tsconfig.json, ESLint configs, and READMEs. Do not map them.
2. MAP THE DATA FLOW: Trace how data moves through the app. Start from the User/Entry Point -> Frontend UI -> Backend/Services -> Database/Hardware. (e.g., Viewport -> Camera -> Inference Model -> Database).
3. USE FUNCTIONAL GROUPS: Group related files into logical clusters using 'parentNode'. Examples: "User Interface", "YOLO Inference", "Data Persistence", "Hardware Bridge".
4. DESCRIPTIVE EDGES: Every edge MUST have a 'label' property explaining the action (e.g., "renders", "fetches weights", "saves routes", "streams video").
5. COLOR CODING: Assign semantic colors to nodes via 'data.color':
   - Frontend/UI: "#3b82f6" (Blue)
   - Backend/API: "#10b981" (Green)
   - AI/Models/Logic: "#eab308" (Yellow)
   - Database/Storage: "#8b5cf6" (Purple)

JSON OUTPUT FORMAT:
Return strictly valid JSON with no markdown formatting.
{
  "nodes": [
    { 
      "id": "group-inference", 
      "type": "group", 
      "data": { "label": "YOLO Inference Engine" } 
    },
    { 
      "id": "file-worker-ts", 
      "type": "custom", 
      "parentNode": "group-inference",
      "data": { "label": "worker.ts (Inference Thread)", "color": "#eab308" } 
    }
  ],
  "edges": [
    { 
      "id": "e-viewport-worker", 
      "source": "file-viewport-tsx", 
      "target": "file-worker-ts", 
      "type": "smoothstep", 
      "animated": true,
      "label": "streams frames",
      "className": "electric-edge" 
    }
  ]
}

Repository files to analyze (${repoUrl}):
${JSON.stringify(sampledFiles)}`;

    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    try {
      const timeoutPromise = new Promise<{ timedOut: true }>((resolve) => {
        timeoutId = setTimeout(() => resolve({ timedOut: true }), 45000);
      });

      const generatePromise = ai.models
        .generateContent({
          model: "gemini-4-hydrogen",
          contents: prompt,
          config: {
            maxOutputTokens: 8192,
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                nodes: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING },
                      type: { type: Type.STRING },
                      parentNode: { type: Type.STRING },
                      position: {
                        type: Type.OBJECT,
                        properties: {
                          x: { type: Type.NUMBER },
                          y: { type: Type.NUMBER },
                        },
                      },
                      data: {
                        type: Type.OBJECT,
                        properties: {
                          label: { type: Type.STRING },
                          sublabel: { type: Type.STRING },
                          category: { type: Type.STRING },
                          color: { type: Type.STRING },
                          latencyMs: { type: Type.NUMBER },
                        },
                        required: ["label"],
                      },
                    },
                    required: ["id", "type", "data"],
                  },
                },
                edges: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING },
                      source: { type: Type.STRING },
                      target: { type: Type.STRING },
                      type: { type: Type.STRING },
                      animated: { type: Type.BOOLEAN },
                      label: { type: Type.STRING },
                      className: { type: Type.STRING },
                    },
                    required: ["id", "source", "target", "label"],
                  },
                },
              },
              required: ["nodes", "edges"],
            },
          },
        })
        .then((response) => ({ timedOut: false as const, response }));

      const raceResult = await Promise.race([generatePromise, timeoutPromise]);
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
      }

      if (raceResult.timedOut) {
        console.info(
          "[api/generate] Gemini request exceeded 45s budget; returning deterministic file-tree architecture."
        );
        const fallbackGraph = deriveArchitectureFromFiles(sampledFiles, owner, repo);
        return NextResponse.json(fallbackGraph);
      }

      const responseText = (raceResult.response.text ?? "").trim();
      const parsedJson = JSON.parse(responseText);
      const graphData = normalizeGeneratedGraph(parsedJson);
      return NextResponse.json(graphData);
    } catch (geminiErr: unknown) {
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
      }
      const reason =
        geminiErr instanceof Error ? geminiErr.message : "Unknown error";
      console.info(
        `[api/generate] Falling back to deterministic file tree analysis: ${reason}`
      );
      const fallbackGraph = deriveArchitectureFromFiles(sampledFiles, owner, repo);
      return NextResponse.json(fallbackGraph);
    }
  } catch (error: unknown) {
    console.error("Gemini Generation Error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to generate architecture graph";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
