/* Supabase returns at most 1000 rows per request (the API's default
   max_rows). Lists that can grow past that are read page by page; the
   query must have a deterministic order so pages do not overlap. */
export const SUPABASE_PAGE_SIZE = 1000;

export async function fetchAllPages<Row>(
  fetchPage: (
    from: number,
    to: number,
  ) => PromiseLike<{ data: Row[] | null; error: unknown }>,
): Promise<Row[]> {
  const rows: Row[] = [];

  for (let from = 0; ; from += SUPABASE_PAGE_SIZE) {
    const { data, error } = await fetchPage(from, from + SUPABASE_PAGE_SIZE - 1);
    if (error) throw error;

    const page = data ?? [];
    rows.push(...page);

    if (page.length < SUPABASE_PAGE_SIZE) return rows;
  }
}
