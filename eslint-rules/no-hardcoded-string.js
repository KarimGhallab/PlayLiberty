/*
 * Rejects copy written straight into JSX text or a label prop: the web client
 * reads every sentence through `@playliberty/i18n`, so the string would never
 * be translated. Symbols, entities and example URLs are not copy.
 */

const LETTER = /[A-Za-z]/;
const ENTITY = /&[a-zA-Z0-9#]+;/g;
const URL = /^https?:\/\//;

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

/* Symbol-only interface strings the letter test already lets through. */
const ALLOWED = new Set(['--:--', '×', '·', '%']);

/* A template with expressions is dynamic: the copy is split around the value
 * and the rule cannot see it whole, so it is left alone. */
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

/* A call is trusted whole, so a label prop may hold `cond ? t('a') : t('b')`
 * while a plain `cond ? 'Pause' : 'Play'` is still caught. */
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
        /* JSXAttribute handles an attribute's own container. */
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
