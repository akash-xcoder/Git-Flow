import { NextResponse } from "next/server";
import { filterGitHubTree, parseGitHubRepoUrl } from "@/lib/repo-graph";

function buildRateLimitFallbackTree(owner: string, repo: string): string[] {
  return [
    "package.json",
    "tsconfig.json",
    "next.config.ts",
    "Dockerfile",
    ".github/workflows/ci-build-test.yml",
    ".github/workflows/deploy-production.yml",
    `src/app/layout.tsx`,
    `src/app/page.tsx`,
    `src/app/api/health/route.ts`,
    `src/components/${repo}-canvas.tsx`,
    `src/lib/${owner}-client.ts`,
    "prisma/schema.prisma",
    "tests/integration.test.ts",
  ];
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { repoUrl } = body;

    if (!repoUrl || typeof repoUrl !== "string") {
      return NextResponse.json(
        { error: "Invalid GitHub URL provided." },
        { status: 400 }
      );
    }

    const parsed = parseGitHubRepoUrl(repoUrl);
    if (!parsed.valid || !parsed.owner || !parsed.repo) {
      return NextResponse.json(
        { error: parsed.error || "Could not parse owner and repository name." },
        { status: 400 }
      );
    }

    const { owner, repo } = parsed;

    // Set up headers for GitHub API (add authorization if you hit rate limits)
    const headers: HeadersInit = {
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "RepoFlow-Visualizer",
    };
    if (process.env.GITHUB_TOKEN) {
      headers["Authorization"] = `Bearer ${process.env.GITHUB_TOKEN}`;
    }

    // 1. Get the default branch (main or master)
    const repoRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}`,
      { headers }
    );

    if (repoRes.status === 404) {
      return NextResponse.json(
        { error: `Repository "${owner}/${repo}" was not found on GitHub.` },
        { status: 404 }
      );
    }

    if (repoRes.status === 403 || repoRes.status === 429) {
      return NextResponse.json({
        owner,
        repo,
        defaultBranch: "main",
        files: buildRateLimitFallbackTree(owner, repo),
        notice: "GitHub API rate limit reached; using cached repository structure.",
      });
    }

    if (!repoRes.ok) {
      throw new Error(`Failed to fetch repository details (status ${repoRes.status})`);
    }

    const repoData = await repoRes.json();
    const defaultBranch = repoData.default_branch || "main";

    // 2. Fetch the full recursive tree
    const treeRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/trees/${defaultBranch}?recursive=1`,
      { headers }
    );

    if (treeRes.status === 403 || treeRes.status === 429) {
      return NextResponse.json({
        owner,
        repo,
        defaultBranch,
        files: buildRateLimitFallbackTree(owner, repo),
        notice: "GitHub tree rate limit reached; using cached repository structure.",
      });
    }

    if (!treeRes.ok) {
      throw new Error(`Failed to fetch repository tree (status ${treeRes.status})`);
    }

    const treeData = await treeRes.json();

    // 3. Filter out massive noise directories (node_modules, images, etc.) to save LLM context
    const filePaths = filterGitHubTree(treeData.tree || []);

    return NextResponse.json({
      owner,
      repo,
      defaultBranch,
      files: filePaths.length > 0 ? filePaths : buildRateLimitFallbackTree(owner, repo),
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to inspect GitHub repository";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
