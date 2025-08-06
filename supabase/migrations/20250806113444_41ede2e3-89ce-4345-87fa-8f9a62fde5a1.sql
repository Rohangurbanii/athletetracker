-- Add club_code column to clubs table
ALTER TABLE public.clubs ADD COLUMN club_code text UNIQUE;

-- Create function to generate club code from UUID
CREATE OR REPLACE FUNCTION generate_club_code(club_uuid uuid)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    -- Convert UUID to a shorter alphanumeric code
    code_chars text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    uuid_hex text;
    result text := '';
    i integer;
    byte_val integer;
BEGIN
    -- Remove hyphens from UUID and take first 12 characters
    uuid_hex := replace(club_uuid::text, '-', '');
    uuid_hex := substring(uuid_hex, 1, 12);
    
    -- Convert each pair of hex characters to a code character
    FOR i IN 1..6 BY 2 LOOP
        byte_val := ('x' || substring(uuid_hex, i, 2))::bit(8)::integer;
        result := result || substring(code_chars, (byte_val % 36) + 1, 1);
    END LOOP;
    
    RETURN result;
END;
$$;

-- Update existing clubs with generated codes
UPDATE public.clubs 
SET club_code = generate_club_code(id) 
WHERE club_code IS NULL;

-- Create trigger to auto-generate club codes for new clubs
CREATE OR REPLACE FUNCTION set_club_code()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.club_code IS NULL THEN
        NEW.club_code := generate_club_code(NEW.id);
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER set_club_code_trigger
    BEFORE INSERT ON public.clubs
    FOR EACH ROW
    EXECUTE FUNCTION set_club_code();

-- Create function to find club by code
CREATE OR REPLACE FUNCTION get_club_by_code(code text)
RETURNS uuid
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    club_uuid uuid;
BEGIN
    SELECT id INTO club_uuid
    FROM public.clubs
    WHERE club_code = upper(trim(code));
    
    RETURN club_uuid;
END;
$$;