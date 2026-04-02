import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { Client, Pool } from 'pg';

const PG_PASSWORD = 'password';
const DB_HOST = '127.0.0.1';
const DB_NAME = 'cafe_pos';
const DEFAULT_DB_URL = `postgres://postgres:${PG_PASSWORD}@${DB_HOST}:5432/postgres`;
const DB_URL = `postgres://postgres:${PG_PASSWORD}@${DB_HOST}:5432/${DB_NAME}`;

function postgresDatabasePlugin() {
  let pool: Pool;
  let dbConnectionError: string | null = null;

  const initDB = async () => {
    try {
      let adminClient = new Client({ connectionString: DEFAULT_DB_URL });
      let isConnected = false;

      for (let i = 0; i < 6; i++) {
        try {
          await adminClient.connect();
          isConnected = true;
          break; 
        } catch (err) {
          console.log(`[DevOps] PostgreSQL is waking up... waiting 2 seconds (${i + 1}/6)`);
          await new Promise(resolve => setTimeout(resolve, 2000));
          adminClient = new Client({ connectionString: DEFAULT_DB_URL });
        }
      }

      if (!isConnected) throw new Error("Could not connect to PostgreSQL. Is Docker running?");

      const dbCheck = await adminClient.query(`SELECT datname FROM pg_catalog.pg_database WHERE datname = '${DB_NAME}'`);
      if (dbCheck.rowCount === 0) {
        console.log(`[DevOps] Database '${DB_NAME}' not found. Auto-creating...`);
        await adminClient.query(`CREATE DATABASE ${DB_NAME}`);
      }
      await adminClient.end();

      pool = new Pool({ connectionString: DB_URL, max: 20, idleTimeoutMillis: 30000 });
      console.log(`[DevOps] Successfully Connected to PostgreSQL Pool: ${DB_NAME}`);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS profiles (id TEXT PRIMARY KEY, email TEXT UNIQUE, password TEXT, full_name TEXT, role TEXT, created_at TIMESTAMPTZ);
        CREATE TABLE IF NOT EXISTS categories (id TEXT PRIMARY KEY, name TEXT UNIQUE, created_at TIMESTAMPTZ);
        CREATE TABLE IF NOT EXISTS products (id TEXT PRIMARY KEY, category_id TEXT, name TEXT, description TEXT, price NUMERIC, image_url TEXT, stock INTEGER, is_available BOOLEAN, created_at TIMESTAMPTZ);
        CREATE TABLE IF NOT EXISTS orders (id TEXT PRIMARY KEY, order_number TEXT, total NUMERIC, payment_method TEXT, payment_status TEXT, receipt_number TEXT, employee_id TEXT, created_at TIMESTAMPTZ);
        CREATE TABLE IF NOT EXISTS order_items (id TEXT PRIMARY KEY, order_id TEXT, product_id TEXT, quantity INTEGER, price NUMERIC, subtotal NUMERIC, created_at TIMESTAMPTZ);
        CREATE TABLE IF NOT EXISTS shifts (id TEXT PRIMARY KEY, employee_id TEXT, starting_cash NUMERIC, start_time TIMESTAMPTZ, ending_cash NUMERIC, expected_cash NUMERIC, end_time TIMESTAMPTZ);
        CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT);
        CREATE TABLE IF NOT EXISTS ingredients (id TEXT PRIMARY KEY, name TEXT UNIQUE, stock NUMERIC, unit TEXT, created_at TIMESTAMPTZ);
        CREATE TABLE IF NOT EXISTS product_ingredients (id TEXT PRIMARY KEY, product_id TEXT, ingredient_id TEXT, quantity NUMERIC, created_at TIMESTAMPTZ);
        
        ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_type TEXT DEFAULT 'none';
        ALTER TABLE orders ADD COLUMN IF NOT EXISTS tax_amount NUMERIC DEFAULT 0;
      `);

      const userCount = await pool.query('SELECT count(*) as count FROM profiles');
      if (parseInt(userCount.rows[0].count) === 0) {
        console.log("[DevOps] Seeding Sample Products & Recipes...");

        await pool.query(`INSERT INTO profiles (id, email, password, full_name, role, created_at) VALUES ('1', 'admin@cafe.com', 'password', 'Admin Boss', 'admin', CURRENT_TIMESTAMP)`);
        await pool.query(`INSERT INTO profiles (id, email, password, full_name, role, created_at) VALUES ('2', 'staff@cafe.com', 'password', 'Friendly Barista', 'employee', CURRENT_TIMESTAMP)`);
        await pool.query(`INSERT INTO settings (key, value) VALUES ('business_day_start', '08:00')`);
        await pool.query(`INSERT INTO categories (id, name, created_at) VALUES ('c1', 'Coffee', CURRENT_TIMESTAMP), ('c2', 'Milk Tea', CURRENT_TIMESTAMP), ('c3', 'Pastries', CURRENT_TIMESTAMP)`);

        await pool.query(`INSERT INTO ingredients (id, name, stock, unit, created_at) VALUES 
          ('i1', 'Espresso Beans', 5000, 'g', CURRENT_TIMESTAMP),
          ('i2', 'Whole Milk', 10000, 'ml', CURRENT_TIMESTAMP),
          ('i3', 'Caramel Syrup', 2000, 'ml', CURRENT_TIMESTAMP),
          ('i4', 'Plastic Cup 16oz', 500, 'pcs', CURRENT_TIMESTAMP),
          ('i5', 'Black Tea Leaves', 2000, 'g', CURRENT_TIMESTAMP),
          ('i6', 'Tapioca Pearls', 3000, 'g', CURRENT_TIMESTAMP),
          ('i7', 'Brown Sugar Syrup', 2000, 'ml', CURRENT_TIMESTAMP)
        `);

        await pool.query(`INSERT INTO products (id, category_id, name, description, price, image_url, stock, is_available, created_at) VALUES 
          ('p1', 'c1', 'Iced Caramel Macchiato', 'Rich espresso with milk and caramel drizzle', 165.0, 'https://images.pexels.com/photos/312418/pexels-photo-312418.jpeg?auto=compress&cs=tinysrgb&w=400', 100, true, CURRENT_TIMESTAMP),
          ('p2', 'c2', 'Okinawa Milk Tea', 'Roasted brown sugar milk tea with pearls', 120.0, 'https://images.pexels.com/photos/4955257/pexels-photo-4955257.jpeg?auto=compress&cs=tinysrgb&w=400', 100, true, CURRENT_TIMESTAMP),
          ('p3', 'c3', 'Butter Croissant', 'Classic flaky French pastry', 85.0, 'https://images.pexels.com/photos/2135677/pexels-photo-2135677.jpeg?auto=compress&cs=tinysrgb&w=400', 50, true, CURRENT_TIMESTAMP)
        `);

        await pool.query(`INSERT INTO product_ingredients (id, product_id, ingredient_id, quantity, created_at) VALUES 
          ('pi1', 'p1', 'i1', 18, CURRENT_TIMESTAMP),
          ('pi2', 'p1', 'i2', 200, CURRENT_TIMESTAMP),
          ('pi3', 'p1', 'i3', 30, CURRENT_TIMESTAMP),
          ('pi4', 'p1', 'i4', 1, CURRENT_TIMESTAMP),
          ('pi5', 'p2', 'i5', 15, CURRENT_TIMESTAMP),
          ('pi6', 'p2', 'i2', 150, CURRENT_TIMESTAMP),
          ('pi7', 'p2', 'i7', 40, CURRENT_TIMESTAMP),
          ('pi8', 'p2', 'i6', 50, CURRENT_TIMESTAMP),
          ('pi9', 'p2', 'i4', 1, CURRENT_TIMESTAMP)
        `);
      }
    } catch (error: any) {
      console.error("\n❌ [DATABASE ERROR]:", error.message, "\n");
      dbConnectionError = error.message; 
    }
  };

  return {
    name: 'postgres-db-plugin',
    configureServer(server: any) {
      initDB();
      server.middlewares.use(async (req: any, res: any, next: any) => {
        if (req.url.startsWith('/api/sql') && req.method === 'POST') {
          res.setHeader('Content-Type', 'application/json');
          if (dbConnectionError) { res.statusCode = 500; res.end(JSON.stringify({ error: `PostgreSQL Error: ${dbConnectionError}` })); return; }
          let body = '';
          req.on('data', (chunk: any) => body += chunk.toString());
          req.on('end', async () => {
            try {
              const { action, table, data, id, query, params } = JSON.parse(body);
              if (action === 'QUERY') {
                let pgQuery = query;
                if (params) { params.forEach((_: any, i: number) => { pgQuery = pgQuery.replace('?', `$${i + 1}`); }); }
                const result = await pool.query(pgQuery, params || []);
                res.end(JSON.stringify(result.rows));
              } else if (action === 'INSERT') {
                const keys = Object.keys(data).join(', ');
                const values = Object.values(data);
                const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
                await pool.query(`INSERT INTO ${table} (${keys}) VALUES (${placeholders})`, values);
                res.end(JSON.stringify({ success: true }));
              } else if (action === 'UPDATE') {
                const values = Object.values(data);
                const sets = Object.keys(data).map((k, i) => `${k} = $${i + 1}`).join(', ');
                await pool.query(`UPDATE ${table} SET ${sets} WHERE id = $${values.length + 1}`, [...values, id]);
                res.end(JSON.stringify({ success: true }));
              } else if (action === 'SELECT_ALL') {
                const result = await pool.query(`SELECT * FROM ${table} ORDER BY created_at DESC`);
                res.end(JSON.stringify(result.rows));
              } else if (action === 'DELETE') {
                await pool.query(`DELETE FROM ${table} WHERE id = $1`, [id]);
                res.end(JSON.stringify({ success: true }));
              }
            } catch (err: any) { res.statusCode = 500; res.end(JSON.stringify({ error: err.message })); }
          });
          return;
        }
        next();
      });
    }
  };
}

export default defineConfig({
  plugins: [react(), postgresDatabasePlugin()],
  optimizeDeps: { exclude: ['lucide-react'] }
});