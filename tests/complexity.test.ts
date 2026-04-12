import { describe, it, expect } from 'vitest';
import { extractFunctions } from '../src/complexity';

function cc(source: string): number {
  const fns = extractFunctions(source);
  if (fns.length === 0) throw new Error('No functions found');
  return fns[0].complexity;
}

describe('cyclomatic complexity', () => {
  describe('baseline', () => {
    it('empty function is 1', () => {
      expect(cc('function f() {}')).toBe(1);
    });

    it('empty arrow function is 1', () => {
      expect(cc('const f = () => {};')).toBe(1);
    });

    it('expression arrow function is 1', () => {
      expect(cc('const f = (x: number) => x * 2;')).toBe(1);
    });
  });

  describe('if statements', () => {
    it('if adds 1', () => {
      expect(cc('function f(x: number) { if (x > 0) return 1; return 0; }')).toBe(2);
    });

    it('else does not add', () => {
      expect(cc('function f(x: number) { if (x > 0) return 1; else return 0; }')).toBe(2);
    });

    it('else if adds 1', () => {
      expect(
        cc('function f(x: number) { if (x > 0) return 1; else if (x < 0) return -1; return 0; }'),
      ).toBe(3);
    });

    it('ternary adds 1', () => {
      expect(cc('function f(x: number) { return x > 0 ? 1 : 0; }')).toBe(2);
    });
  });

  describe('loops', () => {
    it('for loop adds 1', () => {
      expect(cc('function f() { for (let i = 0; i < 10; i++) {} }')).toBe(2);
    });

    it('for...of adds 1', () => {
      expect(cc('function f(arr: number[]) { for (const x of arr) {} }')).toBe(2);
    });

    it('for...in adds 1', () => {
      expect(cc('function f(obj: object) { for (const k in obj) {} }')).toBe(2);
    });

    it('while adds 1', () => {
      expect(cc('function f() { while (true) {} }')).toBe(2);
    });

    it('do...while adds 1', () => {
      expect(cc('function f() { do {} while (true); }')).toBe(2);
    });
  });

  describe('try/catch', () => {
    it('catch clause adds 1', () => {
      expect(cc('function f() { try {} catch (e) {} }')).toBe(2);
    });

    it('two catch clauses add 2', () => {
      // TypeScript doesn't allow multiple catch clauses, but try/finally = 1
      // One try/catch/finally still has one catch
      expect(cc('function f() { try {} catch (e) {} finally {} }')).toBe(2);
    });
  });

  describe('switch', () => {
    it('each case adds 1, default does not', () => {
      expect(
        cc('function f(x: number) { switch (x) { case 1: break; case 2: break; default: break; } }'),
      ).toBe(3);
    });

    it('single case adds 1', () => {
      expect(cc('function f(x: number) { switch (x) { case 1: break; } }')).toBe(2);
    });

    it('default only adds 0', () => {
      expect(cc('function f(x: number) { switch (x) { default: break; } }')).toBe(1);
    });
  });

  describe('logical operators', () => {
    it('&& adds 1', () => {
      expect(cc('function f(a: boolean, b: boolean) { return a && b; }')).toBe(2);
    });

    it('|| adds 1', () => {
      expect(cc('function f(a: boolean, b: boolean) { return a || b; }')).toBe(2);
    });

    it('?? adds 1', () => {
      expect(cc('function f(x: string | null) { return x ?? "default"; }')).toBe(2);
    });

    it('a && b && c adds 2', () => {
      expect(
        cc('function f(a: boolean, b: boolean, c: boolean) { return a && b && c; }'),
      ).toBe(3);
    });

    it('a || b || c adds 2', () => {
      expect(
        cc('function f(a: boolean, b: boolean, c: boolean) { return a || b || c; }'),
      ).toBe(3);
    });
  });

  describe('nested functions', () => {
    it('nested function does not add to parent CC', () => {
      expect(
        cc('function outer() { function inner() { if (true) {} } }'),
      ).toBe(1);
    });

    it('nested arrow function does not add to parent CC', () => {
      expect(
        cc('function outer() { const inner = () => { if (true) {} }; }'),
      ).toBe(1);
    });

    it('nested function has its own CC', () => {
      const fns = extractFunctions('function outer() {}\nfunction inner() { if (true) {} }');
      expect(fns).toHaveLength(2);
      expect(fns.find(f => f.name === 'outer')?.complexity).toBe(1);
      expect(fns.find(f => f.name === 'inner')?.complexity).toBe(2);
    });
  });

  describe('combined', () => {
    it('multiple decision points add up', () => {
      expect(
        cc(`function f(x: number, arr: number[]) {
  if (x > 0) {
    for (const n of arr) {
      if (n > x) return n;
    }
  }
  return 0;
}`),
      ).toBe(4);
    });
  });
});

describe('extractFunctions', () => {
  it('extracts top-level function declaration', () => {
    const fns = extractFunctions('function foo() {}');
    expect(fns).toHaveLength(1);
    expect(fns[0].name).toBe('foo');
  });

  it('extracts arrow function assigned to variable', () => {
    const fns = extractFunctions('const foo = () => {};');
    expect(fns).toHaveLength(1);
    expect(fns[0].name).toBe('foo');
  });

  it('extracts function expression assigned to variable', () => {
    const fns = extractFunctions('const foo = function() {};');
    expect(fns).toHaveLength(1);
    expect(fns[0].name).toBe('foo');
  });

  it('extracts class methods as ClassName.methodName', () => {
    const fns = extractFunctions('class Foo { bar() {} baz() {} }');
    expect(fns.map(f => f.name)).toEqual(['Foo.bar', 'Foo.baz']);
  });

  it('extracts constructor as ClassName.constructor', () => {
    const fns = extractFunctions('class Foo { constructor() {} }');
    expect(fns).toHaveLength(1);
    expect(fns[0].name).toBe('Foo.constructor');
  });

  it('extracts static methods', () => {
    const fns = extractFunctions('class Foo { static bar() {} }');
    expect(fns).toHaveLength(1);
    expect(fns[0].name).toBe('Foo.bar');
  });

  it('extracts getter and setter', () => {
    const fns = extractFunctions('class Foo { get val() { return 1; } set val(v: number) {} }');
    const names = fns.map(f => f.name);
    expect(names).toContain('Foo.val');
  });

  it('ignores anonymous functions not assigned to variables', () => {
    const fns = extractFunctions('export default function() {}');
    // anonymous default export — no name, not extracted
    expect(fns).toHaveLength(0);
  });

  describe('object literal methods', () => {
    it('extracts simple method from object literal', () => {
      const fns = extractFunctions('const api = { getUser() { return 1; } };');
      expect(fns).toHaveLength(1);
      expect(fns[0].name).toBe('api.getUser');
      expect(fns[0].complexity).toBe(1);
    });

    it('extracts getter from object literal', () => {
      const fns = extractFunctions("const obj = { get name() { return 'x'; } };");
      expect(fns).toHaveLength(1);
      expect(fns[0].name).toBe('obj.name');
    });

    it('extracts setter from object literal', () => {
      const fns = extractFunctions('const obj = { set name(v: string) { } };');
      expect(fns).toHaveLength(1);
      expect(fns[0].name).toBe('obj.name');
    });

    it('extracts method with string-literal key using bracket notation', () => {
      const fns = extractFunctions("const obj = { 'my-method'() { return 1; } };");
      expect(fns).toHaveLength(1);
      expect(fns[0].name).toBe("obj['my-method']");
    });

    it('skips computed property names', () => {
      const fns = extractFunctions('const obj = { [Symbol.iterator]() { return 1; } };');
      expect(fns).toHaveLength(0);
    });

    it('extracts only top-level object methods, not nested objects', () => {
      const code = `const outer = {
        method() { return 1; },
        inner: {
          nested() { return 2; },
        },
      };`;
      const fns = extractFunctions(code);
      expect(fns).toHaveLength(1);
      expect(fns[0].name).toBe('outer.method');
    });

    it('returns no functions for empty object', () => {
      const fns = extractFunctions('const obj = {};');
      expect(fns).toHaveLength(0);
    });

    it('extracts multiple methods from one object', () => {
      const code = `const api = {
        getUser() { return 1; },
        getPost() { if (true) return 2; return 3; },
      };`;
      const fns = extractFunctions(code);
      expect(fns).toHaveLength(2);
      expect(fns[0].name).toBe('api.getUser');
      expect(fns[0].complexity).toBe(1);
      expect(fns[1].name).toBe('api.getPost');
      expect(fns[1].complexity).toBe(2);
    });

    it('works with exported object literals', () => {
      const fns = extractFunctions('export const api = { getUser() { return 1; } };');
      expect(fns).toHaveLength(1);
      expect(fns[0].name).toBe('api.getUser');
    });
  });

  it('records correct start and end lines', () => {
    const src = `function foo() {\n  return 1;\n}`;
    const fns = extractFunctions(src);
    expect(fns[0].startLine).toBe(1);
    expect(fns[0].endLine).toBe(3);
  });

  it('extracts multiple top-level functions', () => {
    const src = 'function a() {}\nfunction b() {}\nfunction c() {}';
    const fns = extractFunctions(src);
    expect(fns.map(f => f.name)).toEqual(['a', 'b', 'c']);
  });
});
