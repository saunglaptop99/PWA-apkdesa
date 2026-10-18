// PostgREST applies a row cap (usually 1,000) to each response. Fetch list
// pages explicitly so administrative tables, exports, and summaries are whole.
export async function fetchAllRows(buildQuery, pageSize = 1000) {
  const rows = [];
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await buildQuery().range(offset, offset + pageSize - 1);
    if (error) return { data: null, error };
    const batch = data || [];
    rows.push(...batch);
    if (batch.length < pageSize) return { data: rows, error: null };
  }
}
