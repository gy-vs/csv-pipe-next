import "should";
import { stringify, type Dialect, type Options } from "../lib/index.js";
import { stringify as stringifySync } from "../lib/sync.js";
import { parse } from "csv-parse/sync";

const dialects: Dialect[] = ["excel", "excel-tab", "unix", "rfc4180"];

describe("Option `dialect`", function () {
  describe("normalization", function () {
    it("excel", function () {
      const options = stringify({ dialect: "excel" }).options;
      options.delimiter.should.eql(",");
      options.quote.should.eql('"');
      options.record_delimiter.should.eql("\r\n");
      options.bom.should.be.true();
    });

    it("excel-tab", function () {
      const options = stringify({ dialect: "excel-tab" }).options;
      options.delimiter.should.eql("\t");
      options.quote.should.eql('"');
      options.record_delimiter.should.eql("\r\n");
      options.bom.should.be.true();
    });

    it("unix", function () {
      const options = stringify({ dialect: "unix" }).options;
      options.delimiter.should.eql(",");
      options.quote.should.eql('"');
      options.record_delimiter.should.eql("\n");
      options.quoted.should.be.true();
      options.quoted_empty.should.be.true();
      options.bom.should.be.false();
    });

    it("rfc4180", function () {
      const options = stringify({ dialect: "rfc4180" }).options;
      options.delimiter.should.eql(",");
      options.quote.should.eql('"');
      options.record_delimiter.should.eql("\r\n");
      options.bom.should.be.false();
    });

    it("explicit options take precedence over the dialect", function () {
      const options = stringify({ dialect: "excel", delimiter: ";" }).options;
      options.delimiter.should.eql(";");
      // Other dialect values are preserved
      options.record_delimiter.should.eql("\r\n");
      options.bom.should.be.true();
    });

    it("explicit camelCase options take precedence over the dialect", function () {
      // Note, camelCase options are converted at runtime like with every
      // other options, they are simply not exposed by the TypeScript types.
      const options = stringify({
        dialect: "excel",
        recordDelimiter: ";",
      } as Options).options;
      options.record_delimiter.should.eql(";");
      // Other dialect values are preserved
      options.delimiter.should.eql(",");
      options.bom.should.be.true();
    });
  });

  describe("validation", function () {
    it("throw a CsvError on unknown dialect", function () {
      (() => {
        stringify({
          // @ts-expect-error dialect must be a supported name
          dialect: "invalid",
        });
      }).should.throw({
        code: "CSV_INVALID_OPTION_DIALECT",
        message:
          'Invalid option dialect: dialect must be one of "excel", "excel-tab", "unix", "rfc4180", got "invalid"',
      });
    });

    it("throw a CsvError on unknown dialect with the sync api", function () {
      (() => {
        stringifySync([["a", "b"]], {
          // @ts-expect-error dialect must be a supported name
          dialect: "invalid",
        });
      }).should.throw({
        code: "CSV_INVALID_OPTION_DIALECT",
        message:
          'Invalid option dialect: dialect must be one of "excel", "excel-tab", "unix", "rfc4180", got "invalid"',
      });
    });
  });

  describe("types", function () {
    it("accept supported dialect names", function () {
      const options: Options = { dialect: "excel" };
      options.dialect = "excel-tab";
      options.dialect = "unix";
      options.dialect = "rfc4180";
    });

    it("reject unsupported dialect names", function () {
      const options: Options = {};
      // @ts-expect-error dialect must be a supported name
      options.dialect = "invalid";
    });
  });

  describe("stringify", function () {
    it("excel prepend the BOM and delimit records with CRLF", function (next) {
      stringify(
        [
          ["a", "b"],
          ["1", "2"],
        ],
        { dialect: "excel" },
        (err, data) => {
          if (err) return next(err);
          data.should.eql("\ufeffa,b\r\n1,2\r\n");
          next();
        },
      );
    });

    it("excel-tab separate fields with tabs", function (next) {
      stringify(
        [
          ["a", "b"],
          ["1", "2"],
        ],
        { dialect: "excel-tab" },
        (err, data) => {
          if (err) return next(err);
          data.should.eql("\ufeffa\tb\r\n1\t2\r\n");
          next();
        },
      );
    });

    it("unix quote every field and delimit records with LF", function (next) {
      stringify(
        [
          ["a", ""],
          ["1", "2"],
        ],
        { dialect: "unix" },
        (err, data) => {
          if (err) return next(err);
          data.should.eql('"a",""\n"1","2"\n');
          next();
        },
      );
    });

    it("rfc4180 delimit records with CRLF and no BOM", function (next) {
      stringify(
        [
          ["a", "b"],
          ["x,y", 'z"1'],
        ],
        { dialect: "rfc4180" },
        (err, data) => {
          if (err) return next(err);
          data.should.eql('a,b\r\n"x,y","z""1"\r\n');
          next();
        },
      );
    });

    it("sync api", function () {
      stringifySync(
        [
          ["a", "b"],
          ["1", "2"],
        ],
        { dialect: "excel" },
      ).should.eql("\ufeffa,b\r\n1,2\r\n");
    });

    it("explicit delimiter is preserved over the dialect", function (next) {
      stringify(
        [
          ["a", "b"],
          ["1", "2"],
        ],
        { dialect: "excel", delimiter: ";" },
        (err, data) => {
          if (err) return next(err);
          data.should.eql("\ufeffa;b\r\n1;2\r\n");
          next();
        },
      );
    });
  });

  describe("round trip with csv-parse", function () {
    const records = [
      ["plain", "1", "true"],
      ["with,delimiter", "with\ttab", 'with"quote"'],
      ["with\r\nCRLF", "with\nLF", "with\rCR"],
      ["中文", "中文，带全角逗号", ""],
      ["", "  spaces  ", "end"],
    ];
    for (const dialect of dialects) {
      it(`dialect ${dialect}`, function () {
        const output = stringifySync(records, { dialect });
        parse(output, { dialect }).should.eql(records);
      });
    }

    describe("with header and columns", function () {
      const records = [
        { name: "a,b", desc: 'say "hi"', city: "北京" },
        { name: "x\ny", desc: "", city: "中文" },
      ];
      for (const dialect of dialects) {
        it(`dialect ${dialect}`, function () {
          const output = stringifySync(records, { dialect, header: true });
          parse(output, { dialect, columns: true }).should.eql(records);
        });
      }
    });
  });
});
