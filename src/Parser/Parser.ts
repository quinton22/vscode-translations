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

  private getStartSearchText(
    text: string,
    {
      window = 1,
      index = 0,
    }: { window?: number; index?: number | [start: number, end: number] },
    idx: number
  ) {
    const [i, j] = typeof index === 'object' ? index : [index, index];
    if (idx < i && window > 1 && i > 0) {
      const spaces = new Array(window - i).fill(' ').join('');

      return {
        text: `${spaces}${text.slice(0, window)}`,
        index: [i, j],
        adjustment: window - i,
      };
    }

    return {
      text: text.slice(0, window),
      index: [i, j],
      adjustment: 0,
    };
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

    const t = text.slice(index);

    for (token of this.tokens) {
      const {
        text: t1,
        index: [startIndex1, startIndex2],
        adjustment,
      } = this.getStartSearchText(t, token.start, index);

      if (typeof token.start.search === 'string') {
        match = t1.startsWith(token.start.search);
      } else {
        match = new RegExp('^' + token.start.search.source).test(t1);
      }

      if (!match) {
        continue;
      }

      if (token.end === undefined) {
        return {
          token: {
            indices: [
              index + startIndex1 - adjustment,
              index + startIndex2 - adjustment,
            ],
            name: token.name,
            text: t1.slice(startIndex1, startIndex2 + 1),
          },
        };
      }

      const endWindow = token.end.window ?? 1;
      const t2Index = startIndex2 + 1 - (endWindow - 1) - adjustment;
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

        const start = index + startIndex1 - adjustment;
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
