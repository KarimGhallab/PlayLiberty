/*
 * Rejects a hardcoded user-facing string. The web client owns every sentence a
 * person reads through `@playliberty/i18n`, so copy written straight into JSX
 * text or into a known label prop is a string that would never be translated and
 * that a later language would silently leave in English. The rule reads the two
 * places copy lands: the text between tags, and the props that name a control or
 * describe it to assistive technology.
 *
 * The allowlist is the other half. Not every literal is copy: a symbol, a
 * placeholder like `--:--`, an HTML entity or an example URL is not a sentence,
 * and a rule that flagged them would be turned off within a day. A string with
 * no letter at all is never copy, and a URL, an entity and the few symbols the
 * interface draws are allowed outright.
 */

const LETTER = /[A-Za-z]/;
const ENTITY = /&[a-zA-Z0-9#]+;/g;
const URL = /^https?:\/\//;

/* The props that render a person-facing word or sentence. */
const LABEL_PROPS = new Set([
  'aria-label',
  'aria-valuetext',
  'alt',
  'placeholder',
  'title',
  'label',
  'description',
  'message',
  'detail',
  'actionLabel'
]);

/* The few non-copy strings the interface draws that carry a letter or a symbol. */
const ALLOWED = new Set(['--:--', '×', '·', '%']);

/*
 * The string a literal holds, or null when the node is not a plain string. A
 * template with no expressions is a string; one with expressions is dynamic and
 * is left alone, because the copy is split around the value and the rule cannot
 * see it whole.
 */
function literalText(node) {
  if (node === null || node === undefined) {
    return null;
  }

  if (node.type === 'Literal' && typeof node.value === 'string') {
    return node.value;
  }

  if (
    node.type === 'TemplateLiteral' &&
    node.expressions.length === 0 &&
    node.quasis.length === 1
  ) {
    const quasi = node.quasis[0];
    return quasi.value.cooked ?? quasi.value.raw;
  }

  return null;
}

/** Whether a string is copy that belongs in the catalog. */
function isCopy(value) {
  const text = value.replace(ENTITY, '').trim();

  if (text === '') {
    return false;
  }
  if (!LETTER.test(text)) {
    return false;
  }
  if (ALLOWED.has(text)) {
    return false;
  }
  if (URL.test(text)) {
    return false;
  }

  return true;
}

/*
 * Walks an expression for the string literals it holds. A call is trusted whole:
 * `t('key')` is the catalog, and a formatting call holds no copy, so neither is
 * descended into. That is what lets a label prop hold `cond ? t('a') : t('b')`
 * while a plain `cond ? 'Pause' : 'Play'` is still caught.
 */
function scan(node, report) {
  if (node === null || node === undefined) {
    return;
  }

  const text = literalText(node);

  if (text !== null) {
    if (isCopy(text)) {
      report(node);
    }
    return;
  }

  if (
    node.type === 'CallExpression' ||
    node.type === 'JSXElement' ||
    node.type === 'JSXFragment'
  ) {
    return;
  }

  for (const key of Object.keys(node)) {
    if (key === 'parent' || key === 'loc' || key === 'range') {
      continue;
    }

    const child = node[key];

    if (Array.isArray(child)) {
      for (const item of child) {
        if (item !== null && typeof item === 'object' && 'type' in item) {
          scan(item, report);
        }
      }
      continue;
    }

    if (child !== null && typeof child === 'object' && 'type' in child) {
      scan(child, report);
    }
  }
}

export default {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Require user-facing copy to come from the catalog rather than a hardcoded string.'
    },
    schema: [],
    messages: {
      hardcoded:
        'User-facing copy must come from the catalog. Render it through `t(key)` rather than a hardcoded string.'
    }
  },
  create(context) {
    const report = node => context.report({ node, messageId: 'hardcoded' });

    return {
      JSXText(node) {
        if (isCopy(node.value)) {
          report(node);
        }
      },
      JSXExpressionContainer(node) {
        /* An attribute's container is the attribute's own business. */
        if (
          node.parent.type !== 'JSXElement' &&
          node.parent.type !== 'JSXFragment'
        ) {
          return;
        }

        scan(node.expression, report);
      },
      JSXAttribute(node) {
        const name = node.name.type === 'JSXIdentifier' ? node.name.name : null;

        if (name === null || !LABEL_PROPS.has(name) || node.value === null) {
          return;
        }

        if (node.value.type === 'JSXExpressionContainer') {
          scan(node.value.expression, report);
          return;
        }

        scan(node.value, report);
      }
    };
  }
};
