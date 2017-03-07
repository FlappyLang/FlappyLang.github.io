/**
 * Created by mihaisandor on 2/27/17.
 */

// Trying to avoid regular expressions here.
function isWhitespace(char) {
  return (char == " ")
    || (char == "\t")
    || (char == "\r")
    || (char == "\n")
    || (char == "\v");
}

function FlappyLexer(text) {
  var position = 0; // Beginning of TEXT.

  this.nextWord = function () {
    if (position >= text.length) return null;
    while (isWhitespace(text.charAt(position))) {
      position++;
      if (position >= text.length) return null;
    }
    var new_pos = position;
    while (!isWhitespace(text.charAt(new_pos))) {
      new_pos++;
      if (new_pos >= text.length) break;
    }
    var collector = text.substring(position, new_pos);
    new_pos++;
    position = new_pos; // Skip the delimiter.
    return collector;
  };

  this.nextCharsUpTo = function (char) {
    if (position >= text.length) return null;
    var new_pos = position;
    while (text.charAt(new_pos) != char) {
      new_pos++;
      if (new_pos >= text.length)
        throw "Unexpected end of input";
    }
    var collector = text.substring(position, new_pos);
    new_pos++;
    position = new_pos; // Skip the delimiter.
    return collector;
  };
}

function Flappy() {
  var dictionary = {};
  var data_stack = [];
  var compile_buffer = [];

  this.stack = data_stack;
  this.immediate = false;

  this.addWords = function (new_dict) {
    for (var word in new_dict)
      dictionary[word.toUpperCase()] = new_dict[word];
  };

  this.define = function (word, code) {
    dictionary[word.toUpperCase()] = code;
  };

  this.run = function (text) {
    this.lexer = new FlappyLexer(text);
    var word;

    while (word = this.lexer.nextWord()) {
      word = this.compile(word);
      if (this.immediate) {
        this.interpret(word);
        this.immediate = false;
      } else if (this.isCompiling()) {
        this.stack.push(word);
      } else {
        this.interpret(word);
      }
    }
  };

  this.compile = function (word) {
    var word = word.toUpperCase();
    var num_val = parseFloat(word);
    if (dictionary[word]) {
      this.immediate = dictionary[word].immediate;
      return dictionary[word];
    } else if (!isNaN(num_val)) {
      return num_val;
    } else {
      throw "Unknown word";
    }
  };

  this.interpret = function (word) {
    if (typeof (word) == 'function') {
      word(this);
    } else {
      this.stack.push(word);
    }
  };

  this.startCompiling = function () {
    this.stack = compile_buffer;
  };

  this.stopCompiling = function () {
    this.stack = data_stack;
  };

  this.isCompiling = function () {
    return this.stack == compile_buffer;
  };
}

var PrintingWords = {
  // Print and discard top of stack.
  "PRINT": function (terp) {
    if (terp.stack.length < 1) throw "Not enough items on stack";
    var tos = terp.stack.pop();
    alert(tos);
  },
  // Print out the contents of the stack.
  "PSTACK": function (terp) {
    alert(terp.stack);
  }
};
// Ensure Forth compatibility.
PrintingWords["."] = PrintingWords["PRINT"];
PrintingWords[".S"] = PrintingWords["PSTACK"];

var MathWords = {
  "+": function (terp) {
    if (terp.stack.length < 2) throw "Not enough items on stack";
    var tos = terp.stack.pop();
    var _2os = terp.stack.pop();
    terp.stack.push(_2os + tos);
  },
  "-": function (terp) {
    if (terp.stack.length < 2) throw "Not enough items on stack";
    var tos = terp.stack.pop();
    var _2os = terp.stack.pop();
    terp.stack.push(_2os - tos);
  },
  "*": function (terp) {
    if (terp.stack.length < 2) throw "Not enough items on stack";
    var tos = terp.stack.pop();
    var _2os = terp.stack.pop();
    terp.stack.push(_2os * tos);
  },
  "/": function (terp) {
    if (terp.stack.length < 2) throw "Not enough items on stack";
    var tos = terp.stack.pop();
    var _2os = terp.stack.pop();
    terp.stack.push(_2os / tos);
  },
  "SQRT": function (terp) {
    if (terp.stack.length < 1) throw "Not enough items on stack";
    var tos = terp.stack.pop();
    terp.stack.push(Math.sqrt(tos));
  }
};

var StackWords = {
  // Duplicate the top of stack (TOS).
  "DUP": function (terp) {
    if (terp.stack.length < 1) throw "Not enough items on stack";
    var tos = terp.stack.pop();
    terp.stack.push(tos);
    terp.stack.push(tos);
  },
  // Throw away the TOS -- the opposite of DUP.
  "DROP": function (terp) {
    if (terp.stack.length < 1) throw "Not enough items on stack";
    terp.stack.pop();
  },
  // Exchange positions of TOS and second item on stack (2OS).
  "SWAP": function (terp) {
    if (terp.stack.length < 2) throw "Not enough items on stack";
    var tos = terp.stack.pop();
    var _2os = terp.stack.pop();
    terp.stack.push(tos);
    terp.stack.push(_2os);
  },
  // Copy 2OS on top of stack.
  "OVER": function (terp) {
    if (terp.stack.length < 2) throw "Not enough items on stack";
    var tos = terp.stack.pop();
    var _2os = terp.stack.pop();
    terp.stack.push(_2os);
    terp.stack.push(tos);
    terp.stack.push(_2os);
  },
  // Bring the 3rd item on stack to the top.
  "ROT": function (terp) {
    if (terp.stack.length < 3) throw "Not enough items on stack";
    var tos = terp.stack.pop();
    var _2os = terp.stack.pop();
    var _3os = terp.stack.pop();
    terp.stack.push(_2os);
    terp.stack.push(tos);
    terp.stack.push(_3os);
  }
};

function makeVariable(terp) {
  var me = {value: 0};
  return function () {
    terp.stack.push(me);
  };
}

var VariableWords = {
  // Read next word from input and make it a variable.
  "VAR": function (terp) {
    var var_name = terp.lexer.nextWord();
    if (var_name == null) throw "Unexpected end of input";
    terp.define(var_name, makeVariable(terp));
  },
  // Store value of 2OS into variable given by TOS.
  "STORE": function (terp) {
    if (terp.stack.length < 2) throw "Not enough items on stack";
    var reference = terp.stack.pop();
    var new_value = terp.stack.pop();
    reference.value = new_value;
  },
  // Replace reference to variable on TOS with its value.
  "FETCH": function (terp) {
    if (terp.stack.length < 1) throw "Not enough items on stack";
    var reference = terp.stack.pop();
    terp.stack.push(reference.value);
  }
};
VariableWords["VAR"].immediate = true;
VariableWords["VARIABLE"] = VariableWords["VAR"];
VariableWords["!"] = VariableWords["STORE"];
VariableWords["@"] = VariableWords["FETCH"];

function makeConstant(value, terp) {
  return function () {
    terp.stack.push(value);
  }
}

var ConstantWords = {
  // Read next word from input and make it a constant with TOS as value.
  "CONST": function (terp) {
    if (terp.stack.length < 1) throw "Not enough items on stack";
    var const_name = terp.lexer.nextWord();
    if (const_name == null) throw "Unexpected end of input";
    var const_value = terp.stack.pop();
    terp.define(const_name, makeConstant(const_value, terp));
  }
};
ConstantWords["CONST"].immediate = true;
ConstantWords["CONSTANT"] = ConstantWords["CONST"];

var StringWords = {
  "\"": function (terp) {
    terp.stack.push(terp.lexer.nextCharsUpTo("\""));
  }
};
StringWords["\""].immediate = true;

var CommentWords = {
  "/*": function (terp) {
    do {
      var next_word = terp.lexer.nextWord();
      if (next_word == null) throw "Unexpected end of input";
    } while (next_word.substr(-2, 2) != "*/");
  },

  "(": function (terp) {
    terp.lexer.nextCharsUpTo(")");
  },

  "//": function (terp) {
    terp.lexer.nextCharsUpTo("\n");
  }
};
CommentWords["/*"].immediate = true;
CommentWords["("].immediate = true;
CommentWords["//"].immediate = true;
CommentWords["\\"] = CommentWords["//"];

function makeWord(code) {
  return function (terp) {
    var old_pointer = terp.code_pointer;
    terp.code_pointer = 0;
    while (terp.code_pointer < code.length) {
      terp.interpret(code[terp.code_pointer]);
      terp.code_pointer++;
    }
    terp.code_pointer = old_pointer;
  };
}

var CompilingWords = {
  "DEF": function (terp) {
    var new_word = terp.lexer.nextWord();
    if (new_word == null) throw "Unexpected end of input";

    terp.latest = new_word;
    terp.startCompiling();
  },

  "END": function (terp) {
    var new_code = terp.stack.slice(0); // Clone compile_buffer.
    terp.stack.length = 0; // Clear compile_buffer.
    terp.define(terp.latest, makeWord(new_code));
    terp.stopCompiling();
  },

  "COMPILE": function (terp) {
    var next_word = terp.lexer.nextWord();
    if (next_word == null) throw "Unexpected end of input";

    terp.stack.push(terp.compile(next_word));
  },

  "IMMEDIATE": function (terp) {
    terp.compile(terp.latest).immediate = true;
  }
};
CompilingWords["DEF"].immediate = true;
CompilingWords["END"].immediate = true;
CompilingWords[":"] = CompilingWords["DEF"];
CompilingWords[";"] = CompilingWords["END"];

var ListWords = {
  "[": function (terp) {
    var list = [];
    var old_stack = terp.stack;
    terp.stack = list;

    do {
      var next_word = terp.lexer.nextWord();
      if (next_word == null) throw "Unexpected end of input";
      if (next_word == "]") break;

      next_word = terp.compile(next_word);
      if (next_word.immediate)
        terp.interpret(next_word);
      else
        terp.stack.push(next_word);
    } while (true);

    terp.stack = old_stack;
    terp.stack.push(list);
  },

  "LENGTH": function (terp) {
    if (terp.stack.length < 1) throw "Not enough items on stack";
    var temp = terp.stack.pop();
    terp.stack.push(temp.length);
  },

  "ITEM": function (terp) {
    if (terp.stack.length < 2) throw "Not enough items on stack";
    var key = terp.stack.pop();
    var obj = terp.stack.pop();
    if (typeof obj == "object") {
      terp.stack.push(obj[key]);
    } else {
      throw "Object expected";
    }
  }
};
ListWords["["].immediate = true;

var ControlWords = {
  "RUN": function (terp) {
    if (terp.stack.length < 1) throw "Not enough items on stack";
    var temp = terp.stack.pop();
    if (temp.constructor != Array) throw "List expected";
    terp.interpret(makeWord(temp));
  },

  "TIMES": function (terp) {
    if (terp.stack.length < 2) throw "Not enough items on stack";
    var count = terp.stack.pop();
    var code = terp.stack.pop();
    if (code.constructor != Array) throw "List expected";
    var word = makeWord(code);
    for (var i = 0; i < count; i++) word(terp);
  },

  "IFTRUE": function (terp) {
    if (terp.stack.length < 2) throw "Not enough items on stack";
    var code = terp.stack.pop();
    var cond = terp.stack.pop();
    if (code.constructor != Array) throw "List expected";
    if (cond) terp.interpret(makeWord(code));
  },

  "IFFALSE": function (terp) {
    if (terp.stack.length < 2) throw "Not enough items on stack";
    var code = terp.stack.pop();
    var cond = terp.stack.pop();
    if (code.constructor != Array) throw "List expected";
    if (!cond) terp.interpret(makeWord(code));
  },

  "WHILE": function (terp) {
    if (terp.stack.length < 2) throw "Not enough items on stack";
    var code = terp.stack.pop();
    var cond = terp.stack.pop();
    if (code.constructor != Array) throw "List expected";
    if (cond.constructor != Array) throw "List expected";
    var code_word = makeWord(code);
    var cond_word = makeWord(cond);

    do {
      cond_word(terp);
      if (terp.stack.length < 1)
        throw "Not enough items on stack";
      if (!terp.stack.pop()) break;
      code_word(terp);
    } while (true);
  },

  "?CONTINUE": function (terp) {
    if (terp.stack.length < 1) throw "Not enough items on stack";
    var cond = terp.stack.pop();
    if (cond) terp.code_pointer = Infinity;
  },

  "?BREAK": function (terp) {
    if (terp.stack.length < 1) throw "Not enough items on stack";
    var cond = terp.stack.pop();
    if (cond) {
      terp.code_pointer = Infinity;
      terp.break_state = true;
    }
  },

  "LOOP": function (terp) {
    if (terp.stack.length < 1) throw "Not enough items on stack";
    var code = terp.stack.pop();
    if (code.constructor != Array) throw "List expected";
    var code_word = makeWord(code);
    var old_break_state = terp.break_state;
    terp.break_state = false;
    do {
      code_word(terp);
    } while (!terp.break_state);
    terp.break_state = old_break_state;
  }
};

var LogicWords = {
  "TRUE": function (terp) {
    terp.stack.push(true);
  },
  "FALSE": function (terp) {
    terp.stack.push(false);
  },

  "AND": function (terp) {
    if (terp.stack.length < 2) throw "Not enough items on stack";
    var term2 = terp.stack.pop();
    var term1 = terp.stack.pop();
    terp.stack.push(term1 && term2);
  },

  "OR": function (terp) {
    if (terp.stack.length < 2) throw "Not enough items on stack";
    var term2 = terp.stack.pop();
    var term1 = terp.stack.pop();
    terp.stack.push(term1 || term2);
  },

  "NOT": function (terp) {
    if (terp.stack.length < 1) throw "Not enough items on stack";
    terp.stack.push(!terp.stack.pop());
  }
};
LogicWords["BOTH"] = LogicWords["AND"];
LogicWords["EITHER"] = LogicWords["OR"];

var CompareWords = {
  "<": function (terp) {
    if (terp.stack.length < 2) throw "Not enough items on stack";
    var term2 = terp.stack.pop();
    var term1 = terp.stack.pop();
    terp.stack.push(term1 < term2);
  },
  "<=": function (terp) {
    if (terp.stack.length < 2) throw "Not enough items on stack";
    var term2 = terp.stack.pop();
    var term1 = terp.stack.pop();
    terp.stack.push(term1 <= term2);
  },
  "=": function (terp) {
    if (terp.stack.length < 2) throw "Not enough items on stack";
    var term2 = terp.stack.pop();
    var term1 = terp.stack.pop();
    terp.stack.push(term1 == term2);
  },
  ">=": function (terp) {
    if (terp.stack.length < 2) throw "Not enough items on stack";
    var term2 = terp.stack.pop();
    var term1 = terp.stack.pop();
    terp.stack.push(term1 >= term2);
  },
  ">": function (terp) {
    if (terp.stack.length < 2) throw "Not enough items on stack";
    var term2 = terp.stack.pop();
    var term1 = terp.stack.pop();
    terp.stack.push(term1 > term2);
  }
};
