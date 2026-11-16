import "jsr:@supabase/functions-js/edge-runtime.d.ts";

interface GitHubPushPayload {
  ref?: string;
  after?: string; // Commit SHA
  repository?: {
    id?: number;
    name?: string;
    full_name?: string;
    html_url?: string;
    clone_url?: string;
    default_branch?: string;
  };
  head_commit?: {
    id?: string;
    message?: string;
    timestamp?: string;
    url?: string;
  };
  sender?: {
    login?: string;
  };
}

Deno.serve(async (req: Request) => {
  // Handle CORS Preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-github-event, x-hub-signature-256",
      },
    });
  }

  try {
    const githubEvent = req.headers.get("x-github-event");

    // Handle GitHub webhook ping event
    if (githubEvent === "ping") {
      return new Response(JSON.stringify({ status: "ok", message: "Webhook ping received successfully" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (githubEvent !== "push") {
      return new Response(
        JSON.stringify({
          error: `Unsupported or missing event: ${githubEvent || "none"}. Only 'push' events are handled.`,
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const payload: GitHubPushPayload = await req.json();
    const repoUrl = payload.repository?.html_url;
    const commitHash = payload.after || payload.head_commit?.id;
    const ref = payload.ref;

    if (!repoUrl) {
      return new Response(
        JSON.stringify({ error: "Missing repository URL in push payload" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log(`[github-sync] Received push for ${repoUrl} (ref: ${ref}, commit: ${commitHash})`);

    // In a full sync, this would compute or trigger updating the cached diagram in Supabase
    return new Response(
      JSON.stringify({
        status: "success",
        event: "push",
        repository: repoUrl,
        commit_hash: commitHash,
        ref: ref,
        message: "GitHub push event received and processed",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[github-sync] Error processing webhook:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal Server Error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});
