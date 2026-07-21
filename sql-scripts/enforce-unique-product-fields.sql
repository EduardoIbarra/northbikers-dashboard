-- enforce-unique-product-fields.sql
-- Function to validate that fields marked as "unique" (e.g. jersey numbers) do not repeat for the same product.

CREATE OR REPLACE FUNCTION check_unique_product_fields()
RETURNS TRIGGER AS $$
DECLARE
    schema_val JSONB;
    field_record RECORD;
    field_name TEXT;
    field_label TEXT;
    entered_value TEXT;
    dup_exists BOOLEAN;
    temp_json jsonb;
BEGIN
    -- 1. Get the product's custom fields schema
    SELECT custom_fields_schema::jsonb INTO schema_val
    FROM products
    WHERE id = NEW.product_id;

    -- If no schema or no fields array, nothing to validate
    IF schema_val IS NULL OR NOT (schema_val ? 'fields') THEN
        RETURN NEW;
    END IF;

    -- Try parsing NEW.notes to a jsonb object
    IF NEW.notes IS NULL OR NEW.notes = '' THEN
        RETURN NEW;
    END IF;

    BEGIN
        temp_json := NEW.notes::jsonb;
    EXCEPTION WHEN OTHERS THEN
        -- If notes is not valid JSON (e.g. plain text notes), we don't validate
        RETURN NEW;
    END;

    -- 2. Loop through all fields in the schema
    FOR field_record IN 
        SELECT * FROM jsonb_to_recordset(schema_val->'fields') 
        AS (name TEXT, label TEXT, type TEXT, "unique" BOOLEAN)
    LOOP
        -- If the field is marked as unique (no repeat)
        IF field_record."unique" = TRUE THEN
            field_name := field_record.name;
            field_label := field_record.label;
            
            entered_value := temp_json ->> field_name;

            -- If a value is provided, check if it's already taken
            IF entered_value IS NOT NULL AND TRIM(entered_value) <> '' THEN
                
                -- Check blocked numbers for specific product
                IF NEW.product_id::text = 'db18cf9c-f5c7-42e5-b4b1-ea37fc6eb6c0' AND TRIM(entered_value) IN ('1', '2', '3', '4', '5', '6', '01', '02', '03', '04', '05', '06') THEN
                    RAISE EXCEPTION 'El número % está reservado y no puede ser seleccionado.', TRIM(entered_value);
                END IF;

                -- Check event_profile_product
                SELECT EXISTS (
                    SELECT 1 
                    FROM event_profile_product 
                    WHERE product_id = NEW.product_id 
                      AND id <> NEW.id
                      AND notes IS NOT NULL
                      AND notes <> ''
                      AND (
                        -- Safe JSON parse check
                        CASE 
                          WHEN notes LIKE '{%' THEN (notes::jsonb ->> field_name) = entered_value
                          ELSE FALSE
                        END
                      )
                ) INTO dup_exists;

                -- Check profile_product if not found in event_profile_product
                IF NOT dup_exists THEN
                    SELECT EXISTS (
                        SELECT 1 
                        FROM profile_product 
                        WHERE product_id = NEW.product_id 
                          AND id <> NEW.id
                          AND notes IS NOT NULL
                          AND notes <> ''
                          AND (
                            -- Safe JSON parse check
                            CASE 
                              WHEN notes LIKE '{%' THEN (notes::jsonb ->> field_name) = entered_value
                              ELSE FALSE
                            END
                          )
                    ) INTO dup_exists;
                END IF;

                IF dup_exists THEN
                    RAISE EXCEPTION 'El valor "%" para el campo "%" ya ha sido tomado por otro participante.', entered_value, field_label;
                END IF;
            END IF;
        END IF;
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Bind trigger to event_profile_product
DROP TRIGGER IF EXISTS trg_check_unique_event_profile_product ON event_profile_product;
CREATE TRIGGER trg_check_unique_event_profile_product
BEFORE INSERT OR UPDATE ON event_profile_product
FOR EACH ROW
EXECUTE FUNCTION check_unique_product_fields();

-- Bind trigger to profile_product
DROP TRIGGER IF EXISTS trg_check_unique_profile_product ON profile_product;
CREATE TRIGGER trg_check_unique_profile_product
BEFORE INSERT OR UPDATE ON profile_product
FOR EACH ROW
EXECUTE FUNCTION check_unique_product_fields();
