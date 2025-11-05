// server/server.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const helmet = require("helmet");
const compression = require("compression");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");

const app = express();

app.use(helmet({ contentSecurityPolicy: false })); 
app.use(compression());
app.use(morgan("combined"));
app.use(cors());
app.use(express.json());

app.use(
  "/api/",
  rateLimit({
    windowMs: 60 * 1000, 
    max: 30,             
    standardHeaders: true,
    legacyHeaders: false,
  })
);

app.use(express.static(path.join(__dirname, "public")));

// Healthcheck
app.get("/health", (_req, res) => res.status(200).send("OK"));

app.post("/api/chat", async (req, res) => {
  const { system, messages } = req.body || {};

  const model = process.env.MODEL || "gpt-4o-mini";
  const temperature = Number(process.env.TEMPERATURE ?? 0.2);
  const max_tokens = Number(process.env.MAX_TOKENS ?? 300);

  try {
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        temperature,
        max_tokens,
        messages: [
          {
            role: "system",
            content:
              (system && String(system)) ||
              "Сен ТЕК қазақ тілінде жауап бересің. Жауаптарың қысқа, нақты және түсінікті болсын. " +
              "Егер пайдаланушы басқа тілде жазса да, әрдайым қазақ тілінде жауап бер." + "Сен тек тарихи сұрақтарға жауап бересің, тек тарихпен байланысты.",
          },
          ...(Array.isArray(messages) ? messages : []),
        ],
      }),
    });

    const data = await r.json();

    if (!r.ok) {
      console.error("OpenAI error:", data);
      return res
        .status(r.status)
        .json({ reply: "Модельден жауап алу сәтсіз. Кейінірек қайталап көріңіз." });
    }

    const reply =
      data?.choices?.[0]?.message?.content ||
      "Кешіріңіз, жауап табылмады.";

    res.json({ reply });
  } catch (e) {
    console.error("❌ ERROR /api/chat:", e);
    res.status(500).json({ reply: "Сервер қателігі. Кейінірек қайталап көріңіз." });
  }
});

// SPA fallback (на будущее, если будут роуты)
app.get("*", (_req, res) =>
  res.sendFile(path.join(__dirname, "public", "index.html"))
);

const port = Number(process.env.PORT) || 3001;
app.listen(port, () => {
  console.log("▶ server.js starting…");
  console.log("   CWD:", process.cwd());
  console.log("   Node:", process.version);
  console.log("   Has OPENAI_API_KEY:", Boolean(process.env.OPENAI_API_KEY));
  console.log(`✅ Running at http://localhost:${port}`);
});
