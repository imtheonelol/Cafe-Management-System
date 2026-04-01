// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'codespace-sqlite-db',
      configureServer(server) {
        const dbPath = path.resolve(process.cwd(), 'cafe_management.db');
        let db: any;

        // Initialize DB immediately on server start
        (async () => {
          db = await open({ filename: dbPath, driver: sqlite3.Database });
          await db.exec(`
            CREATE TABLE IF NOT EXISTS profiles (id TEXT PRIMARY KEY, email TEXT UNIQUE, password TEXT, full_name TEXT, role TEXT, created_at TEXT);
            CREATE TABLE IF NOT EXISTS products (id TEXT PRIMARY KEY, category_id TEXT, name TEXT, price REAL, stock INTEGER, image_url TEXT, created_at TEXT);
            -- Add other tables here...
          `);
        })();

        server.middlewares.use(async (req, res, next) => {
          if (req.url === '/api/sql' && req.method === 'POST') {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', async () => {
              try {
                const { action, table, data, query, params } = JSON.parse(body);
                // Database logic here (same as previous step)
                // Example: const rows = await db.all(query, params);
                res.end(JSON.stringify({ success: true }));
              } catch (err) {
                res.statusCode = 500;
                res.end(JSON.stringify({ error: err.message }));
              }
            });
          } else {
            next();
          }
        });
      }
    }
  ],
});