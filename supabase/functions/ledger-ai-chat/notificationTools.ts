import { createClient } from "https://esm.sh/@supabase/supabase-js@2.40.0"

/**
 * Creates a Supabase Service Role client to bypass RLS for broadcasting notifications.
 */
function getAdminClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  
  if (!serviceRoleKey) {
    console.error("Missing SUPABASE_SERVICE_ROLE_KEY in environment variables.");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

/**
 * Sends an in-app notification to a specific user by ID or Name.
 * 
 * @param userNameOrId The UUID of the user's profile OR their business name
 * @param title The title of the notification
 * @param message The message body of the notification
 * @param type The type of notification (e.g., ai_alert, system, ledger)
 */
export async function sendNotificationToUser(
  userNameOrId: string,
  title: string,
  message: string,
  type: string = 'ai_alert'
): Promise<string> {
  try {
    const supabaseAdmin = getAdminClient();
    
    let finalProfileId = userNameOrId;
    
    // Check if userNameOrId is a valid UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userNameOrId)) {
      // It's a name, search in profiles table
      // Fix Turkish ILIKE issue by replacing problematic letters with '_'
      let safeSearch = userNameOrId
        .replace(/[ıIİi]/g, '_')
        .replace(/[şŞ]/g, '_')
        .replace(/[ğĞ]/g, '_')
        .replace(/[üÜ]/g, '_')
        .replace(/[öÖ]/g, '_')
        .replace(/[çÇ]/g, '_');

      const { data, error: searchError } = await supabaseAdmin
        .from('profiles')
        .select('id, business_name')
        .ilike('business_name', `%${safeSearch}%`)
        .limit(1);
        
      if (searchError || !data || data.length === 0) {
        return `Kullanıcı bulunamadı: "${userNameOrId}". Lütfen adı kontrol edin.`;
      }
      finalProfileId = data[0].id;
    }
    
    const { error } = await supabaseAdmin
      .from('notifications')
      .insert({
        profile_id: finalProfileId,
        title,
        message,
        type,
        is_read: false
      });

    if (error) {
      console.error("Error sending notification to user:", error);
      return `Failed to send notification: ${error.message}`;
    }

    return `Successfully sent notification to user ${finalProfileId}.`;
  } catch (error: any) {
    console.error("Exception in sendNotificationToUser:", error);
    return `Error: ${error.message}`;
  }
}

/**
 * Sends a bulk broadcast notification to ALL users in the platform.
 * 
 * @param title The title of the notification
 * @param message The message body of the notification
 * @param type The type of notification (default: ai_broadcast)
 */
export async function sendNotificationToAllUsers(
  title: string,
  message: string,
  type: string = 'ai_broadcast'
): Promise<string> {
  try {
    const supabaseAdmin = getAdminClient();
    
    // Fetch all user profiles
    const { data: profiles, error: fetchError } = await supabaseAdmin
      .from('profiles')
      .select('id');

    if (fetchError) {
      console.error("Error fetching profiles:", fetchError);
      return `Failed to fetch users: ${fetchError.message}`;
    }

    if (!profiles || profiles.length === 0) {
      return "No users found in the platform to send notifications to.";
    }

    // Map to notification objects
    const notificationsToInsert = profiles.map(profile => ({
      profile_id: profile.id,
      title,
      message,
      type,
      is_read: false
    }));

    // Perform bulk insert
    const { error: insertError } = await supabaseAdmin
      .from('notifications')
      .insert(notificationsToInsert);

    if (insertError) {
      console.error("Error performing bulk notification insert:", insertError);
      return `Failed to broadcast notifications: ${insertError.message}`;
    }

    return `Successfully broadcasted the notification to ${profiles.length} users.`;
  } catch (error: any) {
    console.error("Exception in sendNotificationToAllUsers:", error);
    return `Error: ${error.message}`;
  }
}
