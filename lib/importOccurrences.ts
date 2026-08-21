export function addOccurrenceSignatures<T>(
  rows: T[],
  getBaseSignature: (row: T) => string,
) {
  const occurrenceBySignature = new Map<string, number>();

  return rows.map((row) => {
    const baseSignature = getBaseSignature(row);
    const occurrence = (occurrenceBySignature.get(baseSignature) ?? 0) + 1;

    occurrenceBySignature.set(baseSignature, occurrence);

    return {
      ...row,
      import_signature: `${baseSignature}|occ:${occurrence}`,
    };
  });
}

export function getOccurrenceSignatureSet<T>(
  rows: T[],
  getBaseSignature: (row: T) => string,
) {
  return new Set(
    addOccurrenceSignatures(rows, getBaseSignature).map(
      (row) => row.import_signature,
    ),
  );
}
