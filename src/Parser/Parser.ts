import { NamedToken, Token, blockComment, lineComment } from './tokens';

export type ParsedToken = {
  name: string;
  indices: [start: number, end: number];
  text: string;
};

export class Parser {
  public readonly tokens: NamedToken[];

  constructor(tokens: Record<string, Token>) {
    const t = {
      ...tokens,
      lineComment,
      blockComment,
    };

    this.tokens = Object.entries(t)
      .map(([k, v]) => ({ name: k, ...v }))
      .sort((a, b) => a.priority - b.priority);
  }

  private parseAtIndex(
    text: string,
    index: number
  ): {
    token?: {
      indices: [start: number, end: number];
      name: string;
      text: string;
    };
    next?: number;
  } {
    if (index >= text.length) {
      return {
        token: undefined,
        next: undefined,
      }; // done
    }

    let match, token;
    for (token of this.tokens) {
      const startWindow = token.start.window ?? 1;
      const t = text.slice(index);
      const t1 = t.slice(0, startWindow);

      if (typeof token.start.search === 'string') {
        match = t1.startsWith(token.start.search);
      } else {
        match = new RegExp('^' + token.start.search.source).test(t1);
      }

      if (!match) {
        continue;
      }

      let startIndex1 = 0,
        startIndex2 = 0;

      if (typeof token.start.index === 'object') {
        [startIndex1, startIndex2] = token.start.index;
      } else if (!!token.start.index) {
        startIndex1 = token.start.index;
        startIndex2 = startIndex1;
      }

      if (token.end === undefined) {
        return {
          token: {
            indices: [index + startIndex1, index + startIndex2],
            name: token.name,
            text: t1.slice(startIndex1, startIndex2 + 1),
          },
        };
      }

      const endWindow = token.end.window ?? 1;
      const t2Index = startIndex2 + 1 - (endWindow - 1);
      const t2 = t.slice(t2Index);
      let index2;

      if (typeof token.end.search === 'string') {
        index2 = t2.indexOf(token.end.search);
      } else {
        index2 = t2.match(token.end.search)?.index ?? -1;
      }

      if (index2 >= 0) {
        let endIndex =
          typeof token.end.index === 'object'
            ? token.end.index[1]
            : token.end.index ?? 0;

        const start = index + startIndex1;
        const end = index + t2Index + index2 + endIndex;
        return {
          token: {
            indices: [start, end],
            name: token.name,
            text: text.slice(start, end + 1),
          },
          next: end + 1,
        };
      }
    }

    return {
      token: undefined,
      next: index + 1,
    };
  }

  parse(text: string, tokenType?: string): ParsedToken[] {
    let index: undefined | number = 0;
    const tokenList = [];
    while (index !== undefined && index < text.length) {
      const { token, next } = this.parseAtIndex(text, index);
      if (token !== undefined) {
        tokenList.push(token);
      }

      index = next;
    }

    return tokenList.filter(
      (t) =>
        !tokenType || t.name.toLowerCase().includes(tokenType.toLowerCase())
    );
  }
}
