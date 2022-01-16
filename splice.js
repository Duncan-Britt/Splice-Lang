// Syntax Rules
// - binding: << [name] >>
// - op: <<~ [name] [arg] [arg2] [arg3] [...] >>
//         [body]
//       << end >>
// - arg: ( binding | 'text )
// - non-arg text: anything else

// Splice.compile :: String="#template"
const Splice = (function() {
  // parse :: String -> Array{Object}
  function parse(template) {
    const ast = [];

    while (template) {
      template = parseToken(template, ast);
    }

    // Abstract Syntax Tree Node Types:
    // - text
    //   - type, value
    // - binding
    //   - type, name
    // - arg
    //   - type, name
    // - op
    //   - type, name, args[], body(AST)
    return ast;
  }

  // parseToken :: String, !Array{Object} -> String
  function parseToken(template, ast) {
    let token, match, expr;
    if (match = template.match(/^<</)) {
      if (template[2] == '~') {
        [ token, expr ] = parseFunction(template);
        ast.push(expr);
      } else {
        [ token, expr ] = parseBinding(template);
        ast.push(expr);
      }
    } else if (match = template.match(/^((.|\s)+?)(?=<<)/)) {
      token = match[1];
      ast.push({type: 'text', value: token});
    } else {
      token = template;
      ast.push({type: 'text', value: token});
    }

    return template.slice(token.length);
  }

  // parseFunction :: String -> Array{String, Object}
  function parseFunction(template) {
    let tokens = '';

    let [ token, op ] = template.match(/<<~\s*(\w+)/);
    tokens += token;
    template = template.slice(token.length);

    [ token ] = template.match(/(\s+'?\w+)+\s*?>>/);
    let args = token.match(/'?\w+/g);
    tokens += token;
    template = template.slice(token.length);

    [ token, bodyAST ] = parseBody(template);
    tokens += token;

    args = args.map(str => {
      if (str[0] == "'") {
        return {type: 'text', value: str};
      }

      return {type: 'binding', name: str};
    });

    const expr = {
      type: 'op',
      name: op,
      args: args,
      body: bodyAST,
    };

    return [tokens, expr];
  }

  // parseBody :: String -> Array{String, Array{Object}}
  function parseBody(template) {
    let resultToken = '';
    let body = '';
    let count = 1;

    while (count != 0) {
      let [ token ] = template.match(/(.|\s)*?<<.*?>>/);

      if (token.match(/<<~/)) {
        count++;
      } else if (token.match(/<<\s*end\s*>>/)) {
        count--;
      }

      if (count == 0) {
        body = resultToken + token.match(/(\s|.)*(?=<<\s*end)/)[0];
      }
      resultToken += token;
      template = template.slice(token.length);
    }

    return [resultToken, parse(body)];
  }

  // parseBinding :: String -> Array{String, Object}
  function parseBinding(template) {
    let [ token, name ] = template.match(/<<\s*(\w+|\$)\s*>>/);
    return [token, {type: 'binding', name: name }];
  }

  // evaluateAll :: Array, Object -> String
  function evaluateAll(ast, scope) {
    return ast.reduce((html, expr) => html + evaluate(expr, scope), "");
  }

  // evaluate :: Object, Object -> String
  function evaluate(expr, scope) {
    switch (expr.type) {
      case "op":
        return templateFns[expr.name](scope, ...expr.args, expr.body);
      case "binding":
        return scope[expr.name];
      case 'text':
        return expr.value;
      default:
        throw "Invalid Node Type in AST";
    }
  }

  // Namespace for partial templates
  const partials = Object.create(null);

  // Namespace for In-Template Functions
  const templateFns = Object.create(null);

  // if :: Object, Object, Array{Object} -> String
  templateFns.if = (scope, expr, body) => {
    return evaluate(expr, scope) ? evaluateAll(body, scope) : '';
  };

  // each :: Object, Object, Array{Object} -> String
  //      :: Object, Object, Object, Object, Array{Object} -> String
  templateFns.each = (scope, expr, as, alias, body) => {
    if (!body && as) {
      body = as;
      as = null;
      alias = null;
    }

    return evaluate(expr, scope).reduce((html, item) => {
      const innerScope = Object.assign({}, scope);
      if (alias) {
        innerScope[alias.value.slice(1)] = item
      }

      innerScope.$ = item;
      return html + evaluateAll(body, innerScope);
    }, '');
  };

  // def :: !Object, Object, Object
  templateFns.def = (scope, alias, expr) => {
    switch (expr.type) {
      case 'binding':
        scope[alias.value.slice(1)] = scope[expr.name];
        break;
      case 'text':
        scope[alias.value.slice(1)] = expr.value.slice(1);
        break;
      default:
        throw new SyntaxError('Unexpected');
    }
    return '';
  };

// partial :: Object, Array{Object} -> String
  templateFns.partial = (scope, expr) => {
    return evaluateAll(partials[expr.name], scope);
  }

  return {
// Splice.compile :: String="#template"
    compile(scope, selector="#template") {
      const templateElement = document.querySelector(selector);
      const template = templateElement.innerHTML;
      const html = evaluateAll(parse(template), scope);
      templateElement.previousElementSibling.insertAdjacentHTML('afterend', html);
    },

// Splice.registerPartial :: String, String
    registerPartial(id) {
      const templateElement = document.getElementById(id);
      const template = templateElement.innerHTML;
      partials[id] = parse(template);
    },
  };
}());

const testScope = {
  todoItems: ["Get Groceries", "Run Errands", "Go to Sleep"],
  isHungry: true,
  snacks: ['Crépe', 'Sandwich', 'Latté'],
};

Splice.registerPartial("article");
Splice.compile(testScope);
