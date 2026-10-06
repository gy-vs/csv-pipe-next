import should from "should";
import {
  parse,
  normalize_options,
  CsvError,
  type Dialect,
  type Options,
} from "../lib/index.js";
import { parse as parseSync } from "../lib/sync.js";
import { parse as parseStream } from "../lib/stream.js";
import { stringify } from "csv-stringify/sync";

const dialects: Dialect[] = ["excel", "excel-tab", "unix", "rfc4180"];

describe("Option `dialect`", function () {
  describe("normalization", function () {
    it("excel", function () {
      const options = normalize_options({ dialect: "excel" });
      options.delimiter.should.eql([Buffer.from(",")]);
      should(options.quote).eql(Buffer.from('"'));
      options.record_delimiter.should.eql([Buffer.from("\r\n")]);
      should(options.bom).be.true();
    });

    it("excel-tab", function () {
      const options = normalize_options({ dialect: "excel-tab" });
      options.delimiter.should.eql([Buffer.from("\t")]);
      should(options.quote).eql(Buffer.from('"'));
      options.record_delimiter.should.eql([Buffer.from("\r\n")]);
      should(options.bom).be.true();
    });

    it("unix", function () {
      const options = normalize_options({ dialect: "unix" });
      options.delimiter.should.eql([Buffer.from(",")]);
      should(options.quote).eql(Buffer.from('"'));
      options.record_delimiter.should.eql([Buffer.from("\n")]);
      should(options.bom).be.false();
    });

    it("rfc4180", function () {
      const options = normalize_options({ dialect: "rfc4180" });
      options.delimiter.should.eql([Buffer.from(",")]);
      should(options.quote).eql(Buffer.from('"'));
      options.record_delimiter.should.eql([Buffer.from("\r\n")]);
      should(options.bom).be.false();
    });

    it("explicit options take precedence over the dialect", function () {
      const options = normalize_options({
        dialect: "excel",
        delimiter: ";",
        bom: false,
      });
      options.delimiter.should.eql([Buffer.from(";")]);
      should(options.bom).be.false();
      // Other dialect values are preserved
      should(options.quote).eql(Buffer.from('"'));
      options.record_delimiter.should.eql([Buffer.from("\r\n")]);
    });

    it("explicit camelCase options take precedence over the dialect", function () {
      const options = normalize_options({
        dialect: "excel",
        recordDelimiter: ";",
      });
      options.record_delimiter.should.eql([Buffer.from(";")]);
      // Other dialect values are preserved
      options.delimiter.should.eql([Buffer.from(",")]);
      should(options.bom).be.true();
    });
  });

  describe("validation", function () {
    it("throw a CsvError on unknown dialect", function () {
      (() => {
        parse(
          "",
          {
            // @ts-expect-error dialect must be a supported name
            dialect: "invalid",
          },
          () => {},
        );
      }).should.throw({
        code: "CSV_INVALID_OPTION_DIALECT",
        message:
          'Invalid option dialect: dialect must be one of "excel", "excel-tab", "unix", "rfc4180", got "invalid"',
      });
    });

    it("throw a CsvError on unknown dialect with the sync api", function () {
      (() => {
        parseSync("a,b\n1,2", {
          // @ts-expect-error dialect must be a supported name
          dialect: "invalid",
        });
      }).should.throw(CsvError, {
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

  describe("parse", function () {
    it("excel strip the BOM and split CRLF records", function (next) {
      parse("\ufeffa,b\r\n1,2\r\n", { dialect: "excel" }, (err, records) => {
        if (err) return next(err);
        records.should.eql([
          ["a", "b"],
          ["1", "2"],
        ]);
        next();
      });
    });

    it("excel without BOM", function (next) {
      parse("a,b\r\n1,2\r\n", { dialect: "excel" }, (err, records) => {
        if (err) return next(err);
        records.should.eql([
          ["a", "b"],
          ["1", "2"],
        ]);
        next();
      });
    });

    it("excel-tab split tab separated records", function (next) {
      parse(
        "\ufeffa\tb\r\n1\t2\r\n",
        { dialect: "excel-tab" },
        (err, records) => {
          if (err) return next(err);
          records.should.eql([
            ["a", "b"],
            ["1", "2"],
          ]);
          next();
        },
      );
    });

    it("unix read all-quoted records", function (next) {
      parse('"a","b"\n"1","2"\n', { dialect: "unix" }, (err, records) => {
        if (err) return next(err);
        records.should.eql([
          ["a", "b"],
          ["1", "2"],
        ]);
        next();
      });
    });

    it("rfc4180", function (next) {
      parse('a,b\r\n"x""y",z\r\n', { dialect: "rfc4180" }, (err, records) => {
        if (err) return next(err);
        records.should.eql([
          ["a", "b"],
          ['x"y', "z"],
        ]);
        next();
      });
    });

    it("sync api", function () {
      parseSync("\ufeffa,b\r\n1,2\r\n", { dialect: "excel" }).should.eql([
        ["a", "b"],
        ["1", "2"],
      ]);
    });

    it("web stream api", async function () {
      const stream = parseStream({ dialect: "excel" });
      const writer = stream.writable.getWriter();
      const reader = stream.readable.getReader();
      await writer.write(Buffer.from("\ufeffa,b\r\n1,2\r\n"));
      await writer.close();
      await reader.read().should.finally.eql({
        done: false,
        value: ["a", "b"],
      });
      await reader.read().should.finally.eql({
        done: false,
        value: ["1", "2"],
      });
      await reader.read().should.finally.eql({
        done: true,
        value: undefined,
      });
    });
  });

  describe("round trip with csv-stringify", function () {
    const records = [
      ["plain", "1", "true"],
      ["with,delimiter", "with\ttab", 'with"quote"'],
      ["with\r\nCRLF", "with\nLF", "with\rCR"],
      ["中文", "中文，带全角逗号", ""],
      ["", "  spaces  ", "end"],
    ];
    for (const dialect of dialects) {
      it(`dialect ${dialect}`, function () {
        const output = stringify(records, { dialect });
        parseSync(output, { dialect }).should.eql(records);
      });
    }

    describe("with header and columns", function () {
      const records = [
        { name: "a,b", desc: 'say "hi"', city: "北京" },
        { name: "x\ny", desc: "", city: "中文" },
      ];
      for (const dialect of dialects) {
        it(`dialect ${dialect}`, function () {
          const output = stringify(records, { dialect, header: true });
          parseSync(output, { dialect, columns: true }).should.eql(records);
        });
      }
    });
  });
});
