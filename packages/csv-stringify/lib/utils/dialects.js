// Named dialects, each associating a name with a set of option values
// shared with the `csv-parse` package, so that the same name describes
// the same format when writing and when reading a CSV document. Dialects
// are presets: an option explicitly provided by the user always takes
// precedence over the value defined by the dialect.
const dialects = {
  // Excel with comma separator: UTF-8 BOM, comma delimiter,
  // double quotes and CRLF record delimiters
  excel: {
    bom: true,
    delimiter: ",",
    escape: '"',
    quote: '"',
    record_delimiter: "\r\n",
  },
  // Excel with tab separator: UTF-8 BOM, tab delimiter,
  // double quotes and CRLF record delimiters
  "excel-tab": {
    bom: true,
    delimiter: "\t",
    escape: '"',
    quote: '"',
    record_delimiter: "\r\n",
  },
  // Unix conventions: comma delimiter, double quotes,
  // every field quoted and LF record delimiters
  unix: {
    delimiter: ",",
    escape: '"',
    quote: '"',
    quoted: true,
    quoted_empty: true,
    record_delimiter: "\n",
  },
  // Strict RFC 4180: comma delimiter, double quotes
  // and CRLF record delimiters
  rfc4180: {
    delimiter: ",",
    escape: '"',
    quote: '"',
    record_delimiter: "\r\n",
  },
};

export { dialects };
