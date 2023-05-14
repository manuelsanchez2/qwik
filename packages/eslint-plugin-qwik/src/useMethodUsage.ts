/* eslint-disable no-console */
import type { Rule } from 'eslint';
import type { CallExpression } from 'estree';
import type { QwikEslintExamples } from '../examples';

export const useMethodUsage: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Object destructuring is not recommended for component$',
      category: 'Variables',
      recommended: true,
      url: 'https://qwik.builder.io/docs/advanced/eslint/#use-method-usage',
    },
    messages: {
      'use-after-await': 'Calling use* methods after await is not safe.',
      'use-wrong-function': 'Calling use* methods in wrong function.',
      'use-not-root': 'Calling use* methods in non-root component.',
    },
  },
  create(context) {
    const modifyJsxSource = context
      .getSourceCode()
      .getAllComments()
      .some((c) => c.value.includes('@jsxImportSource'));
    if (modifyJsxSource) {
      return {};
    }
    const stack: { await: boolean }[] = [];
    return {
      ArrowFunctionExpression() {
        stack.push({ await: false });
      },
      'ArrowFunctionExpression:exit'(d) {
        stack.pop();
      },
      AwaitExpression() {
        const last = stack[stack.length - 1];
        if (last) {
          last.await = true;
        }
      },
      'CallExpression[callee.name=/^use[A-Z]/]'(node: CallExpression & Rule.NodeParentExtension) {
        const last = stack[stack.length - 1];
        if (last && last.await) {
          context.report({
            node,
            messageId: 'use-after-await',
          });
        }
        let parent = node as Rule.Node;
        while ((parent = parent.parent)) {
          const type = parent.type;
          switch (type) {
            case 'VariableDeclarator':
            case 'VariableDeclaration':
            case 'ExpressionStatement':
            case 'MemberExpression':
            case 'BinaryExpression':
            case 'UnaryExpression':
            case 'ReturnStatement':
            case 'BlockStatement':
            case 'ChainExpression':
            case 'Property':
            case 'ObjectExpression':
            case 'CallExpression':
              break;
            case 'ArrowFunctionExpression':
            case 'FunctionExpression':
              if (parent.parent.type === 'VariableDeclarator') {
                if (
                  parent.parent.id?.type === 'Identifier' &&
                  parent.parent.id.name.startsWith('use')
                ) {
                  return;
                }
              }
              if (parent.parent.type === 'CallExpression') {
                if (
                  parent.parent.callee.type === 'Identifier' &&
                  parent.parent.callee.name === 'component$'
                ) {
                  return;
                }
              }
              context.report({
                node,
                messageId: 'use-wrong-function',
              });
              return;
            case 'FunctionDeclaration':
              if (!parent.id?.name.startsWith('use')) {
                context.report({
                  node,
                  messageId: 'use-wrong-function',
                });
              }
              return;
            default:
              context.report({
                node,
                messageId: 'use-not-root',
              });
              return;
            // ERROR
          }
        }
      },
    };
  },
};

const useAfterAwaitGood = `
export const HelloWorld = component$(async () => {
  useMethod();
  await something();
  return $(() => {
    return (
      <div>
        {prop}
      </div>
    );
  });
});`.trim();

const useAfterAwaitBad = `
export const HelloWorld = component$(async () => {
  await something();
  useMethod();
  return $(() => {
    return (
      <div>
        {prop}
      </div>
    );
  });
});`.trim();

const useAfterAwaitBad2 = `
export const HelloWorld = component$(async () => {
  if (stuff) {
    await something();
  }
  useMethod();
  return $(() => {
    return (
      <div>
        {prop}
      </div>
    );
  });
});`.trim();

const useWrongFunctionGood = `
export const Counter = component$(async () => {
  const count = useSignal(0);
});
`.trim();

const useWrongFunctionBad = `
export const Counter = (async () => {
  const count = useSignal(0);
});
`.trim();

const useWrongFunctionBad2 = `
export const Counter = (() => {
  const count = useSignal(0);
});
`.trim();

const useNotRootGood = useWrongFunctionGood;
const useNotRootBad = useWrongFunctionBad;
const useNotRootBad2 = useWrongFunctionBad2;

export const useMethodUsageExamples: QwikEslintExamples = {
  'use-after-await': {
    good: [
      {
        codeHighlight: '{2-3} /await/',
        code: useAfterAwaitGood,
      },
    ],
    bad: [
      {
        codeHighlight: '{2-3} /await/',
        code: useAfterAwaitBad,
      },
      {
        codeHighlight: '{3,5} /await/',
        code: useAfterAwaitBad2,
      },
    ],
  },
  'use-wrong-function': {
    good: [
      {
        codeHighlight: '{2} /component$/',
        code: useWrongFunctionGood,
      },
    ],
    bad: [
      {
        codeHighlight: '{2} /component$/',
        code: useWrongFunctionBad,
      },
      {
        codeHighlight: '{2} /component$/',
        code: useWrongFunctionBad2,
      },
    ],
  },
  'use-not-root': {
    good: [
      {
        codeHighlight: '{2} /component$/',
        code: useNotRootGood,
      },
    ],
    bad: [
      {
        codeHighlight: '{2} /component$/',
        code: useNotRootBad,
      },
      {
        codeHighlight: '{2} /component$/',
        code: useNotRootBad2,
      },
    ],
  },
};
