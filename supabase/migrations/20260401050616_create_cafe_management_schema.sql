/*
  # Cafe Management System Schema

  1. New Tables
    - `categories`
      - `id` (uuid, primary key)
      - `name` (text, unique, not null) - Category name (e.g., Coffee, Milk Tea, Food)
      - `created_at` (timestamptz) - Record creation timestamp
    
    - `products`
      - `id` (uuid, primary key)
      - `category_id` (uuid, foreign key to categories)
      - `name` (text, not null) - Product name
      - `description` (text) - Product description
      - `price` (decimal, not null) - Product price
      - `image_url` (text) - Product image URL
      - `stock` (integer, default 100) - Available stock quantity
      - `is_available` (boolean, default true) - Product availability
      - `created_at` (timestamptz) - Record creation timestamp
    
    - `orders`
      - `id` (uuid, primary key)
      - `order_number` (text, unique, not null) - Human-readable order number
      - `total` (decimal, not null) - Order total amount
      - `payment_method` (text, not null) - Payment method (cash, card, online)
      - `payment_status` (text, default 'pending') - Payment status
      - `receipt_number` (text, unique) - Receipt/transaction number
      - `created_at` (timestamptz) - Order creation timestamp
    
    - `order_items`
      - `id` (uuid, primary key)
      - `order_id` (uuid, foreign key to orders)
      - `product_id` (uuid, foreign key to products)
      - `quantity` (integer, not null) - Item quantity
      - `price` (decimal, not null) - Price at time of order
      - `subtotal` (decimal, not null) - Quantity * price
      - `created_at` (timestamptz) - Record creation timestamp

  2. Security
    - Enable RLS on all tables
    - Add policies for public read access (for POS system)
    - Add policies for public insert/update (for order processing)
    
  3. Important Notes
    - All tables use UUID primary keys
    - Prices stored as decimal for precision
    - Orders include both order_number and receipt_number
    - Products track stock levels
    - Foreign key constraints ensure data integrity
*/

-- Create categories table
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create products table
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES categories(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text DEFAULT '',
  price decimal(10,2) NOT NULL,
  image_url text DEFAULT '',
  stock integer DEFAULT 100,
  is_available boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text UNIQUE NOT NULL,
  total decimal(10,2) NOT NULL,
  payment_method text NOT NULL,
  payment_status text DEFAULT 'pending',
  receipt_number text UNIQUE,
  created_at timestamptz DEFAULT now()
);

-- Create order_items table
CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE RESTRICT,
  quantity integer NOT NULL,
  price decimal(10,2) NOT NULL,
  subtotal decimal(10,2) NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Categories policies (public read, restricted write for now)
CREATE POLICY "Anyone can view categories"
  ON categories FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can insert categories"
  ON categories FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Products policies
CREATE POLICY "Anyone can view products"
  ON products FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can insert products"
  ON products FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can update products"
  ON products FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Orders policies
CREATE POLICY "Anyone can view orders"
  ON orders FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can create orders"
  ON orders FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Order items policies
CREATE POLICY "Anyone can view order items"
  ON order_items FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can create order items"
  ON order_items FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Insert sample categories
INSERT INTO categories (name) VALUES
  ('Coffee'),
  ('Milk Tea'),
  ('Food'),
  ('Desserts')
ON CONFLICT (name) DO NOTHING;

-- Insert sample products
INSERT INTO products (category_id, name, description, price, image_url, stock) 
SELECT 
  c.id,
  p.name,
  p.description,
  p.price,
  p.image_url,
  p.stock
FROM (
  SELECT 'Coffee' as category, 'Espresso' as name, 'Rich and bold espresso shot' as description, 3.50 as price, 'https://images.pexels.com/photos/312418/pexels-photo-312418.jpeg?auto=compress&cs=tinysrgb&w=400' as image_url, 100 as stock
  UNION ALL SELECT 'Coffee', 'Cappuccino', 'Creamy espresso with steamed milk', 4.50, 'https://images.pexels.com/photos/1362534/pexels-photo-1362534.jpeg?auto=compress&cs=tinysrgb&w=400', 100
  UNION ALL SELECT 'Coffee', 'Latte', 'Smooth espresso with steamed milk', 4.75, 'https://images.pexels.com/photos/1415555/pexels-photo-1415555.jpeg?auto=compress&cs=tinysrgb&w=400', 100
  UNION ALL SELECT 'Coffee', 'Americano', 'Espresso with hot water', 3.75, 'https://images.pexels.com/photos/1251175/pexels-photo-1251175.jpeg?auto=compress&cs=tinysrgb&w=400', 100
  UNION ALL SELECT 'Milk Tea', 'Classic Milk Tea', 'Traditional milk tea with tapioca pearls', 5.00, 'https://images.pexels.com/photos/4955257/pexels-photo-4955257.jpeg?auto=compress&cs=tinysrgb&w=400', 100
  UNION ALL SELECT 'Milk Tea', 'Taro Milk Tea', 'Creamy taro flavored milk tea', 5.50, 'https://images.pexels.com/photos/12795658/pexels-photo-12795658.jpeg?auto=compress&cs=tinysrgb&w=400', 100
  UNION ALL SELECT 'Milk Tea', 'Matcha Milk Tea', 'Green tea with milk and pearls', 5.75, 'https://images.pexels.com/photos/11944112/pexels-photo-11944112.jpeg?auto=compress&cs=tinysrgb&w=400', 100
  UNION ALL SELECT 'Food', 'Croissant', 'Buttery, flaky French pastry', 3.50, 'https://images.pexels.com/photos/2135677/pexels-photo-2135677.jpeg?auto=compress&cs=tinysrgb&w=400', 50
  UNION ALL SELECT 'Food', 'Sandwich', 'Fresh deli sandwich', 6.50, 'https://images.pexels.com/photos/1600711/pexels-photo-1600711.jpeg?auto=compress&cs=tinysrgb&w=400', 50
  UNION ALL SELECT 'Food', 'Bagel', 'Toasted bagel with cream cheese', 4.00, 'https://images.pexels.com/photos/2983101/pexels-photo-2983101.jpeg?auto=compress&cs=tinysrgb&w=400', 50
  UNION ALL SELECT 'Desserts', 'Cheesecake', 'Creamy New York style cheesecake', 5.50, 'https://images.pexels.com/photos/3776942/pexels-photo-3776942.jpeg?auto=compress&cs=tinysrgb&w=400', 30
  UNION ALL SELECT 'Desserts', 'Brownie', 'Rich chocolate brownie', 4.00, 'https://images.pexels.com/photos/1721934/pexels-photo-1721934.jpeg?auto=compress&cs=tinysrgb&w=400', 30
) p
CROSS JOIN categories c
WHERE c.name = p.category
ON CONFLICT DO NOTHING;