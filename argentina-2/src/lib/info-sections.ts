import { db } from "@/firebase";

export type InfoSectionRow = {
  id: string;
  content: string | null;
  enabled: boolean | null;
  lastEdited: string | null;
  lastEditedBy: string | null;
  version: number | null;
  history: any[] | null;
};

const CANDIDATE_TABLES = ["info_sections", "infoSections"] as const;

function isSupabaseDb(value: any): value is { from: (t: string) => any } {
  return value && typeof value.from === "function";
}

let cachedTable: (typeof CANDIDATE_TABLES)[number] | null = null;
let tableProbeDone = false;

async function pickTable(): Promise<(typeof CANDIDATE_TABLES)[number]> {
  // Cache to avoid spamming 404 probes in console
  if (cachedTable) return cachedTable;
  if (tableProbeDone) return "info_sections";
  tableProbeDone = true;

  if (!isSupabaseDb(db)) return "info_sections";

  for (const t of CANDIDATE_TABLES) {
    // eslint-disable-next-line no-await-in-loop
    const { error } = await db.from(t).select("id").limit(1);
    if (!error) {
      cachedTable = t;
      return t;
    }
  }

  // Prefer snake_case as canonical when creating the table.
  cachedTable = "info_sections";
  return "info_sections";
}

export async function getInfoSection(id: string): Promise<InfoSectionRow | null> {
  if (!isSupabaseDb(db)) return null;
  const table = await pickTable();
  const { data, error } = await db.from(table).select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return (data as InfoSectionRow) ?? null;
}

export async function upsertInfoSection(
  row: InfoSectionRow
): Promise<InfoSectionRow> {
  if (!isSupabaseDb(db)) {
    throw new Error("Supabase db not available");
  }
  const table = await pickTable();
  // Some projects may have different column naming (snake_case vs camelCase) or
  // legacy tables. Try full upsert first; if PostgREST returns 400, retry with minimal columns.
  const attempt = async (payload: any) => {
    const { data, error } = await db
      .from(table)
      .upsert(payload, { onConflict: "id" })
      .select("*")
      .single();
    if (error) throw error;
    return data as InfoSectionRow;
  };

  try {
    return await attempt(row);
  } catch (e: any) {
    const status = e?.status ?? e?.code;
    // PostgREST uses HTTP status codes; 400 commonly means unknown column in payload.
    if (status === 400) {
      return await attempt({
        id: row.id,
        content: row.content,
        enabled: row.enabled,
      });
    }
    throw e;
  }
}

export async function getUserLibertaByEmail(email: string): Promise<"si" | "no"> {
  if (!isSupabaseDb(db)) return "no";
  const { data, error } = await db.from("users").select("liberta").eq("email", email).maybeSingle();
  if (error) return "no";
  return (data?.liberta === "si" ? "si" : "no") as "si" | "no";
}

