import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';

function codespaceSqliteDatabase() {
  const dbPath = path.resolve(process.cwd(), 'cafe_management.db');
  let db: any = null;

  const initDB = async () => {
    db = await open({ filename: dbPath, driver: sqlite3.Database });
    
    await db.exec(`
      CREATE TABLE IF NOT EXISTS profiles (id TEXT PRIMARY KEY, email TEXT UNIQUE, password TEXT, full_name TEXT, role TEXT, created_at TEXT);
      CREATE TABLE IF NOT EXISTS categories (id TEXT PRIMARY KEY, name TEXT UNIQUE, created_at TEXT);
      CREATE TABLE IF NOT EXISTS products (id TEXT PRIMARY KEY, category_id TEXT, name TEXT, description TEXT, price REAL, image_url TEXT, stock INTEGER, is_available INTEGER, created_at TEXT);
      CREATE TABLE IF NOT EXISTS orders (id TEXT PRIMARY KEY, order_number TEXT, total REAL, payment_method TEXT, payment_status TEXT, receipt_number TEXT, employee_id TEXT, created_at TEXT);
      CREATE TABLE IF NOT EXISTS order_items (id TEXT PRIMARY KEY, order_id TEXT, product_id TEXT, quantity INTEGER, price REAL, subtotal REAL, created_at TEXT);
      CREATE TABLE IF NOT EXISTS shifts (id TEXT PRIMARY KEY, employee_id TEXT, starting_cash REAL, start_time TEXT, ending_cash REAL, expected_cash REAL, end_time TEXT);
      CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT);
    `);

    // Add Default Admin if no users exist
    const userCount = await db.get('SELECT count(*) as count FROM profiles');
    if (userCount.count === 0) {
      await db.run('INSERT INTO profiles (id, email, password, full_name, role, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        ['1', 'admin@cafe.com', 'password', 'Admin Boss', 'admin', new Date().toISOString()]);
      await db.run('INSERT INTO profiles (id, email, password, full_name, role, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        ['2', 'staff@cafe.com', 'password', 'Friendly Barista', 'employee', new Date().toISOString()]);
      
      await db.run("INSERT INTO categories (id, name, created_at) VALUES ('c1', 'Coffee', datetime('now'))");
      await db.run("INSERT INTO categories (id, name, created_at) VALUES ('c2', 'Food', datetime('now'))");
    }

    // Default settings
    const settingsCount = await db.get('SELECT count(*) as count FROM settings');
    if (settingsCount.count === 0) {
      await db.run("INSERT INTO settings (key, value) VALUES ('business_day_start', '08:00')");
    }
  };

  return {
    name: 'codespace-sqlite-db',
    configureServer(server: any) {
      initDB();
      server.middlewares.use(async (req: any, res: any, next: any) => {
        if (req.url.startsWith('/api/sql')) {
          let body = '';
          req.on('data', chunk => body += chunk.toString());
          req.on('end', async () => {
            try {
              const { action, table, data, id, query, params } = JSON.parse(body);
              res.setHeader('Content-Type', 'application/json');
              
              if (action === 'SELECT_ALL') {
                const rows = await db.all(`SELECT * FROM ${table} ORDER BY created_at DESC`);
                res.end(JSON.stringify(rows));
              } else if (action === 'QUERY') {
                const rows = await db.all(query, params || []);
                res.end(JSON.stringify(rows));
              } else if (action === 'INSERT') {
                const keys = Object.keys(data).join(',');
                const values = Object.values(data);
                const placeholders = values.map(() => '?').join(',');
                await db.run(`INSERT INTO ${table} (${keys}) VALUES (${placeholders})`, values);
                res.end(JSON.stringify({ success: true }));
              } else if (action === 'UPDATE') {
                const sets = Object.keys(data).map(k => `${k} = ?`).join(',');
                await db.run(`UPDATE ${table} SET ${sets} WHERE id = ?`, [...Object.values(data), id]);
                res.end(JSON.stringify({ success: true }));
              } else if (action === 'DELETE') {
                await db.run(`DELETE FROM ${table} WHERE id = ?`, [id]);
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
  plugins: [react(), codespaceSqliteDatabase()],
  optimizeDeps: { exclude: ['lucide-react'] },
  server: { watch: { ignored: ['**/cafe_management.db', '**/cafe_management.db-journal'] } }
});