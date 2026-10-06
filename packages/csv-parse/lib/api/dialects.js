import { CsvError } from "./CsvError.js";

// Named sets of parse options. Every dialect must be paired with its
// counterpart in csv-stringify so records written with a dialect can be
// read back with the dialect of the same name.
const dialects = {
  // Comma separated, quoted, Windows line endings, the BOM is stripped when
  // present so files produced by Excel open as-is.
  excel: {
    bom: true,
    delimiter: ",",
    quote: '"',
    record_delimiter: "\r\n",
  },
  // Same as `excel` with a tabulation as the field delimiter.
  "excel-tab": {
    bom: true,
    delimiter: "\t",
    quote: '"',
    record_delimiter: "\r\n",
  },
  // Comma separated, every field is quoted by the stringifier, Unix line
  // endings. Quoted fields are part of the standard syntax, no specific
  // option is required to read them.
  unix: {
    bom: false,
    delimiter: ",",
    quote: '"',
    record_delimiter: "\n",
  },
  // Strict RFC 4180: comma separated, quoted, CRLF line endings, no BOM.
  rfc4180: {
    bom: false,
    delimiter: ",",
    quote: '"',
    record_delimiter: "\r\n",
  },
};

const dialect_names = Object.keys(dialects);

// Resolve the `dialect` option, returning the associated option preset.
// Explicit user options always take precedence over the preset.
const normalize_dialect = function (opts) {
  const dialect = opts.dialect;
  if (dialect === undefined) return {};
  if (typeof dialect !== "string" || dialects[dialect] === undefined) {
    throw new CsvError(
      "CSV_INVALID_OPTION_DIALECT",
      [
        "Invalid option dialect:",
        `got ${JSON.stringify(dialect)},`,
        `must be one of ${dialect_names.map((name) => JSON.stringify(name)).join(", ")}`,
      ],
      opts,
    );
  }
  return dialects[dialect];
};

export { dialects, dialect_names, normalize_dialect };
