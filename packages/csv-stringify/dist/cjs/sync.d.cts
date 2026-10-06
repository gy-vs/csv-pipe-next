import { Input, Options } from "./index.cjs";

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
} from "./index.cjs";
