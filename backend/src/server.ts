import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const port = Number(process.env.PORT) || 4000;

app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

// Basic health-check endpoint (SRS OPS-004: reveals no sensitive configuration)
app.get("/api/v1/public/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    service: "ideolearn-api",
    timestamp: new Date().toISOString(),
  });
});

app.listen(port, () => {
  console.log(`IdeoLearn API server running on http://localhost:${port}`);
});