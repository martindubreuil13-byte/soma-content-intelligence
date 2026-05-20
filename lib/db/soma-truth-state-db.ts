import { createServerSupabase } from "@/lib/supabase/server";
import { requireWorkspaceContext } from "@/lib/workspace/workspace-context";

export type SomaTruthState = {
  generationRuns: number;
  preferenceMemories: number;
  learningEvents: number;
  generationArtifacts: number;
};

async function countTable(table: string, organizationId: string) {
  const supabase = await createServerSupabase();
  const { count, error } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId);

  if (error) {
    console.error(`SOMA TRUTH COUNT ERROR ${table}`, error);
    throw error;
  }

  return count ?? 0;
}

export async function getSomaTruthState(): Promise<SomaTruthState> {
  const context = await requireWorkspaceContext();
  const organizationId = context.organization.id;
  const [
    generationRuns,
    preferenceMemories,
    learningEvents,
    generationArtifacts,
  ] = await Promise.all([
    countTable("generation_runs", organizationId),
    countTable("preference_memories", organizationId),
    countTable("learning_events", organizationId),
    countTable("generation_artifacts", organizationId),
  ]);

  return {
    generationRuns,
    preferenceMemories,
    learningEvents,
    generationArtifacts,
  };
}

export function isFirstContactState(state: SomaTruthState) {
  return (
    state.generationRuns === 0 &&
    state.preferenceMemories === 0 &&
    state.learningEvents === 0 &&
    state.generationArtifacts === 0
  );
}
