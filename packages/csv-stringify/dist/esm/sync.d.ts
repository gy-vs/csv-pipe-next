import { Input, Options } from "./index.js";

declare function stringify(input: Input, options?: Options): string;

export { stringify };

export {
  RecordDelimiter,
  Dialect,
  Cast,
  PlainObject,
  Input,
  ColumnOption,
  CastingContext,
  Options,
  OptionsNormalized,
} from "./index.js";
