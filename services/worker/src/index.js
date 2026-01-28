// services/worker/src/index.js
const { Pool } = require("pg");

const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgres://postgres:postgres@postgres:5432/cloud_db?sslmode=disable";

const POLL_MS = Number(process.env.POLL_MS || 1000); // how often to look for work
const WORK_MS = Number(process.env.WORK_MS || 3000); // simulate async work

const pool = new Pool({ connectionString: DATABASE_URL });

function logJSON(obj) {
  console.log(JSON.stringify({ ts: new Date().toISOString(), ...obj }));
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// wait until Postgres is reachable (important for restarts)
async function waitForDb() {
  let delay = 500;
  while (true) {
    try {
      await pool.query("SELECT 1");
      logJSON({ level: "info", msg: "worker_db_ready" });
      return;
    } catch (e) {
      logJSON({
        level: "warn",
        msg: "worker_db_not_ready",
        err: String(e.message || e),
        retry_ms: delay,
      });
      await sleep(delay);
      delay = Math.min(delay * 2, 5000);
    }
  }
}

// claim ONE pending order safely
async function claimOne(client) {
  const q = await client.query(`
    SELECT id, user_id
    FROM orders
    WHERE status = 'PENDING'
    ORDER BY id
    FOR UPDATE SKIP LOCKED
    LIMIT 1
  `);
  return q.rowCount === 1 ? q.rows[0] : null;
}

async function main() {
  await waitForDb();

  logJSON({
    level: "info",
    msg: "worker_started",
    poll_ms: POLL_MS,
    work_ms: WORK_MS,
  });

  while (true) {
    let client;
    try {
      client = await pool.connect();
      await client.query("BEGIN");

      const order = await claimOne(client);

      if (!order) {
        await client.query("COMMIT");
        client.release();
        await sleep(POLL_MS);
        continue;
      }

      const orderId = order.id;

      logJSON({
        level: "info",
        msg: "job_claimed",
        order_id: orderId,
        user_id: order.user_id,
      });

      // simulate async work (payment, shipping, etc.)
      await sleep(WORK_MS);

      // mark success (allowed by your DB constraint)
      await client.query(
        `UPDATE orders SET status = 'CONFIRMED' WHERE id = $1`,
        [orderId]
      );

      await client.query("COMMIT");
      client.release();

      logJSON({
        level: "info",
        msg: "job_confirmed",
        order_id: orderId,
      });
    } catch (e) {
      try {
        if (client) {
          await client.query("ROLLBACK");
          client.release();
        }
      } catch (_) {}

      logJSON({
        level: "error",
        msg: "worker_error",
        err: String(e.message || e),
      });

      await sleep(1000);
    }
  }
}

main().catch((e) => {
  logJSON({
    level: "fatal",
    msg: "worker_crashed",
    err: String(e.message || e),
  });
  process.exit(1);
});
