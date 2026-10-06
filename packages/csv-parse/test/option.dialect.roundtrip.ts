import "should";
import { parse } from "../lib/sync.js";
import { stringify } from "../../csv-stringify/lib/sync.js";
import type { Dialect } from "../lib/index.js";

// Symmetry test: for every dialect, records written by csv-stringify with
// a dialect name must be read back by csv-parse using the very same name.
describe("dialect roundtrip", function () {
  // Fields cover every character class that forces quoting as well as
  // non ASCII characters which Excel mangles without a BOM.
  const array_records = [
    ["plain", "with,comma", 'with"quote', "with\ttab"],
    ["with\r\ncrlf", "with\nlf", "中文", "日本語"],
    ["", "  spaced  ", '日本,語\t"x"\r\n尾', "end"],
  ];

  const object_records = [
    {
      逗号: "甲,乙",
      quote: '甲"乙',
      newline: "甲\r\n乙",
      plain: "中文",
    },
    {
      逗号: "",
      quote: 'a"b',
      newline: "x\ny",
      plain: "plain",
    },
  ];

  const dialects: Dialect[] = ["excel", "excel-tab", "unix", "rfc4180"];

  for (const dialect of dialects) {
    describe(`dialect \`${dialect}\``, function () {
      it("preserves array records", function () {
        const output = stringify(array_records, { dialect });
        parse(output, { dialect }).should.eql(array_records);
      });

      it("preserves object records with a header", function () {
        const output = stringify(object_records, { dialect, header: true });
        parse(output, { dialect, columns: true }).should.eql(object_records);
      });
    });
  }

  it("excel output starts with a BOM and parse strips it", function () {
    const output = stringify([["中文"]], { dialect: "excel" });
    output.startsWith("﻿").should.eql(true);
    parse(output, { dialect: "excel" }).should.eql([["中文"]]);
  });

  it("excel-tab output separates fields with a tabulation", function () {
    const output = stringify([["a", "b"]], { dialect: "excel-tab" });
    output.should.endWith("a\tb\r\n");
  });

  it("unix output quotes every field", function () {
    const output = stringify([["a", ""]], { dialect: "unix" });
    output.should.eql('"a",""\n');
    parse(output, { dialect: "unix" }).should.eql([["a", ""]]);
  });

  it("rfc4180 output uses CRLF and no BOM", function () {
    const output = stringify([["a", "b"]], { dialect: "rfc4180" });
    output.startsWith("﻿").should.eql(false);
    output.should.eql("a,b\r\n");
  });

  it("explicit options still override the dialect on both sides", function () {
    const output = stringify([["a", "b"]], {
      dialect: "excel",
      bom: false,
      delimiter: ";",
      record_delimiter: "\n",
    });
    output.should.eql("a;b\n");
    parse(output, {
      dialect: "excel",
      bom: false,
      delimiter: ";",
      record_delimiter: "\n",
    }).should.eql([["a", "b"]]);
  });
});
