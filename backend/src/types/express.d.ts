// Make this file a TypeScript module so that `declare module` below is treated
// as a module augmentation (merged with existing types) rather than an ambient
// module declaration (which would replace all of express-serve-static-core).
export {};

// @types/express-serve-static-core v5.1.1 widened ParamsDictionary to
// `{ [key: string]: string | string[] }` for Express 5 array-param support.
// Our routes use only simple named string parameters, so we narrow it back
// to `string` via module augmentation (TypeScript merges index signatures
// as an intersection: (string | string[]) & string = string).
declare module 'express-serve-static-core' {
  interface ParamsDictionary {
    [key: string]: string;
  }
}
