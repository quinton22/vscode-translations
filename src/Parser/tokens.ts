export type Search = {
  search: RegExp | string;
  index?: number | [start: number, end: number]; // the index/indices (inclusive) within the match
  window?: number;
};

export type Token = {
  start: Search;
  end?: Search;
  multiline?: boolean | string;
  priority: number;
};

export type NamedToken = { name: string } & Token;

export const doubleQuote: Token = {
  start: { search: /[^\\]"/, index: 1, window: 2 },
  end: { search: /[^\\]"/, index: 1, window: 2 },
  priority: 1,
};
export const singleQuote: Token = {
  start: {
    search: /[^\\]'/,
    index: 1,
    window: 2,
  },
  end: {
    search: /[^\\]'/,
    index: 1,
    window: 2,
  },
  priority: 1,
};
export const backQuote: Token = {
  start: { search: /[^\\]`/, index: 1, window: 2 },
  end: { search: /[^\\]`/, index: 1, window: 2 },
  priority: 1,
};

export const lineComment: Token = {
  start: { search: '//', index: [0, 1], window: 2 },
  end: { search: /$/m, index: -1 },
  priority: 1,
};

export const blockComment: Token = {
  start: { search: '/*', index: [0, 1], window: 2 },
  end: { search: '*/', index: [0, 1], window: 2 },
  priority: 1,
};
