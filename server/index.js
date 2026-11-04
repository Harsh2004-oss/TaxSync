const express = require("express");
const cors = require("cors");
const path = require("path");

const uploadRouter = require("./routes/upload");
const reconcileRouter = require("./routes/reconcile");
const whatsappRouter = require("./routes/whatsapp");
const vendorRouter = require("./routes/vendor");

const app = express();
const PORT = process.env.PORT || 5000;

// ── Middleware ───────────────────────────────────────────────────────────────
const ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:3000",
  "http://127.0.0.1:5173",
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (Postman, curl, server-to-server)
    if (!origin) return callback(null, true);
    // Allow any *.vercel.app subdomain
    if (origin.endsWith(".vercel.app")) return callback(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: Origin ${origin} not allowed`));
  },
  credentials: true,
}));
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));

// Request logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ── API Routes ───────────────────────────────────────────────────────────────
app.use("/api/upload", uploadRouter);
app.use("/api/reconcile", reconcileRouter);
app.use("/api/whatsapp", whatsappRouter);
app.use("/api/vendor", vendorRouter);

// ── Health Check ─────────────────────────────────────────────────────────────
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    service: "TaxSync AI Engine",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  });
});

// ── Error Handler ─────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: err.message || "Internal server error" });
});

// ── Start Server ──────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════╗
║          TaxSync AI — Reconciliation Engine           ║
║                   Server v1.0.0                       ║
╠══════════════════════════════════════════════════════╣
║  🟢  Running on: http://localhost:${PORT}               ║
║  📊  Health:     http://localhost:${PORT}/api/health    ║
╚══════════════════════════════════════════════════════╝
  `);
});

module.exports = app;
