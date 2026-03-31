import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parse, specificity, compareSpecificity, stringify } from '../src/index.js';

describe('Parsing rules', () => {
  it('should parse simple rule', () => {
    const ast = parse('body { color: red; }');
    assert.equal(ast.rules.length, 1);
    assert.deepEqual(ast.rules[0].selectors, ['body']);
    assert.equal(ast.rules[0].declarations[0].property, 'color');
    assert.equal(ast.rules[0].declarations[0].value, 'red');
  });
  it('should parse multiple declarations', () => {
    const ast = parse('h1 { color: blue; font-size: 20px; }');
    assert.equal(ast.rules[0].declarations.length, 2);
  });
  it('should parse multiple selectors', () => {
    const ast = parse('h1, h2, h3 { margin: 0; }');
    assert.deepEqual(ast.rules[0].selectors, ['h1', 'h2', 'h3']);
  });
  it('should parse !important', () => {
    const ast = parse('.cls { color: red !important; }');
    assert.equal(ast.rules[0].declarations[0].important, true);
  });
  it('should parse multiple rules', () => {
    const ast = parse('a { color: blue; } p { margin: 10px; }');
    assert.equal(ast.rules.length, 2);
  });
  it('should skip comments', () => {
    const ast = parse('/* comment */ body { color: red; }');
    assert.equal(ast.rules.length, 1);
  });
});

describe('Media queries', () => {
  it('should parse @media', () => {
    const ast = parse('@media (max-width: 600px) { body { font-size: 14px; } }');
    assert.equal(ast.rules[0].type, 'media');
    assert.equal(ast.rules[0].query, '(max-width: 600px)');
    assert.equal(ast.rules[0].rules.length, 1);
  });
});

describe('@import', () => {
  it('should parse @import', () => {
    const ast = parse('@import url("style.css");');
    assert.equal(ast.rules[0].type, 'import');
    assert.ok(ast.rules[0].value.includes('style.css'));
  });
});

describe('Specificity', () => {
  it('should calculate element', () => {
    assert.deepEqual(specificity('p'), [0, 0, 0, 1]);
  });
  it('should calculate class', () => {
    assert.deepEqual(specificity('.class'), [0, 0, 1, 0]);
  });
  it('should calculate id', () => {
    assert.deepEqual(specificity('#id'), [0, 1, 0, 0]);
  });
  it('should calculate complex', () => {
    const s = specificity('#nav .item a');
    assert.equal(s[1], 1); // 1 id
    assert.equal(s[2], 1); // 1 class
    assert.equal(s[3], 1); // 1 element
  });
  it('should compare specificities', () => {
    assert.ok(compareSpecificity(specificity('#id'), specificity('.class')) > 0);
    assert.ok(compareSpecificity(specificity('.class'), specificity('p')) > 0);
  });
});

describe('Stringify', () => {
  it('should convert AST back to CSS', () => {
    const ast = parse('body { color: red; font-size: 16px; }');
    const css = stringify(ast);
    assert.ok(css.includes('body'));
    assert.ok(css.includes('color: red'));
    assert.ok(css.includes('font-size: 16px'));
  });
});

describe('Complex CSS', () => {
  it('should parse real-world CSS', () => {
    const css = `
      /* Reset */
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: sans-serif; line-height: 1.6; }
      .container { max-width: 1200px; margin: 0 auto; }
      @media (max-width: 768px) { .container { padding: 0 1rem; } }
    `;
    const ast = parse(css);
    assert.equal(ast.rules.length, 4);
    assert.equal(ast.rules[3].type, 'media');
  });
});
