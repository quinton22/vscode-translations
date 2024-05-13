import { Parser } from './Parser';
import { backQuote, doubleQuote, singleQuote } from './tokens';

export * from './Parser';
export * from './tokens';
export * from './utils';

export const stringParser = new Parser({ backQuote, singleQuote, doubleQuote });
