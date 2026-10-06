import { CsvError } from "./CsvError.js";

// Named sets of stringify options. Every dialect must be paired with its
// counterpart in csv-parse so records written with a dialect can be
// read back with the dialect of the same name.
const dialects = {
  // Comma separated, quoted, Windows line endings and a BOM so Excel
  // opens files containing non ASCII characters without garbled text.
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
  // Comma separated, every field including empty ones is quoted, Unix
  // line endings.
  unix: {
    bom: false,
    delimiter: ",",
    quote: '"',
    quoted: true,
    quoted_empty: true,
    record_delimiter: "\n",
  },
  // Strict RFC 4180: comma separated, quoted, CRLF line endings, no BOM.
  // Fields are only quoted when required by the standard.
  rfc4180: {
    bom: false,
    delimiter: ",",
    quote: '"',
    record_delimiter: "\r\n",
  },
};

const dialect_names = Object.keys(dialects);

// Resolve the `dialect` option, returning a `[error, options]` tuple like
// `normalize_options`. Explicit user options always take precedence over
// the preset.
const normalize_dialect = function (opts) {
  const dialect = opts.dialect;
  if (dialect === undefined) return [undefined, {}];
  if (typeof dialect !== "string" || dialects[dialect] === undefined) {
    return [
      new CsvError("CSV_INVALID_OPTION_DIALECT", [
        "Invalid option dialect:",
        `got ${JSON.stringify(dialect)},`,
        `must be one of ${dialect_names.map((name) => JSON.stringify(name)).join(", ")}`,
      ]),
    ];
  }
  return [undefined, dialects[dialect]];
};

export { dialects, dialect_names, normalize_dialect };
