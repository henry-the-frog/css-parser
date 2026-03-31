// css.js — CSS parser

export function parse(css) {
  const rules = [];
  let i = 0;

  while (i < css.length) {
    i = skipWhitespace(css, i);
    if (i >= css.length) break;

    // Comments
    if (css[i] === '/' && css[i + 1] === '*') {
      i = css.indexOf('*/', i + 2) + 2;
      continue;
    }

    // @media
    if (css.slice(i).startsWith('@media')) {
      const rule = parseMediaRule(css, i);
      rules.push(rule.node);
      i = rule.end;
      continue;
    }

    // @import
    if (css.slice(i).startsWith('@import')) {
      const semi = css.indexOf(';', i);
      rules.push({ type: 'import', value: css.slice(i + 8, semi).trim() });
      i = semi + 1;
      continue;
    }

    // Regular rule
    const rule = parseRule(css, i);
    if (rule) {
      rules.push(rule.node);
      i = rule.end;
    } else {
      i++;
    }
  }

  return { type: 'stylesheet', rules };
}

function parseRule(css, start) {
  const braceIdx = css.indexOf('{', start);
  if (braceIdx === -1) return null;

  const selectorStr = css.slice(start, braceIdx).trim();
  const selectors = selectorStr.split(',').map(s => s.trim());

  const closeIdx = findMatchingBrace(css, braceIdx);
  const bodyStr = css.slice(braceIdx + 1, closeIdx).trim();
  const declarations = parseDeclarations(bodyStr);

  return {
    node: { type: 'rule', selectors, declarations },
    end: closeIdx + 1,
  };
}

function parseMediaRule(css, start) {
  const braceIdx = css.indexOf('{', start);
  const query = css.slice(start + 6, braceIdx).trim();
  const closeIdx = findMatchingBrace(css, braceIdx);
  const body = css.slice(braceIdx + 1, closeIdx);

  // Parse inner rules
  const inner = parse(body);

  return {
    node: { type: 'media', query, rules: inner.rules },
    end: closeIdx + 1,
  };
}

function parseDeclarations(str) {
  const decls = [];
  for (const part of str.split(';')) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const colonIdx = trimmed.indexOf(':');
    if (colonIdx === -1) continue;
    const property = trimmed.slice(0, colonIdx).trim();
    let value = trimmed.slice(colonIdx + 1).trim();
    const important = value.endsWith('!important');
    if (important) value = value.slice(0, -10).trim();
    decls.push({ property, value, important });
  }
  return decls;
}

function findMatchingBrace(str, start) {
  let depth = 1;
  for (let i = start + 1; i < str.length; i++) {
    if (str[i] === '{') depth++;
    if (str[i] === '}') { depth--; if (depth === 0) return i; }
  }
  return str.length;
}

function skipWhitespace(str, i) {
  while (i < str.length && /\s/.test(str[i])) i++;
  return i;
}

// Selector specificity: [inline, ids, classes, elements]
export function specificity(selector) {
  let ids = 0, classes = 0, elements = 0;
  // Remove pseudo-elements (::before etc)
  const sel = selector.replace(/::[a-zA-Z-]+/g, () => { elements++; return ''; });
  // Count IDs
  ids += (sel.match(/#[a-zA-Z_-][a-zA-Z0-9_-]*/g) || []).length;
  // Count classes, pseudo-classes, attribute selectors
  classes += (sel.match(/\.[a-zA-Z_-][a-zA-Z0-9_-]*/g) || []).length;
  classes += (sel.match(/:[a-zA-Z-]+/g) || []).length;
  classes += (sel.match(/\[/g) || []).length;
  // Count elements (type selectors)
  const cleaned = sel.replace(/#[a-zA-Z_-][a-zA-Z0-9_-]*/g, '')
    .replace(/\.[a-zA-Z_-][a-zA-Z0-9_-]*/g, '')
    .replace(/:[a-zA-Z-]+(\([^)]*\))?/g, '')
    .replace(/\[[^\]]*\]/g, '')
    .replace(/[>+~ ]+/g, ' ')
    .trim();
  for (const part of cleaned.split(/\s+/)) {
    if (part && part !== '*') elements++;
  }
  return [0, ids, classes, elements];
}

export function compareSpecificity(a, b) {
  for (let i = 0; i < 4; i++) {
    if (a[i] !== b[i]) return a[i] - b[i];
  }
  return 0;
}

export function stringify(ast) {
  return ast.rules.map(rule => {
    if (rule.type === 'media') {
      const inner = stringify({ rules: rule.rules });
      return `@media ${rule.query} {\n${inner.split('\n').map(l => '  ' + l).join('\n')}\n}`;
    }
    if (rule.type === 'import') return `@import ${rule.value};`;
    const decls = rule.declarations.map(d =>
      `  ${d.property}: ${d.value}${d.important ? ' !important' : ''};`
    ).join('\n');
    return `${rule.selectors.join(', ')} {\n${decls}\n}`;
  }).join('\n\n');
}
