import "should";
import { parse } from "../lib/index.js";
import { parse as parseSync } from "../lib/sync.js";
import { parse as parseWebStream } from "../lib/stream.js";
import { CsvError } from "../lib/index.js";
import { assert_error } from "./api.assert_error.js";

const bom = Buffer.from([239, 187, 191]).toString();

describe("Option `dialect`", function () {
  it("normalize the `excel` dialect", function () {
    const parser = parse({ dialect: "excel" });
    parser.options.bom!.should.eql(true);
    parser.options.delimiter.should.eql([Buffer.from(",")]);
    parser.options.quote!.should.eql(Buffer.from('"'));
    parser.options.record_delimiter.should.eql([Buffer.from("\r\n")]);
  });

  it("normalize the `excel-tab` dialect", function () {
    const parser = parse({ dialect: "excel-tab" });
    parser.options.bom!.should.eql(true);
    parser.options.delimiter.should.eql([Buffer.from("\t")]);
    parser.options.quote!.should.eql(Buffer.from('"'));
    parser.options.record_delimiter.should.eql([Buffer.from("\r\n")]);
  });

  it("normalize the `unix` dialect", function () {
    const parser = parse({ dialect: "unix" });
    parser.options.bom!.should.eql(false);
    parser.options.delimiter.should.eql([Buffer.from(",")]);
    parser.options.quote!.should.eql(Buffer.from('"'));
    parser.options.record_delimiter.should.eql([Buffer.from("\n")]);
  });

  it("normalize the `rfc4180` dialect", function () {
    const parser = parse({ dialect: "rfc4180" });
    parser.options.bom!.should.eql(false);
    parser.options.delimiter.should.eql([Buffer.from(",")]);
    parser.options.quote!.should.eql(Buffer.from('"'));
    parser.options.record_delimiter.should.eql([Buffer.from("\r\n")]);
  });

  it("is not part of the normalized options", function () {
    const parser = parse({ dialect: "excel" });
    (parser.options as { dialect?: unknown }).should.not.have.property(
      "dialect",
    );
  });

  it("strip the BOM with `excel`", function () {
    parseSync(Buffer.from(bom + "a,b,c\r\n"), { dialect: "excel" }).should.eql([
      ["a", "b", "c"],
    ]);
  });

  it("read CRLF terminated records with `excel`", function () {
    parseSync("a,b\r\nc,d\r\n", { dialect: "excel" }).should.eql([
      ["a", "b"],
      ["c", "d"],
    ]);
  });

  it("read tab delimited records with `excel-tab`", function () {
    parseSync("a\tb\r\nc\td\r\n", { dialect: "excel-tab" }).should.eql([
      ["a", "b"],
      ["c", "d"],
    ]);
  });

  it("read fully quoted fields with `unix`", function () {
    parseSync('"a","b"\n"c","d"\n', { dialect: "unix" }).should.eql([
      ["a", "b"],
      ["c", "d"],
    ]);
  });

  it("coexist with other camelCased options", function () {
    parseSync(" a,b\r\nc,d\r\n", {
      dialect: "excel",
      columns: true,
      recordDelimiter: "\r\n",
      trim: true,
    }).should.eql([{ a: "c", b: "d" }]);
  });

  it("accept the camelCased `recordDelimiter` override", function () {
    parseSync("a;b\n", {
      dialect: "excel",
      delimiter: ";",
      recordDelimiter: "\n",
    }).should.eql([["a", "b"]]);
  });

  it("let explicit options override the dialect", function () {
    parseSync("a;b\r\n", {
      dialect: "excel",
      delimiter: ";",
    }).should.eql([["a", "b"]]);
  });

  it("not change the default behavior when undefined", function () {
    const parser = parse();
    parser.options.bom!.should.eql(false);
    parser.options.delimiter.should.eql([Buffer.from(",")]);
    parser.options.record_delimiter.should.eql([]);
  });

  describe("error", function () {
    const assert_invalid_dialect = function (err: unknown) {
      assert_error(err as CsvError, {
        code: "CSV_INVALID_OPTION_DIALECT",
        message:
          'Invalid option dialect: got "excelx", must be one of "excel", "excel-tab", "unix", "rfc4180"',
      });
    };

    it("throw on an unknown dialect name in sync", function () {
      (() =>
        parseSync("a,b", {
          dialect: "excelx" as "excel",
        })).should.throw(/must be one of "excel"/);
    });

    it("throw a CsvError with a code in sync", function () {
      try {
        parseSync("a,b", { dialect: "excelx" as "excel" });
      } catch (err) {
        assert_invalid_dialect(err);
        return;
      }
      throw Error("Expected an error to be thrown");
    });

    it("throw on a non string dialect in sync", function () {
      try {
        parseSync("a,b", { dialect: 42 as unknown as "excel" });
      } catch (err) {
        assert_error(err as CsvError, {
          code: "CSV_INVALID_OPTION_DIALECT",
        });
        return;
      }
      throw Error("Expected an error to be thrown");
    });

    it("throw synchronously with a code on the callback API", function () {
      try {
        parse("a,b", { dialect: "excelx" as "excel" }, () => {});
      } catch (err) {
        assert_invalid_dialect(err);
        return;
      }
      throw Error("Expected an error to be thrown");
    });

    it("be a CsvError like other option validation errors", function () {
      try {
        parseSync("a,b", { dialect: null as unknown as "excel" });
      } catch (err) {
        (err as CsvError).should.be.instanceof(CsvError);
        return;
      }
      throw Error("Expected an error to be thrown");
    });
  });

  describe("entries", function () {
    it("is honored by the sync API", function () {
      parseSync(Buffer.from(bom + "a,b\r\nc,d\r\n"), {
        dialect: "excel",
        columns: true,
      }).should.eql([{ a: "c", b: "d" }]);
    });

    it("is honored by the stream API", function (next) {
      const parser = parse(
        { dialect: "excel-tab", columns: true },
        (err, records) => {
          records.should.eql([{ a: "c", b: "d" }]);
          next(err);
        },
      );
      parser.write(Buffer.from(bom + "a\tb\r\nc\td\r\n"));
      parser.end();
    });

    it("is honored by the Web Streams API", async function () {
      const stream = parseWebStream({ dialect: "excel" });
      const writer = stream.writable.getWriter();
      const reader = stream.readable.getReader();
      await writer.write(Buffer.from(bom + "a,b\r\nc,d\r\n"));
      await writer.close();
      const records = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        records.push(value);
      }
      records.should.eql([
        ["a", "b"],
        ["c", "d"],
      ]);
    });

    it("reports invalid dialect on the Web Streams API", function () {
      try {
        parseWebStream({ dialect: "invalid" as "excel" });
      } catch (err) {
        (err as CsvError).code.should.eql("CSV_INVALID_OPTION_DIALECT");
        return;
      }
      throw Error("Expected an error to be thrown");
    });
  });
});
