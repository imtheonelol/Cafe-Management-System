import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { Client } from 'pg';

// ==========================================
// 🛑 POSTGRESQL CONFIGURATION
// If you installed PostgreSQL manually, change 'password' to your real password!
const PG_PASSWORD = 'password';
// ==========================================

const DB_NAME = 'cafe_pos';
const DEFAULT_DB_URL = `postgres://postgres:${PG_PASSWORD}@localhost:5432/postgres`;
const DB_URL = `postgres://postgres:${PG_PASSWORD}@localhost:5432/${DB_NAME}`;

function postgresDatabasePlugin() {
  let client: Client;
  let dbConnectionError: string | null = null;

  const initDB = async () => {
    try {
      // 1. Connect to default Postgres to auto-create our app database
      const adminClient = new Client({ connectionString: DEFAULT_DB_URL });
      await adminClient.connect();
      const dbCheck = await adminClient.query(`SELECT datname FROM pg_catalog.pg_database WHERE datname = '${DB_NAME}'`);
      
      if (dbCheck.rowCount === 0) {
        console.log(`[DevOps] Database '${DB_NAME}' not found. Auto-creating...`);
        await adminClient.query(`CREATE DATABASE ${DB_NAME}`);
      }
      await adminClient.end();

      // 2. Connect to our App Database
      client = new Client({ connectionString: DB_URL });
      await client.connect();
      console.log(`[DevOps] Successfully Connected to PostgreSQL: ${DB_NAME}`);

      // 3. Auto-Migrate Tables
      await client.query(`
        CREATE TABLE IF NOT EXISTS profiles (id TEXT PRIMARY KEY, email TEXT UNIQUE, password TEXT, full_name TEXT, role TEXT, created_at TIMESTAMPTZ);
        CREATE TABLE IF NOT EXISTS categories (id TEXT PRIMARY KEY, name TEXT UNIQUE, created_at TIMESTAMPTZ);
        CREATE TABLE IF NOT EXISTS products (id TEXT PRIMARY KEY, category_id TEXT, name TEXT, description TEXT, price NUMERIC, image_url TEXT, stock INTEGER, is_available BOOLEAN, created_at TIMESTAMPTZ);
        CREATE TABLE IF NOT EXISTS orders (id TEXT PRIMARY KEY, order_number TEXT, total NUMERIC, payment_method TEXT, payment_status TEXT, receipt_number TEXT, employee_id TEXT, created_at TIMESTAMPTZ);
        CREATE TABLE IF NOT EXISTS order_items (id TEXT PRIMARY KEY, order_id TEXT, product_id TEXT, quantity INTEGER, price NUMERIC, subtotal NUMERIC, created_at TIMESTAMPTZ);
        CREATE TABLE IF NOT EXISTS shifts (id TEXT PRIMARY KEY, employee_id TEXT, starting_cash NUMERIC, start_time TIMESTAMPTZ, ending_cash NUMERIC, expected_cash NUMERIC, end_time TIMESTAMPTZ);
      `);

      // 4. Seed Default Data (Pesos)
      const userCount = await client.query('SELECT count(*) as count FROM profiles');
      if (parseInt(userCount.rows[0].count) === 0) {
        await client.query(`INSERT INTO profiles (id, email, password, full_name, role, created_at) VALUES ($1, $2, $3, $4, $5, $6)`, ['1', 'admin@cafe.com', 'password', 'Admin Boss', 'admin', new Date().toISOString()]);
        await client.query(`INSERT INTO profiles (id, email, password, full_name, role, created_at) VALUES ($1, $2, $3, $4, $5, $6)`, ['2', 'staff@cafe.com', 'password', 'Friendly Barista', 'employee', new Date().toISOString()]);
        await client.query(`INSERT INTO categories (id, name, created_at) VALUES ('c1', 'Coffee', CURRENT_TIMESTAMP), ('c2', 'Milk Tea', CURRENT_TIMESTAMP), ('c3', 'Pastries', CURRENT_TIMESTAMP)`);
        await client.query(`INSERT INTO products (id, category_id, name, description, price, image_url, stock, is_available, created_at) VALUES ('p1', 'c1', 'Iced Caramel Macchiato', 'Rich espresso with caramel', 165.0, 'https://images.pexels.com/photos/312418/pexels-photo-312418.jpeg?auto=compress&cs=tinysrgb&w=400', 100, true, CURRENT_TIMESTAMP)`);
        await client.query(`INSERT INTO products (id, category_id, name, description, price, image_url, stock, is_available, created_at) VALUES ('p2', 'c2', 'Okinawa Milk Tea', 'Roasted brown sugar milk tea', 120.0, 'https://images.pexels.com/photos/4955257/pexels-photo-4955257.jpeg?auto=compress&cs=tinysrgb&w=400', 100, true, CURRENT_TIMESTAMP)`);
        await client.query(`INSERT INTO products (id, category_id, name, description, price, image_url, stock, is_available, created_at) VALUES ('p3', 'c3', 'Butter Croissant', 'Classic flaky French pastry', 85.0, 'https://images.pexels.com/photos/2135677/pexels-photo-2135677.jpeg?auto=compress&cs=tinysrgb&w=400', 50, true, CURRENT_TIMESTAMP)`);
      }
    } catch (error: any) {
      console.error("\n❌ [DATABASE ERROR]:", error.message, "\n");
      dbConnectionError = error.message; // Save the error to show in React!
    }
  };

  return {
    name: 'postgres-db-plugin',
    configureServer(server: any) {
      initDB();
      server.middlewares.use(async (req: any, res: any, next: any) => {
        if (req.url.startsWith('/api/sql') && req.method === 'POST') {
          res.setHeader('Content-Type', 'application/json');
          
          // If the database failed to connect, immediately tell React why
          if (dbConnectionError) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: `PostgreSQL Error: ${dbConnectionError}` }));
            return;
          }

          let body = '';
          req.on('data', (chunk: any) => body += chunk.toString());
          req.on('end', async () => {
            try {
              const { action, table, data, id, query, params } = JSON.parse(body);
              
              if (action === 'QUERY') {
                let pgQuery = query;
                if (params) { params.forEach((_: any, i: number) => { pgQuery = pgQuery.replace('?', `$${i + 1}`); }); }
                const result = await client.query(pgQuery, params || []);
                res.end(JSON.stringify(result.rows));
              } else if (action === 'INSERT') {
                const keys = Object.keys(data).join(', ');
                const values = Object.values(data);
                const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
                await client.query(`INSERT INTO ${table} (${keys}) VALUES (${placeholders})`, values);
                res.end(JSON.stringify({ success: true }));
              } else if (action === 'UPDATE') {
                const values = Object.values(data);
                const sets = Object.keys(data).map((k, i) => `${k} = $${i + 1}`).join(', ');
                await client.query(`UPDATE ${table} SET ${sets} WHERE id = $${values.length + 1}`, [...values, id]);
                res.end(JSON.stringify({ success: true }));
              } else if (action === 'SELECT_ALL') {
                const result = await client.query(`SELECT * FROM ${table} ORDER BY created_at DESC`);
                res.end(JSON.stringify(result.rows));
              } else if (action === 'DELETE') {
                await client.query(`DELETE FROM ${table} WHERE id = $1`, [id]);
                res.end(JSON.stringify({ success: true }));
              }
            } catch (err: any) {
              res.statusCode = 500;
              res.end(JSON.stringify({ error: err.message }));
            }
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
  optimizeDeps: { exclude: ['lucide-react'] },
});