import { runDueProbes } from "@/lib/probe-runner";

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const summary = await runDueProbes();
  return Response.json(summary);
}
