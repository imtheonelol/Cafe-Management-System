-- 1. Create a shifts table to track starting/ending cash
CREATE TABLE IF NOT EXISTS shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES profiles(id) NOT NULL,
  starting_cash decimal(10,2) NOT NULL,
  start_time timestamptz DEFAULT now(),
  ending_cash decimal(10,2),
  end_time timestamptz
);

ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employees can view and insert own shifts" 
  ON shifts FOR ALL TO authenticated 
  USING (true) WITH CHECK (true);

-- 2. Create a storage bucket for product images
INSERT INTO storage.buckets (id, name, public) VALUES ('products', 'products', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Set up Storage Policies so anyone can view images, but only authenticated users can upload
CREATE POLICY "Public Access" ON storage.objects FOR SELECT TO public USING ( bucket_id = 'products' );
CREATE POLICY "Auth Insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK ( bucket_id = 'products' );