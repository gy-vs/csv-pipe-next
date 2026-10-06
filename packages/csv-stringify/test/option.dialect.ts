import "should";
import { stringify } from "../lib/index.js";
import { stringify as stringifySync } from "../lib/sync.js";

type ErrorWithCode = Error & { code: string };

const bom = Buffer.from([239, 187, 191]).toString();

describe("Option `dialect`", function () {
  it("normalize the `excel` dialect", function () {
    const stringifier = stringify({ dialect: "excel" });
    stringifier.options.bom.should.eql(true);
    stringifier.options.delimiter.should.eql(",");
    stringifier.options.quote.should.eql('"');
    stringifier.options.record_delimiter.should.eql("\r\n");
  });

  it("normalize the `excel-tab` dialect", function () {
    const stringifier = stringify({ dialect: "excel-tab" });
    stringifier.options.bom.should.eql(true);
    stringifier.options.delimiter.should.eql("\t");
    stringifier.options.quote.should.eql('"');
    stringifier.options.record_delimiter.should.eql("\r\n");
  });

  it("normalize the `unix` dialect", function () {
    const stringifier = stringify({ dialect: "unix" });
    stringifier.options.bom.should.eql(false);
    stringifier.options.delimiter.should.eql(",");
    stringifier.options.quote.should.eql('"');
    stringifier.options.quoted.should.eql(true);
    stringifier.options.quoted_empty.should.eql(true);
    stringifier.options.record_delimiter.should.eql("\n");
  });

  it("normalize the `rfc4180` dialect", function () {
    const stringifier = stringify({ dialect: "rfc4180" });
    stringifier.options.bom.should.eql(false);
    stringifier.options.delimiter.should.eql(",");
    stringifier.options.quote.should.eql('"');
    stringifier.options.record_delimiter.should.eql("\r\n");
  });

  it("is not part of the normalized options", function () {
    const stringifier = stringify({ dialect: "excel" });
    (stringifier.options as { dialect?: unknown }).should.not.have.property(
      "dialect",
    );
  });

  it("prepend a BOM and use CRLF with `excel`", function () {
    stringifySync([["a", "b"]], { dialect: "excel" }).should.eql(
      bom + "a,b\r\n",
    );
  });

  it("use a tab delimiter with `excel-tab`", function () {
    stringifySync([["a", "b"]], { dialect: "excel-tab" }).should.eql(
      bom + "a\tb\r\n",
    );
  });

  it("quote every field and use LF with `unix`", function () {
    stringifySync(
      [
        ["a", ""],
        ["b", "c"],
      ],
      {
        dialect: "unix",
      },
    ).should.eql('"a",""\n"b","c"\n');
  });

  it("only quote fields when required with `rfc4180`", function () {
    stringifySync([["a,b", "c"]], { dialect: "rfc4180" }).should.eql(
      '"a,b",c\r\n',
    );
  });

  it("coexist with other camelCased options", function () {
    stringifySync([{ name: "a" }], {
      dialect: "excel",
      header: true,
    }).should.eql(bom + "name\r\na\r\n");
  });

  it("let explicit options override the dialect", function () {
    stringifySync([["a", "b"]], {
      dialect: "excel",
      bom: false,
      delimiter: ";",
      recordDelimiter: "\n",
    }).should.eql("a;b\n");
  });

  it("accept camelCased options in the preset itself", function () {
    stringifySync([["a"]], {
      dialect: "unix",
      quotedEmpty: false,
    }).should.eql('"a"\n');
  });

  it("not change the default behavior when undefined", function () {
    const stringifier = stringify();
    stringifier.options.bom.should.eql(false);
    stringifier.options.delimiter.should.eql(",");
    stringifier.options.quote.should.eql('"');
    stringifier.options.record_delimiter.should.eql("\n");
  });

  describe("error", function () {
    const message =
      'Invalid option dialect: got "excelx", must be one of "excel", "excel-tab", "unix", "rfc4180"';

    it("throw a CsvError with a code in sync", function () {
      try {
        stringifySync([["a"]], { dialect: "excelx" as "excel" });
      } catch (err) {
        (err as Error).should.be.an.Error();
        (err as ErrorWithCode).code.should.eql("CSV_INVALID_OPTION_DIALECT");
        (err as Error).message.should.eql(message);
        return;
      }
      throw Error("Expected an error to be thrown");
    });

    it("throw on a non string dialect in sync", function () {
      try {
        stringifySync([["a"]], { dialect: 42 as unknown as "excel" });
      } catch (err) {
        (err as ErrorWithCode).code.should.eql("CSV_INVALID_OPTION_DIALECT");
        return;
      }
      throw Error("Expected an error to be thrown");
    });

    it("throw synchronously with a code on the callback API", function () {
      try {
        stringify([["a"]], { dialect: "excelx" as "excel" }, () => {});
      } catch (err) {
        (err as ErrorWithCode).code.should.eql("CSV_INVALID_OPTION_DIALECT");
        (err as Error).message.should.eql(message);
        return;
      }
      throw Error("Expected an error to be thrown");
    });

    it("be a CsvError like other option validation errors", function () {
      try {
        stringifySync([["a"]], { dialect: null as unknown as "excel" });
      } catch (err) {
        (err as ErrorWithCode).code.should.eql("CSV_INVALID_OPTION_DIALECT");
        return;
      }
      throw Error("Expected an error to be thrown");
    });
  });

  describe("entries", function () {
    it("is honored by the sync API", function () {
      stringifySync([{ a: "b" }], {
        dialect: "excel-tab",
        header: true,
      }).should.eql(bom + "a\r\nb\r\n");
    });

    it("is honored by the stream API", function (next) {
      stringify([["a", "b"]], { dialect: "excel" }, (err, data) => {
        data.should.eql(bom + "a,b\r\n");
        next(err);
      });
    });
  });
});
