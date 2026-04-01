import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

// --- NoSQL File Database Plugin with Server-Side Caching ---
function codespaceNoSQLDatabase() {
  const dbPath = path.resolve(process.cwd(), 'cafe_database.json');
  let dbCache: any = null; // In-memory cache for ultra-fast loading

  const initDB = () => {
    // If the database file doesn't exist, create it with default accounts
    if (!fs.existsSync(dbPath)) {
      const initialData = {
        profiles: [
          { id: '1', email: 'admin@cafe.com', password: 'password', full_name: 'Admin Boss', role: 'admin', created_at: new Date().toISOString() },
          { id: '2', email: 'staff@cafe.com', password: 'password', full_name: 'Friendly Barista', role: 'employee', created_at: new Date().toISOString() }
        ],
        categories: [
          { id: 'c1', name: 'Coffee', created_at: new Date().toISOString() },
          { id: 'c2', name: 'Pastries', created_at: new Date().toISOString() }
        ],
        products: [],
        orders: [],
        order_items: [],
        shifts: []
      };
      fs.writeFileSync(dbPath, JSON.stringify(initialData, null, 2));
      dbCache = initialData;
    } else {
      // Load existing database into cache
      dbCache = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
    }
  };

  return {
    name: 'codespace-nosql-db',
    configureServer(server: any) {
      initDB();

      // Create API Endpoints to talk to our Database File
      server.middlewares.use(async (req: any, res: any, next: any) => {
        if (req.url.startsWith('/api/db')) {
          
          // READ Data (Instantly from Cache)
          if (req.method === 'GET') {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(dbCache));
            return;
          }

          // WRITE Data (Update Cache, then save to File)
          if (req.method === 'POST') {
            let body = '';
            req.on('data', (chunk: any) => body += chunk.toString());
            req.on('end', () => {
              try {
                dbCache = JSON.parse(body); // Update Server Cache
                fs.writeFileSync(dbPath, JSON.stringify(dbCache, null, 2)); // Persist to File
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: true }));
              } catch (e) {
                res.statusCode = 500;
                res.end(JSON.stringify({ error: 'Failed to write DB' }));
              }
            });
            return;
          }
        }
        next();
      });
    }
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), codespaceNoSQLDatabase()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});