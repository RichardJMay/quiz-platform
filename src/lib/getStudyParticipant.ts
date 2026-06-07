import { supabase } from "@/lib/supabase";

export async function getStudyParticipant(userId: string) {
  const { data, error } = await supabase
    .from("study_participants")
    .select("participant_id, condition, study_active")
    .eq("user_id", userId)
    .single();

  if (error) {
    console.error("Error loading study participant:", error);
    return null;
  }

  return data;
}