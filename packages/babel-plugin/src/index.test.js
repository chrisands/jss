import * as babel7 from '@babel/core'
import {stripIndent} from 'common-tags'
import {sheets} from 'jss'
import plugin from './index'

const createGenerateClassName = () => rule => `${rule.key}-id`

const transform = (source, pluginOptions) => {
  const plugins = [[plugin, {jssOptions: {createGenerateClassName}, ...pluginOptions}]]
  const {code} = babel7.transform(source, {ast: true, plugins})
  return code
}

describe('index', () => {
  beforeEach(() => {
    sheets.reset()
  })

  test('support default createStyleSheet identifier', () => {
    const before = stripIndent`
      createStyleSheet({
        a: {
          color: 'red'
        }
      });
    `
    const after = stripIndent`
      createStyleSheet({
        "@raw": ".a-id {\\n  color: red;\\n}"
      }, {
        "classes": {
          "a": "a-id"
        }
      });
    `
    expect(transform(before)).toBe(after)
  })

  test('accept custom identifier names over configuration', () => {
    const before = stripIndent`
      xyz({
        a: {
          color: 'red'
        }
      });
    `
    const after = stripIndent`
      xyz({
        "@raw": ".a-id {\\n  color: red;\\n}"
      }, {
        "classes": {
          "a": "a-id"
        }
      });
    `
    expect(transform(before, {identifiers: ['xyz']})).toBe(after)
  })

  test('extract static rule, dynamic rule is an arrow function', () => {
    const before = stripIndent`
      createStyleSheet({
        a: {
          color: 'red'
        },
        b: {
          color: () => {}
        }
      });
    `
    const after = stripIndent`
      createStyleSheet({
        "@raw": ".a-id {\\n  color: red;\\n}",
        b: {
          color: () => {}
        }
      }, {
        "classes": {
          "a": "a-id",
          "b": "b-id"
        }
      });
    `
    expect(transform(before)).toBe(after)
  })

  test('extract static rule, dynamic rule is a function', () => {
    const before = stripIndent`
      createStyleSheet({
        a: {
          color: 'red'
        },
        b: {
          color: function () {}
        }
      });
    `
    const after = stripIndent`
      createStyleSheet({
        "@raw": ".a-id {\\n  color: red;\\n}",
        b: {
          color: function () {}
        }
      }, {
        "classes": {
          "a": "a-id",
          "b": "b-id"
        }
      });
    `
    expect(transform(before)).toBe(after)
  })

  test('extract static rule, dynamic rule is a ref', () => {
    const before = stripIndent`
      function f() {}

      createStyleSheet({
        a: {
          color: 'red'
        },
        b: {
          color: f
        }
      });
    `
    const after = stripIndent`
      function f() {}

      createStyleSheet({
        "@raw": ".a-id {\\n  color: red;\\n}",
        b: {
          color: f
        }
      }, {
        "classes": {
          "a": "a-id",
          "b": "b-id"
        }
      });
    `
    expect(transform(before)).toBe(after)
  })

  test('accept call without arguments', () => {
    const code = `createStyleSheet();`
    expect(transform(code)).toBe(code)
  })

  test('accept null as styles argument', () => {
    const code = `createStyleSheet(null);`
    expect(transform(code)).toBe(code)
  })

  test('accept undefined as styles argument', () => {
    const code = `createStyleSheet(undefined);`
    expect(transform(code)).toBe(code)
  })

  test('accept jss.setup options over configuration', () => {
    let called
    const onProcessSheet = () => {
      called = true
    }
    const jssOptions = {plugins: [{onProcessSheet}]}
    transform('createStyleSheet({})', {jssOptions})
    expect(called).toBe(true)
  })

  test('support property identifier', () => {
    const before = stripIndent`
      const prop = 'a'
      createStyleSheet({
        [prop]: {
          color: 'red'
        }
      });
    `
    const after = stripIndent`
      const prop = 'a';
      createStyleSheet({
        "@raw": ".a-id {\\n  color: red;\\n}"
      }, {
        "classes": {
          "a": "a-id"
        }
      });
    `
    expect(transform(before)).toBe(after)
  })

  test('support numeric value', () => {
    const before = stripIndent`
      createStyleSheet({
        a: {
          width: 0
        }
      });
    `
    const after = stripIndent`
      createStyleSheet({
        "@raw": ".a-id {\\n  width: 0;\\n}"
      }, {
        "classes": {
          "a": "a-id"
        }
      });
    `
    expect(transform(before)).toBe(after)
  })

  test('support array value', () => {
    const before = stripIndent`
      createStyleSheet({
        a: {
          x: [0, 1]
        }
      });
    `
    const after = stripIndent`
      createStyleSheet({
        "@raw": ".a-id {\\n  x: 0, 1;\\n}"
      }, {
        "classes": {
          "a": "a-id"
        }
      });
    `
    expect(transform(before)).toBe(after)
  })

  test('support array in array value', () => {
    const before = stripIndent`
      createStyleSheet({
        a: {
          x: [[0, 1]]
        }
      });
    `
    const after = stripIndent`
      createStyleSheet({
        "@raw": ".a-id {\\n  x: 0 1;\\n}"
      }, {
        "classes": {
          "a": "a-id"
        }
      });
    `
    expect(transform(before)).toBe(after)
  })

  test('extract static properties from mixed rules', () => {
    const before = stripIndent`
      createStyleSheet({
        a: {
          color: 'red',
          width: () => {}
        }
      });
    `
    const after = stripIndent`
      createStyleSheet({
        "@raw": ".a-id {\\n  color: red;\\n}",
        a: {
          width: () => {}
        }
      }, {
        "classes": {
          "a": "a-id"
        }
      });
    `
    expect(transform(before)).toBe(after)
  })

  test('support multiple calls', () => {
    const before = stripIndent`
      createStyleSheet({
        a: {
          color: 'red'
        }
      });
      createStyleSheet({
        a: {
          color: 'red'
        }
      });
    `
    const after = stripIndent`
      createStyleSheet({
        "@raw": ".a-id {\\n  color: red;\\n}"
      }, {
        "classes": {
          "a": "a-id"
        }
      });
      createStyleSheet({
        "@raw": ".a-id {\\n  color: red;\\n}"
      }, {
        "classes": {
          "a": "a-id"
        }
      });
    `
    expect(transform(before)).toBe(after)
  })

  test('resolve styles ref', () => {
    const before = stripIndent`
      const styles = {
        a: {
          color: 'red'
        }
      };
      createStyleSheet(styles);
    `
    const after = stripIndent`
      const styles = {
        "@raw": ".a-id {\\n  color: red;\\n}"
      };
      createStyleSheet(styles, {
        "classes": {
          "a": "a-id"
        }
      });
    `
    expect(transform(before)).toBe(after)
  })

  test('extract styles with nested references', () => {
    const before = stripIndent`
      const color = 'red';
      const a = {
        color: color
      };
      const styles = {
        a: a
      };
      createStyleSheet(styles);
    `
    const after = stripIndent`
      const color = 'red';
      const a = {
        color: color
      };
      const styles = {
        "@raw": ".a-id {\\n  color: red;\\n}"
      };
      createStyleSheet(styles, {
        "classes": {
          "a": "a-id"
        }
      });
    `
    expect(transform(before)).toBe(after)
  })

  test('extend options object literal', () => {
    const before = stripIndent`
      createStyleSheet({
        a: {
          width: 0
        }
      }, {a: 1});
    `
    const after = stripIndent`
      createStyleSheet({
        "@raw": ".a-id {\\n  width: 0;\\n}"
      }, {
        a: 1,
        "classes": {
          "a": "a-id"
        }
      });
    `
    expect(transform(before)).toBe(after)
  })

  test('extend options object ref', () => {})

  test('make sure identifier is imported from a specific package', () => {})

  test('support configurable package name', () => {})

  test('support styles creator function', () => {})

  test('support theme over babel config as arg', () => {})

  test('resolve refs from a different module', () => {})

  test('handle refs from an external module', () => {})

  test('handle nested refs', () => {})

  test('values as a result of a function call', () => {})
})