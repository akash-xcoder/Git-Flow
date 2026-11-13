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
    const sampledFiles = files.slice(0, 150);
    const apiKey = process.env.GEMINI_API_KEY;

    // Fallback to deterministic file-tree analyzer if API key is not configured
    if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
      const fallbackGraph = deriveArchitectureFromFiles(sampledFiles, owner, repo);
      return NextResponse.json(fallbackGraph);
    }

    const prompt = `
      You are an expert Software Architect analyzing the repository: ${repoUrl}.
      Map the complete codebase architecture as a React Flow JSON graph.
      
      You must group related files into logical clusters (e.g., "YOLO Inference", "Navigation", "Frontend UI").
      
      NODES ARRAY:
      1. Create a "group" node for every logical cluster:
         { "id": "group-inference", "type": "group", "data": { "label": "YOLO Inference" } }
      
      2. Create standard nodes for the actual files, and assign them to a group using 'parentNode', plus semantic 'category' metadata ("api", "database", "service", "ui", "config", "security", "testing", "source", "pipeline", "artifact", or "deployment"):
         { 
           "id": "file-worker-ts", 
           "type": "custom", 
           "parentNode": "group-inference", 
           "data": { "label": "worker.ts (Inference worker)", "category": "service" } 
         }
      
      EDGES ARRAY:
      Map the functional data flow between the files (e.g., Viewport.tsx -> torch.ts).
      {
        "id": "e-sourceId-targetId",
        "source": "source-node-id",
        "target": "target-node-id",
        "type": "smoothstep",
        "animated": true,
        "className": "electric-edge"
      }
      
      Files to analyze:
      ${JSON.stringify(sampledFiles)}
    `;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
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
                    className: { type: Type.STRING },
                  },
                  required: ["id", "source", "target"],
                },
              },
            },
            required: ["nodes", "edges"],
          },
        },
      });

      const responseText = (response.text ?? "").trim();
      const parsedJson = JSON.parse(responseText);
      const graphData = normalizeGeneratedGraph(parsedJson);
      return NextResponse.json(graphData);
    } catch (geminiErr: unknown) {
      console.warn(
        "Gemini API call failed, falling back to deterministic file tree analysis:",
        geminiErr
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
