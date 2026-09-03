import { timingSafeEqual } from "node:crypto";
import express from "express";
import { refresh, today } from "../src/refresh.js";

const app = express();

function authorized(supplied: string | undefined): boolean {
  const secret = process.env.REFRESH_SECRET;
  if (!secret || !supplied) return false;
  const a = Buffer.from(supplied);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

app.post("/api/refresh", async (req, res) => {
  if (!authorized(req.get("x-refresh-secret"))) {
    return res.status(401).json({ error: "unauthorized" });
  }

  const offset = Math.max(0, Number(req.query.offset) || 0);
  const limit = Math.min(1000, Math.max(1, Number(req.query.limit) || 1000));

  try {
    res.json(await refresh({ offset, limit }));
  } catch (err) {
    console.error("refresh", err);
    res.status(500).json({ error: "refresh failed" });
  }
});

app.get("/api/rooms", async (_req, res) => {
  try {
    const data = await today();
    res.set(
      "Cache-Control",
      "public, max-age=0, s-maxage=600, stale-while-revalidate=1800",
    );
    res.json(data);
  } catch (err) {
    console.error("rooms", err);
    res.status(500).json({ error: "unavailable" });
  }
});

export default app;
