const express = require("express");
const mysql = require("mysql2/promise");
const os = require("os");

const app = express();
const port = process.env.PORT || 3000;

const config = {
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASS || "",
  database: process.env.DB_NAME || "docker_lab",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

const appVersion = process.env.APP_VERSION || "local";
let pool;

app.use(express.json());

function now() {
  return new Date().toISOString();
}

function getPool() {
  if (!pool) {
    pool = mysql.createPool(config);
  }
  return pool;
}

async function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function queryWithRetry(sql, params = [], attempts = 8) {
  let lastError;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const [rows] = await getPool().execute(sql, params);
      return rows;
    } catch (error) {
      lastError = error;
      console.warn(
        `Database query failed on attempt ${attempt}/${attempts}: ${error.message}`
      );

      if (attempt < attempts) {
        await wait(Math.min(1000 * attempt, 5000));
      }
    }
  }

  throw lastError;
}

async function getDatabaseStatus() {
  try {
    await queryWithRetry("SELECT 1 AS ok", [], 3);
    return "connected";
  } catch (error) {
    return `unavailable: ${error.message}`;
  }
}

app.get("/api/health", async (req, res) => {
  const database = await getDatabaseStatus();
  const healthy = database === "connected";

  res.status(healthy ? 200 : 503).json({
    status: healthy ? "healthy" : "degraded",
    hostname: os.hostname(),
    version: appVersion,
    database,
    timestamp: now()
  });
});

app.get("/api/items", async (req, res) => {
  try {
    const rows = await queryWithRetry(
      "SELECT id, name, description, created_at AS createdAt FROM items ORDER BY id"
    );

    res.json({
      hostname: os.hostname(),
      version: appVersion,
      count: rows.length,
      items: rows,
      timestamp: now()
    });
  } catch (error) {
    res.status(503).json({
      error: "Database query failed",
      message: error.message,
      hostname: os.hostname(),
      timestamp: now()
    });
  }
});

app.post("/api/items", async (req, res) => {
  const name = typeof req.body.name === "string" ? req.body.name.trim() : "";
  const description =
    typeof req.body.description === "string" ? req.body.description.trim() : "";

  if (!name) {
    return res.status(400).json({
      error: "Validation failed",
      message: "The name field is required."
    });
  }

  try {
    const result = await queryWithRetry(
      "INSERT INTO items (name, description) VALUES (?, ?)",
      [name, description || null]
    );

    const rows = await queryWithRetry(
      "SELECT id, name, description, created_at AS createdAt FROM items WHERE id = ?",
      [result.insertId]
    );

    return res.status(201).json({
      hostname: os.hostname(),
      version: appVersion,
      item: rows[0],
      timestamp: now()
    });
  } catch (error) {
    return res.status(503).json({
      error: "Database insert failed",
      message: error.message,
      hostname: os.hostname(),
      timestamp: now()
    });
  }
});

app.get("/api/info", (req, res) => {
  res.json({
    appName: "Docker Lab API",
    version: appVersion,
    hostname: os.hostname(),
    purpose: "Lab 008 API for Docker, Compose, ECR, and Swarm routing mesh demos",
    timestamp: now()
  });
});

app.get("/", (req, res) => {
  res.json({
    message: "Docker Lab API is running. Try /api/health, /api/items, or /api/info.",
    hostname: os.hostname(),
    version: appVersion,
    timestamp: now()
  });
});

app.listen(port, "0.0.0.0", () => {
  console.log(`Docker Lab API listening on 0.0.0.0:${port}`);
  console.log(`App version: ${appVersion}`);
  console.log(`Database host: ${config.host}`);
});
