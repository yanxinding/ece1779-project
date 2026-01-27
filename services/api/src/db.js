const { Pool } = require("pg");

const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgres://postgres:postgres@postgres:5432/cloud_db?sslmode=disable";

const pool = new Pool({
  connectionString: DATABASE_URL,
});

module.exports = { pool };
