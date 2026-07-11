import { cleanLegacyDates } from "./listCleanup";

export const CLOUD_TABLE = "show_track_user_data";

export function buildCloudPayload(list, customLists) {
  return {
    library_payload: cleanLegacyDates(list),
    custom_lists_payload: customLists || [],
    updated_at_client: new Date().toISOString(),
  };
}

export async function loadCloudData(supabase, userId) {
  if (!supabase || !userId) return null;

  const { data, error } = await supabase
    .from(CLOUD_TABLE)
    .select("library_payload, custom_lists_payload, updated_at_client, updated_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    list: cleanLegacyDates(Array.isArray(data.library_payload) ? data.library_payload : []),
    customLists: Array.isArray(data.custom_lists_payload) ? data.custom_lists_payload : [],
    updatedAt: data.updated_at_client || data.updated_at || "",
  };
}

export async function saveCloudData(supabase, userId, list, customLists) {
  if (!supabase || !userId) return null;

  const payload = {
    user_id: userId,
    ...buildCloudPayload(list, customLists),
  };

  const { data, error } = await supabase
    .from(CLOUD_TABLE)
    .upsert(payload, { onConflict: "user_id" })
    .select("updated_at_client, updated_at")
    .single();

  if (error) throw error;

  return {
    updatedAt: data?.updated_at_client || data?.updated_at || payload.updated_at_client,
  };
}
