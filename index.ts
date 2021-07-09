import { parse } from '@babel/parser';
import traverse, { NodePath } from '@babel/traverse';

const checkMap = {
  ArrowFunctionExpression: '箭头函数',
  VariableDeclaration: 'const、let变量',
  AwaitExpression: 'await表达式',
  YieldExpression: 'Yield表达式',
  ClassDeclaration: 'class定义',
  AsyncFunction: 'async函数',
  TemplateElement: '模版字符串',
  SpreadElement: '拓展运算符',
  RestElement: 'rest元素',
  ForOfStatement: 'for of遍历方式',
};

type CheckType = keyof typeof checkMap;

interface CheckBin {
  type: CheckType;
  name: string;
  kind?: string;
  code: string;
  pos: number;
}

interface Options {
  /** 最多统计几个结果 默认2 */
  limit?: number;
  /** 代码片段长度限制 默认100 */
  codeFrgmentSize?: number;
}

/**
 * 检测es6语法（注意，这边只检测语法，不检测es6新的API，如Set、Map、Promise、Object.assign、Array.from等）
 * 支持如下常用的es6语法：
 * 箭头函数
 * const、let
 * async、await
 * yield表达式
 * class定义
 * 模版字符串
 * ...拓展运算符
 * ...rest参数等rest元素
 * for of遍历方式
 *
 */

const esChecker = (code: string, options?: Options): CheckBin[] => {
  const { limit = 2, codeFrgmentSize = 100 } = options || {};

  const result: CheckBin[] = [];

  const report = (params: {
    type: CheckType;
    kind?: string;
    n: NodePath<any>;
  }) => {
    if (result.length >= limit) return;
    const { type, kind = '', n } = params;
    const node = n.node;
    const start = node.start;
    const end = node.end;
    const content =
      typeof start === 'number' && typeof end === 'number'
        ? end - start <= codeFrgmentSize
          ? code.slice(start, end)
          : code.slice(start, start + codeFrgmentSize)
        : '';

    result.push({
      type,
      name: checkMap[type],
      kind,
      code: content,
      pos: typeof start === 'number' ? start : -1,
    });
  };

  const ast = parse(code);

  traverse(ast, {
    ArrowFunctionExpression: (n) => {
      report({ type: 'ArrowFunctionExpression', n });
    },
    VariableDeclaration: (nodePath) => {
      const kind = nodePath.node.kind;
      if (kind === 'const' || kind === 'let') {
        report({ type: 'VariableDeclaration', kind, n: nodePath });
      }
    },
    AwaitExpression: (n) => report({ type: 'AwaitExpression', n }),
    YieldExpression: (n) => report({ type: 'YieldExpression', n }),
    ClassDeclaration: (n) => report({ type: 'ClassDeclaration', n }),
    FunctionDeclaration: (nodePath) => {
      const async = nodePath.node.async;
      if (async) report({ type: 'AsyncFunction', n: nodePath });
    },
    SpreadElement: (n) => report({ type: 'SpreadElement', n }),
    RestElement: (n) => report({ type: 'RestElement', n }),
    ForOfStatement: (n) => report({ type: 'ForOfStatement', n }),
    TemplateElement: (n) => report({ type: 'TemplateElement', n }),
  });
  return result;
};

export { esChecker }

/*
相关es6语法类型信息：

https://github.com/babel/babylon/blob/master/ast/spec.md
https://babeljs.io/docs/en/babel-types

  interface VariableDeclaration <: Declaration {
    type: "VariableDeclaration";
    declarations: [ VariableDeclarator ];
    kind: "var" | "let" | "const";
  }

  Expressions:
  interface Super <: Node {
      type: "Super";
  }
  interface ArrowFunctionExpression <: Function, Expression {
    type: "ArrowFunctionExpression";
    body: BlockStatement | Expression;
    expression: boolean;
  }
  interface YieldExpression <: Expression {
    type: "YieldExpression";
    argument: Expression | null;
    delegate: boolean;
  }
  interface AwaitExpression <: Expression {
    type: "AwaitExpression";
    argument: Expression | null;
  }
  interface Function <: Node {
    id: Identifier | null;
    params: [ Pattern ];
    body: BlockStatement;
    generator: boolean;
    async: boolean;
  }

  interface SpreadElement <: Node {
    type: "SpreadElement";
    argument: Expression;
  }
  interface RestElement <: Pattern {
    type: "RestElement";
    argument: Pattern;
  }
  interface Class <: Node {
    id: Identifier | null;
    superClass: Expression | null;
    body: ClassBody;
    decorators: [ Decorator ];
  }

*/
