/**
 * CSV Parser Utility
 * Parses CSV content into an array of objects with column names as keys.
 * Handles:
 * - Header row detection
 * - Quoted values (including commas within quotes)
 * - Newlines within quoted fields
 * - Empty values (converted to null)
 */

export type CSVRow = Record<string, string | null>;

/**
 * Parses a CSV string into an array of typed objects.
 * The first row is treated as the header row containing column names.
 *
 * @param content - The CSV content as a string
 * @returns Array of objects where keys are column names and values are field values or null
 */
export function parseCSV(content: string): CSVRow[] {
  if (!content || content.trim() === '') {
    return [];
  }

  const rows = parseCSVRows(content);

  if (rows.length === 0) {
    return [];
  }

  const headers = rows[0];
  const dataRows = rows.slice(1);

  return dataRows.map((row) => {
    const obj: CSVRow = {};
    headers.forEach((header, index) => {
      const value = row[index];
      // Trim the header name and use it as key
      const key = header.trim();
      // Empty values become null
      obj[key] = value === undefined || value === '' ? null : value;
    });
    return obj;
  });
}

/**
 * Parses CSV content into a 2D array of strings.
 * Handles quoted values with embedded commas and newlines.
 */
function parseCSVRows(content: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;
  let i = 0;

  while (i < content.length) {
    const char = content[i];
    const nextChar = content[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          // Escaped quote ("") - add a single quote and skip both
          currentField += '"';
          i += 2;
          continue;
        } else {
          // End of quoted field
          inQuotes = false;
          i++;
          continue;
        }
      } else {
        // Regular character inside quotes (including newlines)
        currentField += char;
        i++;
        continue;
      }
    }

    // Not in quotes
    if (char === '"') {
      // Start of quoted field
      inQuotes = true;
      i++;
      continue;
    }

    if (char === ',') {
      // Field delimiter
      currentRow.push(currentField.trim());
      currentField = '';
      i++;
      continue;
    }

    if (char === '\r' && nextChar === '\n') {
      // Windows line ending (CRLF)
      currentRow.push(currentField.trim());
      if (currentRow.length > 0 && currentRow.some(f => f !== '')) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentField = '';
      i += 2;
      continue;
    }

    if (char === '\n' || char === '\r') {
      // Unix line ending (LF) or old Mac (CR)
      currentRow.push(currentField.trim());
      if (currentRow.length > 0 && currentRow.some(f => f !== '')) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentField = '';
      i++;
      continue;
    }

    // Regular character
    currentField += char;
    i++;
  }

  // Handle last field and row
  if (currentField !== '' || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some(f => f !== '')) {
      rows.push(currentRow);
    }
  }

  return rows;
}
