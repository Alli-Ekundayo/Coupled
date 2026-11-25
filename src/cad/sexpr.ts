export type SexprNode = string | SexprList;
export type SexprList = SexprNode[];

const TOKEN_RE = /\(|\)|"(?:[^"\\]|\\.)*"|[^\s()"]+/g;

export function parseSexpr(input: string): SexprList {
  const root: SexprList = [];
  const stack: SexprList[] = [root];
  TOKEN_RE.lastIndex = 0;

  let match: RegExpExecArray | null;
  while ((match = TOKEN_RE.exec(input)) !== null) {
    const tok = match[0];
    if (tok === '(') {
      const list: SexprList = [];
      stack[stack.length - 1].push(list);
      stack.push(list);
    } else if (tok === ')') {
      if (stack.length > 1) {
        stack.pop();
      }
    } else if (tok.startsWith('"') && tok.endsWith('"')) {
      const unquoted = tok
        .slice(1, -1)
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, '\\');
      stack[stack.length - 1].push(unquoted);
    } else {
      stack[stack.length - 1].push(tok);
    }
  }

  return root;
}

export function isSexprList(node: SexprNode | undefined): node is SexprList {
  return Array.isArray(node);
}

export function tagOf(node: SexprNode | undefined): string | null {
  if (!Array.isArray(node) || node.length === 0) return null;
  return typeof node[0] === 'string' ? node[0] : null;
}

export function findChild(list: SexprList, tag: string): SexprList | undefined {
  for (let i = 1; i < list.length; i += 1) {
    const item = list[i];
    if (Array.isArray(item) && item[0] === tag) {
      return item;
    }
  }
  return undefined;
}

export function findChildren(list: SexprList, tag: string): SexprList[] {
  const out: SexprList[] = [];
  for (let i = 1; i < list.length; i += 1) {
    const item = list[i];
    if (Array.isArray(item) && item[0] === tag) {
      out.push(item);
    }
  }
  return out;
}

export function atomStr(node: SexprNode | undefined): string | undefined {
  return typeof node === 'string' ? node : undefined;
}

export function atomNum(node: SexprNode | undefined): number | undefined {
  if (typeof node !== 'string') return undefined;
  const n = Number(node);
  return Number.isFinite(n) ? n : undefined;
}
