import { ParsedToken } from './Parser';

export const getStringContentsFromToken = ({
  indices,
  text,
  ...rest
}: ParsedToken): ParsedToken => ({
  ...rest,
  indices: [indices[0] + 1, indices[1] - 1],
  text: text.slice(1, text.length - 1),
});
