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
