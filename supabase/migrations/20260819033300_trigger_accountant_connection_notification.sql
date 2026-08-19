-- Create trigger function to notify taxpayer when an accountant links with them
CREATE OR REPLACE FUNCTION notify_taxpayer_on_connection()
RETURNS TRIGGER AS $$
DECLARE
    target_user_id UUID;
    v_firm_name TEXT;
BEGIN
    -- Only trigger if the status is active
    IF NEW.status = 'active' THEN
        -- Find the primary user (owner or admin) of the taxpayer organization
        SELECT user_id INTO target_user_id
        FROM organization_members
        WHERE organization_id = NEW.taxpayer_organization_id
        ORDER BY 
          CASE WHEN role = 'owner' THEN 1 WHEN role = 'admin' THEN 2 ELSE 3 END
        LIMIT 1;

        -- If a user is found, proceed
        IF target_user_id IS NOT NULL THEN
            -- Get the accounting firm's name
            SELECT firm_name INTO v_firm_name
            FROM accounting_firms
            WHERE id = NEW.accounting_firm_id;

            IF v_firm_name IS NOT NULL THEN
                -- Insert the notification
                INSERT INTO notifications (profile_id, title, message, type, is_read)
                VALUES (
                    target_user_id,
                    'Muhasebeci Bağlantısı',
                    'Muhasebeciniz ' || v_firm_name || ' sizinle bağlantı kurdu. Artık verileriniz senkronize edilecek.',
                    'system',
                    false
                );
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Bind the trigger to the accountant_taxpayer_links table
DROP TRIGGER IF EXISTS trigger_notify_taxpayer_on_connection ON accountant_taxpayer_links;
CREATE TRIGGER trigger_notify_taxpayer_on_connection
AFTER INSERT ON accountant_taxpayer_links
FOR EACH ROW
EXECUTE FUNCTION notify_taxpayer_on_connection();
