-- Drop existing restrictive policies
DROP POLICY IF EXISTS "All authenticated users can view vendors" ON vendors;
DROP POLICY IF EXISTS "Main admin and po_creator can manage vendors" ON vendors;
DROP POLICY IF EXISTS "All authenticated users can view products" ON products;
DROP POLICY IF EXISTS "Main admin and po_creator can manage products" ON products;
DROP POLICY IF EXISTS "All authenticated users can view POs" ON purchase_orders;
DROP POLICY IF EXISTS "PO creators can create POs" ON purchase_orders;
DROP POLICY IF EXISTS "Approval admin can update PO status" ON purchase_orders;
DROP POLICY IF EXISTS "All authenticated users can view PO items" ON purchase_order_items;
DROP POLICY IF EXISTS "PO creators can add PO items" ON purchase_order_items;
DROP POLICY IF EXISTS "Approval admin can view and create download logs" ON po_download_logs;

-- Create permissive policies for all tables (since app uses local auth, not Supabase auth)
CREATE POLICY "Allow all operations on vendors" ON vendors FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on products" ON products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on purchase_orders" ON purchase_orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on purchase_order_items" ON purchase_order_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on po_download_logs" ON po_download_logs FOR ALL USING (true) WITH CHECK (true);