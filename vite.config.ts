import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

// --- NoSQL File Database Plugin with Server-Side Caching ---
function codespaceNoSQLDatabase() {
  const dbPath = path.resolve(process.cwd(), 'cafe_database.json');
  let dbCache: any = null;

  const initDB = () => {
    if (!fs.existsSync(dbPath)) {
      const initialData = {
        profiles: [
          { id: '1', email: 'admin@cafe.com', password: 'password', full_name: 'Admin Boss', role: 'admin', created_at: new Date().toISOString() },
          { id: '2', email: 'staff@cafe.com', password: 'password', full_name: 'Friendly Barista', role: 'employee', created_at: new Date().toISOString() }
        ],
        categories: [
          { id: 'c1', name: 'Coffee', created_at: new Date().toISOString() },
          { id: 'c2', name: 'Milk Tea', created_at: new Date().toISOString() },
          { id: 'c3', name: 'Pastries', created_at: new Date().toISOString() }
        ],
        products: [
          { id: 'p1', category_id: 'c1', name: 'Iced Caramel Macchiato', description: 'Espresso with vanilla and caramel drizzle', price: 165.00, image_url: 'https://images.pexels.com/photos/312418/pexels-photo-312418.jpeg?auto=compress&cs=tinysrgb&w=400', stock: 100, is_available: true, created_at: new Date().toISOString() },
          { id: 'p2', category_id: 'c2', name: 'Okinawa Milk Tea', description: 'Roasted brown sugar milk tea with pearls', price: 120.00, image_url: 'https://images.pexels.com/photos/4955257/pexels-photo-4955257.jpeg?auto=compress&cs=tinysrgb&w=400', stock: 100, is_available: true, created_at: new Date().toISOString() },
          { id: 'p3', category_id: 'c3', name: 'Butter Croissant', description: 'Classic flaky French pastry', price: 85.00, image_url: 'https://images.pexels.com/photos/2135677/pexels-photo-2135677.jpeg?auto=compress&cs=tinysrgb&w=400', stock: 50, is_available: true, created_at: new Date().toISOString() },
          { id: 'p4', category_id: 'c1', name: 'Americano (Hot)', description: 'Freshly brewed espresso with hot water', price: 110.00, image_url: '', stock: 200, is_available: true, created_at: new Date().toISOString() }, // Dummy product with NO picture
          { id: 'p5', category_id: 'c3', name: 'Blueberry Muffin', description: 'Freshly baked daily', price: 95.00, image_url: '', stock: 30, is_available: true, created_at: new Date().toISOString() } // Dummy product with NO picture
        ],
        orders: [],
        order_items: [],
        shifts: []
      };
      fs.writeFileSync(dbPath, JSON.stringify(initialData, null, 2));
      dbCache = initialData;
    } else {
      dbCache = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
    }
  };

  return {
    name: 'codespace-nosql-db',
    configureServer(server: any) {
      initDB();
      server.middlewares.use(async (req: any, res: any, next: any) => {
        if (req.url.startsWith('/api/db')) {
          if (req.method === 'GET') {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(dbCache));
            return;
          }
          if (req.method === 'POST') {
            let body = '';
            req.on('data', (chunk: any) => body += chunk.toString());
            req.on('end', () => {
              try {
                dbCache = JSON.parse(body);
                fs.writeFileSync(dbPath, JSON.stringify(dbCache, null, 2));
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

export default defineConfig({
  plugins: [react(), codespaceNoSQLDatabase()],
  optimizeDeps: { exclude: ['lucide-react'] },
});