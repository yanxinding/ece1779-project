// services/api/src/index.js
// Node + Express + pg
// Matches your schema:
//   products(id, sku, name, inventory, created_at)
//   order_items(id, order_id, product_id, quantity)
// Assumes orders table has: orders(id, user_id, status, created_at)

const express = require("express");
const { Pool } = require("pg");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 8080;

// IMPORTANT: inside Docker network, host must be the service name "postgres"
const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgres://postgres:postgres@postgres:5432/cloud_db?sslmode=disable";

const pool = new Pool({ connectionString: DATABASE_URL });

function logJSON(obj) {
  console.log(JSON.stringify({ ts: new Date().toISOString(), ...obj }));
}

// ---------- Health ----------
app.get("/healthz", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.status(200).send("ok");
  } catch (e) {
    logJSON({ level: "error", msg: "healthz_db_failed", err: String(e.message || e) });
    res.status(503).send("db not ready");
  }
});

// ---------- GET /products ----------
app.get("/products", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, sku, name, inventory
       FROM products
       ORDER BY id`
    );
    res.json(rows);
  } catch (e) {
    logJSON({ level: "error", msg: "get_products_failed", err: String(e.message || e) });
    res.status(500).json({ error: "internal_error" });
  }
});

// ---------- GET /orders/:id ----------
app.get("/orders/:id", async (req, res) => {
  const orderId = Number(req.params.id);
  if (!Number.isInteger(orderId) || orderId <= 0) {
    return res.status(400).json({ error: "invalid_id" });
  }

  try {
    const orderQ = await pool.query(
      `SELECT id, user_id, status, created_at
       FROM orders
       WHERE id = $1`,
      [orderId]
    );

    if (orderQ.rowCount === 0) {
      return res.status(404).json({ error: "not_found" });
    }

    const itemsQ = await pool.query(
      `SELECT product_id, quantity
       FROM order_items
       WHERE order_id = $1
       ORDER BY product_id`,
      [orderId]
    );

    res.json({ order: orderQ.rows[0], items: itemsQ.rows });
  } catch (e) {
    logJSON({
      level: "error",
      msg: "get_order_failed",
      order_id: orderId,
      err: String(e.message || e),
    });
    res.status(500).json({ error: "internal_error" });
  }
});

// ---------- POST /orders ----------
// Body example:
// {
//   "user_id": 1,
//   "items": [ {"product_id": 1, "quantity": 2}, {"product_id": 2, "quantity": 1} ]
// }
//
// Correctness:
// - single transaction
// - lock product rows with SELECT ... FOR UPDATE
// - validate inventory
// - decrement inventory with guard (inventory >= qty)
// - insert order + order_items
app.post("/orders", async (req, res) => {
  const body = req.body || {};
  const user_id = Number(body.user_id);
  const items = Array.isArray(body.items) ? body.items : [];

  if (!Number.isInteger(user_id) || user_id <= 0 || items.length === 0) {
    return res.status(400).json({ error: "invalid_request" });
  }

  for (const it of items) {
    const pid = Number(it.product_id);
    const qty = Number(it.quantity);
    if (!Number.isInteger(pid) || pid <= 0 || !Number.isInteger(qty) || qty <= 0) {
      return res.status(400).json({ error: "invalid_items" });
    }
  }

  // Deterministic locking order to avoid deadlocks
  const productIds = [...new Set(items.map((i) => Number(i.product_id)))].sort((a, b) => a - b);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1) lock all involved products rows
    const locked = await client.query(
      `SELECT id, inventory
       FROM products
       WHERE id = ANY($1)
       ORDER BY id
       FOR UPDATE`,
      [productIds]
    );

    // 2) build inventory map + verify products exist
    const invMap = new Map();
    for (const r of locked.rows) {
      invMap.set(r.id, r.inventory);
    }
    for (const pid of productIds) {
      if (!invMap.has(pid)) {
        await client.query("ROLLBACK");
        logJSON({ level: "warn", msg: "order_rejected_missing_product", user_id, product_id: pid });
        return res.status(409).json({ error: "product_not_found", product_id: pid });
      }
    }

    // 3) validate inventory
    for (const it of items) {
      const pid = Number(it.product_id);
      const qty = Number(it.quantity);
      const cur = invMap.get(pid);

      if (cur < qty) {
        await client.query("ROLLBACK");
        logJSON({
          level: "info",
          msg: "insufficient_inventory",
          user_id,
          product_id: pid,
          quantity: qty,
          inventory: cur,
        });
        return res.status(409).json({ error: "insufficient_inventory", product_id: pid });
      }

      invMap.set(pid, cur - qty);
    }

    // 4) create order
    // Assumes orders has (user_id, status) and returns id.
    const orderIns = await client.query(
      `INSERT INTO orders(user_id, status)
       VALUES ($1, 'PENDING')
       RETURNING id`,
      [user_id]
    );
    const order_id = orderIns.rows[0].id;

    // 5) decrement inventory + insert items
    for (const it of items) {
      const pid = Number(it.product_id);
      const qty = Number(it.quantity);

      // decrement with guard to prevent negative inventory
      const upd = await client.query(
        `UPDATE products
         SET inventory = inventory - $1
         WHERE id = $2 AND inventory >= $1`,
        [qty, pid]
      );

      if (upd.rowCount !== 1) {
        await client.query("ROLLBACK");
        logJSON({
          level: "info",
          msg: "insufficient_inventory_race",
          user_id,
          order_id,
          product_id: pid,
          quantity: qty,
        });
        return res.status(409).json({ error: "insufficient_inventory", product_id: pid });
      }

      await client.query(
        `INSERT INTO order_items(order_id, product_id, quantity)
         VALUES ($1, $2, $3)`,
        [order_id, pid, qty]
      );

      // structured log per item (good for proof)
      logJSON({
        level: "info",
        msg: "order_item_created",
        order_id,
        user_id,
        product_id: pid,
        quantity: qty,
      });
    }

    await client.query("COMMIT");

    logJSON({ level: "info", msg: "order_created", order_id, user_id, item_count: items.length });
    return res.status(201).json({ order_id, status: "PENDING" });
  } catch (e) {
    try {
      await client.query("ROLLBACK");
    } catch (_) {}
    logJSON({ level: "error", msg: "order_create_failed", err: String(e.message || e) });
    return res.status(500).json({ error: "internal_error" });
  } finally {
    client.release();
  }
});

// ---------- start ----------
app.listen(PORT, () => {
  logJSON({ level: "info", msg: "api_listening", port: String(PORT) });
});
