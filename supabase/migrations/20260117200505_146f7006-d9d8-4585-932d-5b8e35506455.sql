-- Add phone and display_id columns to vendors table
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS display_id text;

-- Create sequence for vendor display IDs
CREATE SEQUENCE IF NOT EXISTS vendor_display_id_seq START WITH 1;

-- Function to generate next vendor display ID
CREATE OR REPLACE FUNCTION generate_vendor_display_id()
RETURNS TRIGGER AS $$
DECLARE
    next_num integer;
BEGIN
    -- Get the max number from existing display_ids
    SELECT COALESCE(MAX(CAST(SUBSTRING(display_id FROM 2) AS integer)), 0) + 1
    INTO next_num
    FROM vendors
    WHERE display_id IS NOT NULL AND display_id ~ '^V\d+$';
    
    NEW.display_id := 'V' || LPAD(next_num::text, 3, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-generate display_id
DROP TRIGGER IF EXISTS set_vendor_display_id ON vendors;
CREATE TRIGGER set_vendor_display_id
    BEFORE INSERT ON vendors
    FOR EACH ROW
    WHEN (NEW.display_id IS NULL)
    EXECUTE FUNCTION generate_vendor_display_id();

-- Update existing vendors with display_ids
DO $$
DECLARE
    v_record RECORD;
    counter integer := 1;
BEGIN
    FOR v_record IN 
        SELECT id FROM vendors 
        WHERE display_id IS NULL 
        ORDER BY created_at ASC
    LOOP
        UPDATE vendors 
        SET display_id = 'V' || LPAD(counter::text, 3, '0')
        WHERE id = v_record.id;
        counter := counter + 1;
    END LOOP;
END $$;