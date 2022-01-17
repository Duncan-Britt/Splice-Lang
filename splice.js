// Syntax Rules
// - binding: << [name] >>
// - op: <<~ [name] [arg] [arg2] [arg3] [...] >>
//         [body]
//       << end >>
// - arg: ( binding | 'text )
// - non-arg text: anything else

// Splice.compile :: String="#template"
const Splice = (function() {
  // SPLICE ENGINE - PARSER
  // ======================

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
    //   - type, name, chain
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
    } else if (token = textChunk(template)) {
      ast.push({type: 'text', value: token});
    } else {
      token = template;
      ast.push({type: 'text', value: token});
    }

    return template.slice(token.length);
  }

  function textChunk(template) {
    const match = template.match(/^[\S\s]+?(?=<<)/);
    return match ? match[0] : false;
  }

  // parseFunction :: String -> Array{String, Object}
  function parseFunction(template) {
    let tokens = '';

    let [ token, op ] = template.match(/<<~\s*(\w+)/);
    tokens += token;
    template = template.slice(token.length);

    [ token ] = template.match(/(\s+'?[\w.$]+)+\s*?>>/);
    let args = token.match(/'?[\w.$]+/g);
    tokens += token;
    template = template.slice(token.length);

    [ token, bodyAST ] = parseBody(template);
    tokens += token;

    args = args.map(str => {
      if (str[0] == "'") {
        return {type: 'text', value: str};
      }

      let arr = str.split('.');
      const name = arr[0];
      const chain = arr.slice(1);
      return {type: 'binding', name, chain};
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
    let [ token, str ] = template.match(/<<\s*([\w\.\$]+)\s*>>/);
    let arr = str.split('.');
    const name = arr[0];
    const chain = arr.slice(1);
    return [token, {type: 'binding', name, chain }];
  }

  // SPLICE ENGINE - EVALUATOR
  // =========================

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
        return expr.chain.reduce((data, prop) => data[prop], scope[expr.name]);
      case 'text':
        return expr.value;
      default:
        throw "Invalid Node Type in AST";
    }
  }

  // IN-TEMPLATE HELPER FUNCTIONS
  // ============================

  // Namespace for partial templates
  const partials = Object.create(null);

  // Namespace for In-Template Functions
  const templateFns = Object.create(null);

  // if :: Object, Object, Array{Object} -> String
  templateFns.if = (scope, expr, body) => {
    const innerScope = Object.assign({}, scope);
    return evaluate(expr, innerScope) ? evaluateAll(body, innerScope) : '';
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
        scope[alias.value.slice(1)] = (
        expr.chain.reduce((data, prop) => data[prop], scope[expr.name]));
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

  // INTERNAL UTILITY FUNCTIONS
  // ==========================

  // replaceNodeWithHtml :: !DOM Node, String
  function replaceNodeWithHTML(node, html) {
    const tempContainer = document.createElement('div');
    tempContainer.innerHTML = html;
    const newNodes = Array.from(tempContainer.childNodes);
    const parent = node.parentNode;
    let lastNode = newNodes[newNodes.length - 1];
    parent.replaceChild(lastNode, node);
    for (let i = newNodes.length - 2; i >= 0; --i) {
      parent.insertBefore(newNodes[i], lastNode);
      lastNode = newNodes[i];
    }
  }

  // PUBLIC INTERFACE
  // ================
  return {
    // Splice.render :: Object, String="#template"
    render(scope, selector="#template") {
      const templateElement = document.querySelector(selector);
      const template = templateElement.innerHTML;
      const ast = parse(template);
      const html = evaluateAll(ast, scope);
      replaceNodeWithHTML(templateElement, html);
    },

    // Splice.compile :: String -> [Object] -> String
    compile(template) {
      const ast = parse(template);
      return scope => evaluateAll(ast, scope);
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
  outest: [
    [
      [
        {title: 'Introduction', id: 'introduction'},
        {title: 'Simple Expressions', id: 'simple_expressions'},
        {title: 'Installation', id: 'installation'},
        {title: 'Partials', id: 'partials'},
      ],
    ],
  ],
};
