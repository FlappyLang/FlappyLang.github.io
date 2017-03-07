/** JUSH - JavaScript Syntax Highlighter
 * @link http://jush.sourceforge.net
 * @author Jakub Vrana, http://www.vrana.cz
 * @copyright 2007 Jakub Vrana
 * @license http://www.apache.org/licenses/LICENSE-2.0 Apache License, Version 2.0
 */

/* Limitations:
 <style> and <script> supposes CDATA or HTML comments
 unnecessary escaping (e.g. echo "\'" or ='&quot;') is removed
 */

var jush = {
  create_links: true, // string for extra <a> parameters, e.g. ' target="_blank"'
  timeout: 1000, // milliseconds
  custom_links: {}, // { state: [ url, regexp ] }, for example { php : [ 'doc/$&.html', /\b(getData|setData)\b/g ] }
  api: {}, // { state: { function: description } }, for example { php: { array: 'Create an array' } }

  sql_function: 'mysql_db_query|mysql_query|mysql_unbuffered_query|mysqli_master_query|mysqli_multi_query|mysqli_query|mysqli_real_query|mysqli_rpl_query_type|mysqli_send_query|mysqli_stmt_prepare',
  sqlite_function: 'sqlite_query|sqlite_unbuffered_query|sqlite_single_query|sqlite_array_query|sqlite_exec',
  pgsql_function: 'pg_prepare|pg_query|pg_query_params|pg_send_prepare|pg_send_query|pg_send_query_params',
  mssql_function: 'mssql_query|sqlsrv_prepare|sqlsrv_query',
  oracle_function: 'oci_parse',
  php_function: 'eval|create_function|assert|classkit_method_add|classkit_method_redefine|runkit_function_add|runkit_function_redefine|runkit_lint|runkit_method_add|runkit_method_redefine'
  + '|array_filter|array_map|array_reduce|array_walk|array_walk_recursive|call_user_func|call_user_func_array|ob_start|sqlite_create_function|is_callable' // callback parameter with possible call of builtin function
  ,
  tr: undefined,
  regexps: undefined,

  /** Link stylesheet
   * @param string
   */
  style: function (href) {
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.type = 'text/css';
    link.href = href;
    document.getElementsByTagName('head')[0].appendChild(link);
  },

  /** Highlight text
   * @param string
   * @param string
   * @return string
   */
  highlight: function (language, text) {
    this.last_tag = '';
    this.last_class = '';
    return '<span class="jush">' + this.highlight_states([language], text.replace(/\r\n?/g, '\n'), !/^(htm|tag|xml|txt)$/.test(language))[0] + '</span>';
  },

  /** Highlight text in tags
   * @param mixed tag name or array of HTMLElement
   * @param number number of spaces for tab, 0 for tab itself, defaults to 4
   */
  highlight_tag: function (tag, tab_width) {
    var pre = (typeof tag == 'string' ? document.getElementsByTagName(tag) : tag);
    var tab = '';
    for (var i = (tab_width !== undefined ? tab_width : 4); i--;) {
      tab += ' ';
    }
    var i = 0;
    var highlight = function () {
      var start = new Date();
      while (i < pre.length) {
        var match = /(^|\s)(?:jush|language(?=-\S))($|\s|-(\S+))/.exec(pre[i].className); // http://www.w3.org/TR/html5/text-level-semantics.html#the-code-element
        if (match) {
          var language = match[3] ? match[3] : 'htm';
          var s = '<span class="jush-' + language + '">' + jush.highlight(language, jush.html_entity_decode(pre[i].innerHTML.replace(/<br(\s+[^>]*)?>/gi, '\n').replace(/<[^>]*>/g, ''))).replace(/\t/g, tab.length ? tab : '\t').replace(/(^|\n| ) /g, '$1&nbsp;') + '</span>'; // span - enable style for class="language-"
          if (pre[i].outerHTML && /^pre$/i.test(pre[i].tagName)) {
            pre[i].outerHTML = pre[i].outerHTML.match(/[^>]+>/)[0] + s + '</' + pre[i].tagName + '>';
          } else {
            pre[i].innerHTML = s.replace(/\n/g, '<br />');
          }
        }
        i++;
        if (jush.timeout && window.setTimeout && (new Date() - start) > jush.timeout) {
          window.setTimeout(highlight, 100);
          break;
        }
      }
    };
    highlight();
  },

  create_link: function (link, s, attrs) {
    return '<a' + (this.create_links && link ? ' href="' + link + '"' : '') + (typeof this.create_links == 'string' ? this.create_links : '') + (attrs ? attrs : '') + '>' + s + '</a>';
  },

  keywords_links: function (state, s) {
    if (/^js(_write|_code)+$/.test(state)) {
      state = 'js';
    }
    if (/^(php_quo_var|php_php|php_sql|php_sqlite|php_pgsql|php_mssql|php_oracle|php_echo|php_phpini|php_http|php_mail)$/.test(state)) {
      state = 'php2';
    }
    if (state == 'sql_code') {
      state = 'sql';
    }
    if (this.links2 && this.links2[state]) {
      var url = this.urls[state];
      var links2 = this.links2[state];
      s = s.replace(links2, function (str, match1) {
        for (var i = arguments.length - 4; i > 1; i--) {
          if (arguments[i]) {
            var link = (/^http:/.test(url[i - 1]) || !url[i - 1] ? url[i - 1] : url[0].replace(/\$key/g, url[i - 1]));
            switch (state) {
              case 'php':
                link = link.replace(/\$1/g, arguments[i].toLowerCase());
                break;
              case 'php_new':
                link = link.replace(/\$1/g, arguments[i].toLowerCase());
                break; // toLowerCase() - case sensitive after #
              case 'phpini':
                link = link.replace(/\$1/g, (/^suhosin\./.test(arguments[i])) ? arguments[i] : arguments[i].toLowerCase().replace(/_/g, '-'));
                break;
              case 'php_doc':
                link = link.replace(/\$1/g, arguments[i].replace(/^\W+/, ''));
                break;
              case 'js_doc':
                link = link.replace(/\$1/g, arguments[i].replace(/^\W*(.)/, function (match, p1) {
                  return p1.toUpperCase();
                }));
                break;
              case 'http':
                if (/-header$/.test(link)) link = link.replace(/\$1/g, arguments[i].toLowerCase()).substr(0, 67);
                break;
              case 'sql':
                link = link.replace(/\$1/g, arguments[i].replace(/\b(ALTER|CREATE|DROP|RENAME|SHOW)\s+SCHEMA\b/, '$1 DATABASE').toLowerCase().replace(/\s+|_/g, '-'));
                break;
              case 'sqlset':
                link = link.replace(/\$1/g, (links2.test(arguments[i].replace(/_/g, '-')) ? arguments[i].replace(/_/g, '-') : arguments[i]).toLowerCase());
                break;
              case 'sqlite':
                link = link.replace(/\$1/g, arguments[i].toLowerCase().replace(/\s+/g, ''));
                break;
              case 'sqliteset':
                link = link.replace(/\$1/g, arguments[i].toLowerCase());
                break;
              case 'sqlitestatus':
                link = link.replace(/\$1/g, arguments[i].toLowerCase());
                break;
              case 'pgsql':
                link = link.replace(/\$1/g, arguments[i].toLowerCase().replace(/\s+/g, (i == 1 ? '-' : '')));
                break;
              case 'pgsqlset':
                link = link.replace(/\$1/g, arguments[i].replace(/_/g, '-').toUpperCase());
                break;
              case 'cnf':
                link = link.replace(/\$1/g, arguments[i].toLowerCase());
                break;
              case 'js':
                link = link.replace(/\$1/g, arguments[i].replace(/\./g, '/'));
                break;
              default:
                link = link.replace(/\$1/g, arguments[i]);
            }
            var title = '';
            if (jush.api[state]) {
              title = jush.api[state][(state == 'js' ? arguments[i] : arguments[i].toLowerCase())];
            }
            return (match1 ? match1 : '') + jush.create_link(link, arguments[i], (title ? ' title="' + jush.htmlspecialchars_quo(title) + '"' : '')) + (arguments[arguments.length - 3] ? arguments[arguments.length - 3] : '');
          }
        }
      });
    }
    if (this.custom_links[state]) {
      s = s.replace(this.custom_links[state][1], function (str) {
        var offset = arguments[arguments.length - 2];
        if (/<[^>]*$/.test(s.substr(0, offset))) {
          return str; // don't create links inside tags
        }
        return '<a href="' + jush.htmlspecialchars_quo(jush.custom_links[state][0].replace('$&', encodeURIComponent(str))) + '" class="jush-custom">' + str + '</a>' // not create_link() - ignores create_links
      });
    }
    return s;
  },

  build_regexp: function (tr1) {
    var re = [];
    for (var k in tr1) {
      var s = tr1[k].toString().replace(/^\/|\/[^\/]*$/g, '');
      re.push(s);
    }
    return new RegExp(re.join('|'), 'gi');
  },

  highlight_states: function (states, text, in_php, escape) {
    if (!this.regexps) {
      var php = /<\?(?!xml)(?:php)?|<script\s+language\s*=\s*(?:"php"|'php'|php)\s*>/i; // asp_tags=0, short_open_tag=1
      var num = /(?:\b[0-9]+\.?[0-9]*|\.[0-9]+)(?:[eE][+-]?[0-9]+)?/;
      this.tr = { // transitions - key: go inside this state, _2: go outside 2 levels (number alone is put to the beginning in Chrome)
        htm: {
          php: php,
          tag_css: /(<)(style)\b/i,
          tag_js: /(<)(script)\b/i,
          htm_com: /<!--/,
          tag: /(<)(\/?[-\w]+)/,
          ent: /&/
        },
        htm_com: {php: php, _1: /-->/},
        ent: {php: php, _1: /[;\s]/},
        tag: {
          php: php,
          att_css: /(\s*)(style)(\s*=\s*|$)/i,
          att_js: /(\s*)(on[-\w]+)(\s*=\s*|$)/i,
          att_http: /(\s*)(http-equiv)(\s*=\s*|$)/i,
          att: /(\s*)([-\w]+)()/,
          _1: />/
        },
        tag_css: {php: php, att: /(\s*)([-\w]+)()/, css: />/},
        tag_js: {php: php, att: /(\s*)([-\w]+)()/, js: />/},
        att: {php: php, att_quo: /\s*=\s*"/, att_apo: /\s*=\s*'/, att_val: /\s*=\s*/, _1: /()/},
        att_css: {php: php, att_quo: /"/, att_apo: /'/, att_val: /\s*/},
        att_js: {php: php, att_quo: /"/, att_apo: /'/, att_val: /\s*/},
        att_http: {php: php, att_quo: /"/, att_apo: /'/, att_val: /\s*/},
        att_quo: {php: php, _2: /"/},
        att_apo: {php: php, _2: /'/},
        att_val: {php: php, _2: /(?=>|\s)|$/},

        xml: {php: php, htm_com: /<!--/, xml_tag: /(<)(\/?[-\w:]+)/, ent: /&/},
        xml_tag: {php: php, xml_att: /(\s*)([-\w:]+)()/, _1: />/},
        xml_att: {php: php, att_quo: /\s*=\s*"/, att_apo: /\s*=\s*'/, _1: /()/},

        txt: {php: php},

        css: {
          php: php,
          quo: /"/,
          apo: /'/,
          com: /\/\*/,
          css_at: /(@)([^;\s{]+)/,
          css_pro: /\{/,
          _2: /(<)(\/style)(>)/i
        },
        css_at: {php: php, quo: /"/, apo: /'/, com: /\/\*/, css_at2: /\{/, _1: /;/},
        css_at2: {php: php, quo: /"/, apo: /'/, com: /\/\*/, css_at: /@/, css_pro: /\{/, _2: /}/},
        css_pro: {php: php, com: /\/\*/, css_val: /(\s*)([-\w]+)(\s*:)/, _1: /}/}, //! misses e.g. margin/*-left*/:
        css_val: {
          php: php,
          quo: /"/,
          apo: /'/,
          css_js: /expression\s*\(/i,
          com: /\/\*/,
          clr: /#/,
          num: /[-+]?[0-9]*\.?[0-9]+(?:em|ex|px|in|cm|mm|pt|pc|%)?/,
          _1: /;|$/,
          _2: /}/
        },
        css_js: {php: php, css_js: /\(/, _1: /\)/},
        quo: {php: php, esc: /\\/, _1: /"/},
        apo: {php: php, esc: /\\/, _1: /'/},
        com: {php: php, _1: /\*\//},
        esc: {_1: /./}, //! php_quo allows [0-7]{1,3} and x[0-9A-Fa-f]{1,2}
        one: {_1: /(?=\n)|$/},
        clr: {_1: /(?=[^a-fA-F0-9])|$/},
        num: {_1: /()/},

        js: {php: php, js_reg: /\s*\/(?![\/*])/, js_code: /()/},
        js_code: {
          php: php,
          quo: /"/,
          apo: /'/,
          js_one: /\/\//,
          js_doc: /\/\*\*/,
          com: /\/\*/,
          num: num,
          js_write: /(\b)(write(?:ln)?)(\()/,
          js_http: /(\.)(setRequestHeader|getResponseHeader)(\()/,
          _3: /(<)(\/script)(>)/i,
          _1: /[^\])}$\w\s]/
        },
        js_write: {php: php, js_reg: /\s*\/(?![\/*])/, js_write_code: /()/},
        js_http: {php: php, js_reg: /\s*\/(?![\/*])/, js_http_code: /()/},
        js_write_code: {
          php: php,
          quo: /"/,
          apo: /'/,
          js_one: /\/\//,
          com: /\/\*/,
          num: num,
          js_write: /\(/,
          _2: /\)/,
          _1: /[^\])}$\w\s]/
        },
        js_http_code: {
          php: php,
          quo: /"/,
          apo: /'/,
          js_one: /\/\//,
          com: /\/\*/,
          num: num,
          js_http: /\(/,
          _2: /\)/,
          _1: /[^\])}$\w\s]/
        },
        js_one: {php: php, _1: /\n/, _3: /(<)(\/script)(>)/i},
        js_reg: {php: php, esc: /\\/, js_reg_bra: /\[/, _1: /\/[a-z]*/i}, //! highlight regexp
        js_reg_bra: {php: php, esc: /\\/, _1: /]/},
        js_doc: {_1: /\*\//},

        php: {php_echo: /=/, php2: /()/},
        php2: {
          php_quo: /"/,
          php_apo: /'/,
          php_bac: /`/,
          php_one: /\/\/|#/,
          php_doc: /\/\*\*/,
          php_com: /\/\*/,
          php_eot: /<<<[ \t]*/,
          php_new: /(\b)(new|instanceof|extends|class|implements|interface)(\b\s*)/i,
          php_met: /()([\w\u007F-\uFFFF]+)(::)/,
          php_fun: /()(\bfunction\b|->|::)(\s*)/i,
          php_php: new RegExp('(\\b)(' + this.php_function + ')(\\s*\\(|$)', 'i'),
          php_sql: new RegExp('(\\b)(' + this.sql_function + ')(\\s*\\(|$)', 'i'),
          php_sqlite: new RegExp('(\\b)(' + this.sqlite_function + ')(\\s*\\(|$)', 'i'),
          php_pgsql: new RegExp('(\\b)(' + this.pgsql_function + ')(\\s*\\(|$)', 'i'),
          php_oracle: new RegExp('(\\b)(' + this.oracle_function + ')(\\s*\\(|$)', 'i'),
          php_echo: /(\b)(echo|print)\b/i,
          php_halt: /(\b)(__halt_compiler)(\s*\(\s*\)|$)/i,
          php_var: /()(\$[\w\u007F-\uFFFF]+)()/,
          num: num,
          php_phpini: /(\b)(ini_get|ini_set)(\s*\(|$)/i,
          php_http: /(\b)(header)(\s*\(|$)/i,
          php_mail: /(\b)(mail)(\s*\(|$)/i,
          _2: /\?>|<\/script>/i
        }, //! matches ::echo
        php_quo_var: {
          php_quo: /"/,
          php_apo: /'/,
          php_bac: /`/,
          php_one: /\/\/|#/,
          php_com: /\/\*/,
          php_eot: /<<<[ \t]*/,
          php_new: /(\b)(new|instanceof|extends|class|implements|interface)(\b\s*)/i,
          php_met: /()([\w\u007F-\uFFFF]+)(::)/,
          php_fun: /()(\bfunction\b|->|::)(\s*)/i,
          php_php: new RegExp('(\\b)(' + this.php_function + ')(\\s*\\(|$)', 'i'),
          php_sql: new RegExp('(\\b)(' + this.sql_function + ')(\\s*\\(|$)', 'i'),
          php_sqlite: new RegExp('(\\b)(' + this.sqlite_function + ')(\\s*\\(|$)', 'i'),
          php_pgsql: new RegExp('(\\b)(' + this.pgsql_function + ')(\\s*\\(|$)', 'i'),
          php_oracle: new RegExp('(\\b)(' + this.oracle_function + ')(\\s*\\(|$)', 'i'),
          _1: /}/
        },
        php_echo: {
          php_quo: /"/,
          php_apo: /'/,
          php_bac: /`/,
          php_one: /\/\/|#/,
          php_com: /\/\*/,
          php_eot: /<<<[ \t]*/,
          php_new: /(\b)(new|instanceof|extends|class|implements|interface)(\b\s*)/i,
          php_met: /()([\w\u007F-\uFFFF]+)(::)/,
          php_fun: /()(\bfunction\b|->|::)(\s*)/i,
          php_php: new RegExp('(\\b)(' + this.php_function + ')(\\s*\\(|$)', 'i'),
          php_sql: new RegExp('(\\b)(' + this.sql_function + ')(\\s*\\(|$)', 'i'),
          php_sqlite: new RegExp('(\\b)(' + this.sqlite_function + ')(\\s*\\(|$)', 'i'),
          php_pgsql: new RegExp('(\\b)(' + this.pgsql_function + ')(\\s*\\(|$)', 'i'),
          php_oracle: new RegExp('(\\b)(' + this.oracle_function + ')(\\s*\\(|$)', 'i'),
          php_echo: /\(/,
          php_var: /()(\$[\w\u007F-\uFFFF]+)()/,
          num: num,
          php_phpini: /(\b)(ini_get|ini_set)(\s*\(|$)/i,
          _1: /\)|;|(?=\?>|<\/script>)|$/i
        },
        php_php: {
          php_quo: /"/,
          php_apo: /'/,
          php_bac: /`/,
          php_one: /\/\/|#/,
          php_com: /\/\*/,
          php_eot: /<<<[ \t]*/,
          php_var: /()(\$[\w\u007F-\uFFFF]+)()/,
          num: num,
          _1: /[(,)]/
        }, // [(,)] - only first parameter //! disables second parameter in create_function()
        php_sql: {
          php_quo: /"/,
          php_apo: /'/,
          php_bac: /`/,
          php_one: /\/\/|#/,
          php_com: /\/\*/,
          php_eot: /<<<[ \t]*/,
          php_sql: /\(/,
          php_var: /()(\$[\w\u007F-\uFFFF]+)()/,
          num: num,
          _1: /\)/
        },
        php_sqlite: {
          php_quo: /"/,
          php_apo: /'/,
          php_bac: /`/,
          php_one: /\/\/|#/,
          php_com: /\/\*/,
          php_eot: /<<<[ \t]*/,
          php_sqlite: /\(/,
          php_var: /()(\$[\w\u007F-\uFFFF]+)()/,
          num: num,
          _1: /\)/
        },
        php_pgsql: {
          php_quo: /"/,
          php_apo: /'/,
          php_bac: /`/,
          php_one: /\/\/|#/,
          php_com: /\/\*/,
          php_eot: /<<<[ \t]*/,
          php_pgsql: /\(/,
          php_var: /()(\$[\w\u007F-\uFFFF]+)()/,
          num: num,
          _1: /\)/
        },
        php_mssql: {
          php_quo: /"/,
          php_apo: /'/,
          php_bac: /`/,
          php_one: /\/\/|#/,
          php_com: /\/\*/,
          php_eot: /<<<[ \t]*/,
          php_mssql: /\(/,
          php_var: /()(\$[\w\u007F-\uFFFF]+)()/,
          num: num,
          _1: /\)/
        },
        php_oracle: {
          php_quo: /"/,
          php_apo: /'/,
          php_bac: /`/,
          php_one: /\/\/|#/,
          php_com: /\/\*/,
          php_eot: /<<<[ \t]*/,
          php_oracle: /\(/,
          php_var: /()(\$[\w\u007F-\uFFFF]+)()/,
          num: num,
          _1: /\)/
        },
        php_phpini: {
          php_quo: /"/,
          php_apo: /'/,
          php_bac: /`/,
          php_one: /\/\/|#/,
          php_com: /\/\*/,
          php_eot: /<<<[ \t]*/,
          php_phpini: /\(/,
          php_var: /()(\$[\w\u007F-\uFFFF]+)()/,
          num: num,
          _1: /[,)]/
        },
        php_http: {
          php_quo: /"/,
          php_apo: /'/,
          php_bac: /`/,
          php_one: /\/\/|#/,
          php_com: /\/\*/,
          php_eot: /<<<[ \t]*/,
          php_http: /\(/,
          php_var: /()(\$[\w\u007F-\uFFFF]+)()/,
          num: num,
          _1: /\)/
        },
        php_mail: {
          php_quo: /"/,
          php_apo: /'/,
          php_bac: /`/,
          php_one: /\/\/|#/,
          php_com: /\/\*/,
          php_eot: /<<<[ \t]*/,
          php_mail: /\(/,
          php_var: /()(\$[\w\u007F-\uFFFF]+)()/,
          num: num,
          _1: /\)/
        },
        php_new: {php_one: /\/\/|#/, php_com: /\/\*/, _0: /\s*,\s*/, _1: /(?=[^\w\u007F-\uFFFF])|$/}, //! classes are used also for type hinting and catch //! , because of 'implements' but fails for array(new A, new B)
        php_met: {php_one: /\/\/|#/, php_com: /\/\*/, _1: /()([\w\u007F-\uFFFF]+)()/},
        php_fun: {php_one: /\/\/|#/, php_com: /\/\*/, _1: /(?=[^\w\u007F-\uFFFF])|$/},
        php_one: {_1: /\n|(?=\?>)|$/},
        php_eot: {php_eot2: /([^'"\n]+)(['"]?)/},
        php_eot2: {php_quo_var: /\$\{|\{\$/, php_var: /()(\$[\w\u007F-\uFFFF]+)()/}, // php_eot2._2 to be set in php_eot handler
        php_quo: {php_quo_var: /\$\{|\{\$/, php_var: /()(\$[\w\u007F-\uFFFF]+)()/, esc: /\\/, _1: /"/},
        php_bac: {php_quo_var: /\$\{|\{\$/, php_var: /()(\$[\w\u007F-\uFFFF]+)()/, esc: /\\/, _1: /`/}, //! highlight shell
        php_var: {_1: /()/},
        php_apo: {esc: /\\/, _1: /'/},
        php_doc: {_1: /\*\//},
        php_com: {_1: /\*\//},
        php_halt: {php_one: /\/\/|#/, php_com: /\/\*/, php_halt2: /;|\?>\n?/},
        php_halt2: {_4: /$/},

        phpini: {one: /;/, _0: /$/},
        http: {_0: /$/},
        mail: {_0: /$/},

        sql: {
          one: /-- |#|--(?=\n|$)/,
          com_code: /\/\*![0-9]*|\*\//,
          com: /\/\*/,
          sql_sqlset: /(\s*)(SET)(\s+|$)(?!NAMES\b|CHARACTER\b|PASSWORD\b|(?:GLOBAL\s+|SESSION\s+)?TRANSACTION\b|@[^@]|NEW\.|OLD\.)/i,
          sql_code: /()/
        },
        sql_code: {
          sql_apo: /'/,
          sql_quo: /"/,
          bac: /`/,
          one: /-- |#|--(?=\n|$)/,
          com_code: /\/\*![0-9]*|\*\//,
          com: /\/\*/,
          sql_var: /\B@/,
          num: num,
          _1: /;|\b(THEN|ELSE|LOOP|REPEAT|DO)\b/i
        },
        sql_sqlset: {one: /-- |#|--(?=\n|$)/, com: /\/\*/, sqlset_val: /=/, _1: /;|$/},
        sqlset_val: {
          sql_apo: /'/,
          sql_quo: /"/,
          bac: /`/,
          one: /-- |#|--(?=\n|$)/,
          com: /\/\*/,
          _1: /,/,
          _2: /;|$/,
          num: num
        }, //! comma can be inside function call
        sqlset: {_0: /$/}, //! jump from SHOW VARIABLES LIKE ''
        sqlstatus: {_0: /$/}, //! jump from SHOW STATUS LIKE ''
        com_code: {_1: /()/},
        sqlite: {
          sqlite_apo: /'/,
          sqlite_quo: /"/,
          bra: /\[/,
          bac: /`/,
          one: /--/,
          com: /\/\*/,
          sql_var: /[:@$]/,
          sqlite_sqliteset: /(\b)(PRAGMA)(\s+)/i,
          num: num
        },
        sqlite_sqliteset: {
          sqlite_apo: /'/,
          sqlite_quo: /"/,
          bra: /\[/,
          bac: /`/,
          one: /--/,
          com: /\/\*/,
          num: num,
          _1: /;|$/
        },
        sqliteset: {_0: /$/},
        sqlitestatus: {_0: /$/},
        pgsql: {
          sql_apo: /'/,
          sqlite_quo: /"/,
          sql_eot: /\$/,
          one: /--/,
          com_nest: /\/\*/,
          pgsql_pgsqlset: /(\b)(SHOW|SET)(\s+)/i,
          num: num
        }, // standard_conforming_strings=off
        pgsql_pgsqlset: {
          sql_apo: /'/,
          sqlite_quo: /"/,
          sql_eot: /\$/,
          one: /--/,
          com_nest: /\/\*/,
          num: num,
          _1: /;|$/
        },
        pgsqlset: {_0: /$/},
        mssql: {sqlite_apo: /'/, sqlite_quo: /"/, one: /--/, com: /\/\*/, mssql_bra: /\[/, num: num}, // QUOTED IDENTIFIER = OFF
        oracle: {
          sqlite_apo: /n?'/i,
          sqlite_quo: /"/,
          one: /--/,
          com: /\/\*/,
          num: /(?:\b[0-9]+\.?[0-9]*|\.[0-9]+)(?:e[+-]?[0-9]+)?[fd]?/i
        }, //! q'
        sql_apo: {esc: /\\/, _0: /''/, _1: /'/},
        sql_quo: {esc: /\\/, _0: /""/, _1: /"/},
        sql_var: {_1: /(?=[^_.$a-zA-Z0-9])|$/},
        sqlite_apo: {_0: /''/, _1: /'/},
        sqlite_quo: {_0: /""/, _1: /"/},
        sql_eot: {sql_eot2: /\$/},
        sql_eot2: {}, // sql_eot2._2 to be set in sql_eot handler
        com_nest: {com_nest: /\/\*/, _1: /\*\//},
        bac: {_1: /`/},
        bra: {_1: /]/},
        mssql_bra: {_0: /]]/, _1: /]/},

        cnf: {
          quo_one: /"/,
          one: /#/,
          cnf_http: /((?:^|\n)\s*)(RequestHeader|Header|CacheIgnoreHeaders)([ \t]+|$)/i,
          cnf_php: /((?:^|\n)\s*)(PHPIniDir)([ \t]+|$)/i,
          cnf_phpini: /((?:^|\n)\s*)(php_value|php_flag|php_admin_value|php_admin_flag)([ \t]+|$)/i
        },
        quo_one: {esc: /\\/, _1: /"|(?=\n)|$/},
        cnf_http: {apo: /'/, quo: /"/, _1: /(?=\n)|$/},
        cnf_php: {_1: /()/},
        cnf_phpini: {cnf_phpini_val: /[ \t]/},
        cnf_phpini_val: {apo: /'/, quo: /"/, _2: /(?=\n)|$/}
      };
      this.regexps = {};
      for (var key in this.tr) {
        this.regexps[key] = this.build_regexp(this.tr[key]);
      }
    } else {
      for (var key in this.tr) {
        this.regexps[key].lastIndex = 0;
      }
    }
    var state = states[states.length - 1];
    if (!this.tr[state]) {
      return [text, states];
    }
    var ret = []; // return
    for (var i = 1; i < states.length; i++) {
      ret.push('<span class="jush-' + states[i] + '">');
    }
    var match;
    var child_states = [];
    var s_states;
    var start = 0;
    loop: while (start < text.length && (match = this.regexps[state].exec(text))) {
      if (states[0] != 'htm' && /^<\/(script|style)>$/i.test(match[0])) {
        continue;
      }
      for (var key in this.tr[state]) {
        var m = this.tr[state][key].exec(match[0]);
        if (m && !m.index && m[0].length == match[0].length) { // check index and length to allow '/' before '</script>'
          if (in_php && key == 'php') {
            continue loop;
          }
          //~ console.log(states + ' (' + key + '): ' + text.substring(start).replace(/\n/g, '\\n'));
          var out = (key.charAt(0) == '_');
          var division = match.index + (key == 'php_halt2' ? match[0].length : 0);
          var s = text.substring(start, division);

          // highlight children
          var prev_state = states[states.length - 2];
          if (/^(att_quo|att_apo|att_val)$/.test(state) && (/^(att_js|att_css|att_http)$/.test(prev_state) || /^\s*javascript:/i.test(s))) { // javascript: - easy but without own state //! should be checked only in %URI;
            child_states.unshift(prev_state == 'att_css' ? 'css_pro' : (prev_state == 'att_http' ? 'http' : 'js'));
            s_states = this.highlight_states(child_states, this.html_entity_decode(s), true, (state == 'att_apo' ? this.htmlspecialchars_apo : (state == 'att_quo' ? this.htmlspecialchars_quo : this.htmlspecialchars_quo_apo)));
          } else if (state == 'css_js' || state == 'cnf_http' || state == 'cnf_phpini' || state == 'sql_sqlset' || state == 'sqlite_sqliteset' || state == 'pgsql_pgsqlset') {
            child_states.unshift(state.replace(/^[^_]+_/, ''));
            s_states = this.highlight_states(child_states, s, true);
          } else if ((state == 'php_quo' || state == 'php_apo') && /^(php_php|php_sql|php_sqlite|php_pgsql|php_mssql|php_oracle|php_phpini|php_http|php_mail)$/.test(prev_state)) {
            child_states.unshift(prev_state.substr(4));
            s_states = this.highlight_states(child_states, this.stripslashes(s), true, (state == 'php_apo' ? this.addslashes_apo : this.addslashes_quo));
          } else if (key == 'php_halt2') {
            child_states.unshift('htm');
            s_states = this.highlight_states(child_states, s, true);
          } else if ((state == 'apo' || state == 'quo') && prev_state == 'js_write_code') {
            child_states.unshift('htm');
            s_states = this.highlight_states(child_states, s, true);
          } else if ((state == 'apo' || state == 'quo') && prev_state == 'js_http_code') {
            child_states.unshift('http');
            s_states = this.highlight_states(child_states, s, true);
          } else if (((state == 'php_quo' || state == 'php_apo') && prev_state == 'php_echo') || (state == 'php_eot2' && states[states.length - 3] == 'php_echo')) {
            var i;
            for (i = states.length; i--;) {
              prev_state = states[i];
              if (prev_state.substring(0, 3) != 'php' && prev_state != 'att_quo' && prev_state != 'att_apo' && prev_state != 'att_val') {
                break;
              }
              prev_state = '';
            }
            var f = (state == 'php_eot2' ? this.addslashes : (state == 'php_apo' ? this.addslashes_apo : this.addslashes_quo));
            s = this.stripslashes(s);
            if (/^(att_js|att_css|att_http)$/.test(prev_state)) {
              var g = (states[i + 1] == 'att_quo' ? this.htmlspecialchars_quo : (states[i + 1] == 'att_apo' ? this.htmlspecialchars_apo : this.htmlspecialchars_quo_apo));
              child_states.unshift(prev_state == 'att_js' ? 'js' : prev_state.substr(4));
              s_states = this.highlight_states(child_states, this.html_entity_decode(s), true, function (string) {
                return f(g(string));
              });
            } else if (prev_state && child_states) {
              child_states.unshift(prev_state);
              s_states = this.highlight_states(child_states, s, true, f);
            } else {
              s = this.htmlspecialchars(s);
              s_states = [(escape ? escape(s) : s), (!out || !/^(att_js|att_css|att_http|css_js|js_write_code|js_http_code|php_php|php_sql|php_sqlite|php_pgsql|php_mssql|php_oracle|php_echo|php_phpini|php_http|php_mail)$/.test(state) ? child_states : [])];
            }
          } else {
            s = this.htmlspecialchars(s);
            s_states = [(escape ? escape(s) : s), (!out || !/^(att_js|att_css|att_http|css_js|js_write_code|js_http_code|php_php|php_sql|php_sqlite|php_pgsql|php_mssql|php_oracle|php_echo|php_phpini|php_http|php_mail)$/.test(state) ? child_states : [])]; // reset child states when leaving construct
          }
          s = s_states[0];
          child_states = s_states[1];
          s = this.keywords_links(state, s);
          ret.push(s);

          s = text.substring(division, match.index + match[0].length);
          s = (m.length < 3 ? (s ? '<span class="jush-op">' + this.htmlspecialchars(escape ? escape(s) : s) + '</span>' : '') : (m[1] ? '<span class="jush-op">' + this.htmlspecialchars(escape ? escape(m[1]) : m[1]) + '</span>' : '') + this.htmlspecialchars(escape ? escape(m[2]) : m[2]) + (m[3] ? '<span class="jush-op">' + this.htmlspecialchars(escape ? escape(m[3]) : m[3]) + '</span>' : ''));
          if (!out) {
            if (this.links && this.links[key] && m[2]) {
              if (/^tag/.test(key)) {
                this.last_tag = m[2].toUpperCase();
              }
              var link = (/^tag/.test(key) && !/^(ins|del)$/i.test(m[2]) ? m[2].toUpperCase() : m[2].toLowerCase());
              var k_link = '';
              var att_tag = (this.att_mapping[link + '-' + this.last_tag] ? this.att_mapping[link + '-' + this.last_tag] : this.last_tag);
              for (var k in this.links[key]) {
                if (key == 'att' && this.links[key][k].test(link + '-' + att_tag)) {
                  link += '-' + att_tag;
                  k_link = k;
                  break;
                } else if (this.links[key][k].test(m[2])) {
                  k_link = k;
                  if (key != 'att') {
                    break;
                  }
                }
              }
              if (key == 'php_met') {
                this.last_class = (k_link && !/^(self|parent|static|dir)$/i.test(link) ? link : '');
              }
              if (k_link) {
                s = (m[1] ? '<span class="jush-op">' + this.htmlspecialchars(escape ? escape(m[1]) : m[1]) + '</span>' : '');
                s += this.create_link((/^http:/.test(k_link) ? k_link : this.urls[key].replace(/\$key/, k_link)).replace(/\$val/, link), this.htmlspecialchars(escape ? escape(m[2]) : m[2])); //! use jush.api
                s += (m[3] ? '<span class="jush-op">' + this.htmlspecialchars(escape ? escape(m[3]) : m[3]) + '</span>' : '');
              }
            }
            ret.push('<span class="jush-' + key + '">', s);
            states.push(key);
            if (state == 'php_eot') {
              this.tr.php_eot2._2 = new RegExp('(\n)(' + match[1] + ')(;?\n)');
              this.regexps.php_eot2 = this.build_regexp((match[2] == "'" ? {_2: this.tr.php_eot2._2} : this.tr.php_eot2));
            } else if (state == 'sql_eot') {
              this.tr.sql_eot2._2 = new RegExp('\\$' + text.substring(start, match.index) + '\\$');
              this.regexps.sql_eot2 = this.build_regexp(this.tr.sql_eot2);
            }
          } else {
            if (state == 'php_met' && this.last_class) {
              s = this.create_link(this.urls[state].replace(/\$key/, this.last_class) + '.' + s.toLowerCase(), s);
            }
            ret.push(s);
            for (var i = Math.min(states.length, +key.substr(1)); i--;) {
              ret.push('</span>');
              states.pop();
            }
          }
          start = match.index + match[0].length;
          if (!states.length) { // out of states
            break loop;
          }
          state = states[states.length - 1];
          this.regexps[state].lastIndex = start;
          continue loop;
        }
      }
      return ['regexp not found', []];
    }
    ret.push(this.keywords_links(state, this.htmlspecialchars(text.substring(start))));
    for (var i = 1; i < states.length; i++) {
      ret.push('</span>');
    }
    states.shift();
    return [ret.join(''), states];
  },

  att_mapping: {
    'align-APPLET': 'IMG',
    'align-IFRAME': 'IMG',
    'align-INPUT': 'IMG',
    'align-OBJECT': 'IMG',
    'align-COL': 'TD',
    'align-COLGROUP': 'TD',
    'align-TBODY': 'TD',
    'align-TFOOT': 'TD',
    'align-TH': 'TD',
    'align-THEAD': 'TD',
    'align-TR': 'TD',
    'border-OBJECT': 'IMG',
    'cite-BLOCKQUOTE': 'Q',
    'cite-DEL': 'INS',
    'color-BASEFONT': 'FONT',
    'face-BASEFONT': 'FONT',
    'height-TD': 'TH',
    'height-OBJECT': 'IMG',
    'longdesc-IFRAME': 'FRAME',
    'name-TEXTAREA': 'BUTTON',
    'name-IFRAME': 'FRAME',
    'name-OBJECT': 'INPUT',
    'src-IFRAME': 'FRAME',
    'type-LINK': 'A',
    'width-OBJECT': 'IMG',
    'width-TD': 'TH'
  },

  /** Replace <&> by HTML entities
   * @param string
   * @return string
   */
  htmlspecialchars: function (string) {
    return string.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  },

  htmlspecialchars_quo: function (string) {
    return jush.htmlspecialchars(string).replace(/"/g, '&quot;'); // jush - this.htmlspecialchars_quo is passed as reference
  },

  htmlspecialchars_apo: function (string) {
    return jush.htmlspecialchars(string).replace(/'/g, '&#39;');
  },

  htmlspecialchars_quo_apo: function (string) {
    return jush.htmlspecialchars_quo(string).replace(/'/g, '&#39;');
  },

  /** Decode HTML entities
   * @param string
   * @return string
   */
  html_entity_decode: function (string) {
    return string.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&nbsp;/g, '\u00A0').replace(/&#(?:([0-9]+)|x([0-9a-f]+));/gi, function (str, p1, p2) { //! named entities
      return String.fromCharCode(p1 ? p1 : parseInt(p2, 16));
    }).replace(/&amp;/g, '&');
  },

  /** Add backslash before backslash
   * @param string
   * @return string
   */
  addslashes: function (string) {
    return string.replace(/\\/g, '\\$&');
  },

  addslashes_apo: function (string) {
    return string.replace(/[\\']/g, '\\$&');
  },

  addslashes_quo: function (string) {
    return string.replace(/[\\"]/g, '\\$&');
  },

  /** Remove backslash before \"'
   * @param string
   * @return string
   */
  stripslashes: function (string) {
    return string.replace(/\\([\\"'])/g, '$1');
  }
};

jush.urls = {
  // $key stands for key in jush.links, $val stands for found string
  tag: 'http://www.w3.org/TR/html4/$key.html#edef-$val',
  tag_css: 'http://www.w3.org/TR/html4/$key.html#edef-$val',
  tag_js: 'http://www.w3.org/TR/html4/$key.html#edef-$val',
  att: 'http://www.w3.org/TR/html4/$key.html#adef-$val',
  att_css: 'http://www.w3.org/TR/html4/$key.html#adef-$val',
  att_js: 'http://www.w3.org/TR/html4/$key.html#adef-$val',
  att_http: 'http://www.w3.org/TR/html4/$key.html#adef-$val',
  css_val: 'http://www.w3.org/TR/CSS21/$key.html#propdef-$val',
  css_at: 'http://www.w3.org/TR/CSS21/$key',
  js_write: 'https://developer.mozilla.org/en/docs/DOM/$key.$val',
  js_http: 'http://www.w3.org/TR/XMLHttpRequest/#the-$val-$key',
  php_var: 'http://www.php.net/reserved.variables.$key',
  php_php: 'http://www.php.net/$key.$val',
  php_sql: 'http://www.php.net/$key.$val',
  php_sqlite: 'http://www.php.net/$key.$val',
  php_pgsql: 'http://www.php.net/$key.$val',
  php_mssql: 'http://msdn.microsoft.com/library/$key.aspx',
  php_oracle: 'http://www.php.net/$key.$val',
  php_echo: 'http://www.php.net/$key.$val',
  php_phpini: 'http://www.php.net/$key.$val',
  php_http: 'http://www.php.net/$key.$val',
  php_mail: 'http://www.php.net/$key.$val',
  php_met: 'http://www.php.net/$key',
  php_halt: 'http://www.php.net/$key.halt-compiler',
  sql_sqlset: 'http://dev.mysql.com/doc/mysql/en/$key',
  sqlite_sqliteset: 'http://www.sqlite.org/$key',
  pgsql_pgsqlset: 'http://www.postgresql.org/docs/current/static/$key',
  cnf_http: 'http://httpd.apache.org/docs/current/mod/$key.html#$val',
  cnf_php: 'http://www.php.net/$key',
  cnf_phpini: 'http://www.php.net/configuration.changes#$key',

  // [0] is base, other elements correspond to () in jush.links2, $key stands for text of selected element, $1 stands for found string
  php2: ['http://www.php.net/$key',
    'function.$1', 'control-structures.alternative-syntax', 'control-structures.$1', 'control-structures.do.while', 'control-structures.foreach', 'control-structures.switch', 'keyword.class', 'language.constants.predefined', 'language.exceptions', 'language.oop5.$1', 'language.oop5.cloning', 'language.oop5.constants', 'language.oop5.visibility', 'language.operators.logical', 'language.variables.scope#language.variables.scope.$1', 'language.namespaces', 'language.oop5.traits',
    'function.$1',
    'function.socket-get-option', 'function.socket-set-option'
  ],
  php_new: ['http://www.php.net/$key',
    'class.$1', 'language.types.object#language.types.object.casting', 'reserved.classes#reserved.classes.standard', 'reserved.classes#reserved.classes.closure', 'language.oop5.paamayim-nekudotayim', 'ref.sqlite#sqlite.class.$1'
  ],
  php_fun: ['http://www.php.net/$key',
    'language.oop5.autoload', 'language.oop5.decon#language.oop5.decon.constructor', 'language.oop5.decon#language.oop5.decon.destructor', 'language.oop5.overloading#language.oop5.overloading.methods', 'language.oop5.overloading#language.oop5.overloading.members', 'language.oop5.magic#language.oop5.magic.sleep', 'language.oop5.magic#language.oop5.magic.tostring', 'language.oop5.magic#language.oop5.magic.invoke', 'language.oop5.magic#language.oop5.magic.set-state', 'language.oop5.cloning'
  ],
  phpini: ['http://www.php.net/$key',
    'ini.core#ini.$1', 'filesystem.configuration#ini.$1', 'apc.configuration#ini.$1', '', 'apd.configuration#ini.$1', 'info.configuration#ini.$1', 'bc.configuration#ini.$1', 'misc.configuration#ini.$1', 'apache.configuration#ini.$1', 'readline.configuration#ini.$1', 'com.configuration#ini.$1', 'datetime.configuration#ini.$1', 'dbx.configuration#ini.$1', 'network.configuration#ini.$1', 'errorfunc.configuration#ini.$1', 'exif.configuration#ini.$1', 'expect.configuration#ini.$1', 'filter.configuration#ini.$1', 'image.configuration#ini.$1', 'ibase.configuration#ini.$1', 'ibm-db2.configuration#ini.$1', 'ifx.configuration#ini.$1', 'outcontrol.configuration#ini.$1', 'sybase.configuration#ini.$1', 'mail.configuration#ini.$1', 'maxdb.configuration#ini.$1', 'mbstring.configuration#ini.$1', 'memcache.ini#ini.$1', 'mime-magic.configuration#ini.$1', 'msql.configuration#ini.$1', 'mysql.configuration#ini.$1', 'mysqli.configuration#ini.$1', 'nsapi.configuration#ini.$1', 'oci8.configuration#ini.$1', 'odbc.configuration#ini.$1', 'pcre.configuration#ini.$1', 'ref.pdo-odbc#ini.$1', 'pgsql.configuration#ini.$1', 'phar.configuration#ini.$1', 'runkit.configuration#ini.$1', 'ini.sect.safe-mode#ini.$1', 'session.configuration#ini.$1', 'soap.configuration#ini.$1', 'sqlite.configuration#ini.$1', 'tidy.configuration#ini.$1', 'zlib.configuration#ini.$1',
    'http://www.hardened-php.net/suhosin/configuration.html#$1'
  ],
  php_doc: ['http://manual.phpdoc.org/HTMLSmartyConverter/HandS/phpDocumentor/tutorial_tags.$key.pkg.html',
    '$1', '', 'inline$1'
  ],
  js_doc: ['http://code.google.com/p/jsdoc-toolkit/wiki/Tag$key',
    '$1', 'Param', 'Augments', '$1'
  ],
  http: ['http://www.w3.org/Protocols/rfc2616/rfc2616-$key',
    'sec10.html#sec10.1.1', 'sec10.html#sec10.1.2', 'sec10.html#sec10.2.1', 'sec10.html#sec10.2.2', 'sec10.html#sec10.2.3', 'sec10.html#sec10.2.4', 'sec10.html#sec10.2.5', 'sec10.html#sec10.2.6', 'sec10.html#sec10.2.7', 'sec10.html#sec10.3.1', 'sec10.html#sec10.3.2', 'sec10.html#sec10.3.3', 'sec10.html#sec10.3.4', 'sec10.html#sec10.3.5', 'sec10.html#sec10.3.6', 'sec10.html#sec10.3.7', 'sec10.html#sec10.3.8', 'sec10.html#sec10.4.1', 'sec10.html#sec10.4.2', 'sec10.html#sec10.4.3', 'sec10.html#sec10.4.4', 'sec10.html#sec10.4.5', 'sec10.html#sec10.4.6', 'sec10.html#sec10.4.7', 'sec10.html#sec10.4.8', 'sec10.html#sec10.4.9', 'sec10.html#sec10.4.10', 'sec10.html#sec10.4.11', 'sec10.html#sec10.4.12', 'sec10.html#sec10.4.13', 'sec10.html#sec10.4.14', 'sec10.html#sec10.4.15', 'sec10.html#sec10.4.16', 'sec10.html#sec10.4.17', 'sec10.html#sec10.4.18', 'sec10.html#sec10.5.1', 'sec10.html#sec10.5.2', 'sec10.html#sec10.5.3', 'sec10.html#sec10.5.4', 'sec10.html#sec10.5.5', 'sec10.html#sec10.5.6',
    'sec14.html#sec14.1', 'sec14.html#sec14.2', 'sec14.html#sec14.3', 'sec14.html#sec14.4', 'sec14.html#sec14.5', 'sec14.html#sec14.6', 'sec14.html#sec14.7', 'sec14.html#sec14.8', 'sec14.html#sec14.9', 'sec14.html#sec14.10', 'sec14.html#sec14.11', 'sec14.html#sec14.12', 'sec14.html#sec14.13', 'sec14.html#sec14.14', 'sec14.html#sec14.15', 'sec14.html#sec14.16', 'sec14.html#sec14.17', 'sec14.html#sec14.18', 'sec14.html#sec14.19', 'sec14.html#sec14.20', 'sec14.html#sec14.21', 'sec14.html#sec14.22', 'sec14.html#sec14.23', 'sec14.html#sec14.24', 'sec14.html#sec14.25', 'sec14.html#sec14.26', 'sec14.html#sec14.27', 'sec14.html#sec14.28', 'sec14.html#sec14.29', 'sec14.html#sec14.30', 'sec14.html#sec14.31', 'sec14.html#sec14.32', 'sec14.html#sec14.33', 'sec14.html#sec14.34', 'sec14.html#sec14.35', 'sec14.html#sec14.36', 'sec14.html#sec14.37', 'sec14.html#sec14.38', 'sec14.html#sec14.39', 'sec14.html#sec14.40', 'sec14.html#sec14.41', 'sec14.html#sec14.42', 'sec14.html#sec14.43', 'sec14.html#sec14.44', 'sec14.html#sec14.45', 'sec14.html#sec14.46', 'sec14.html#sec14.47',
    'sec19.html#sec19.5.1',
    'http://tools.ietf.org/html/rfc2068#section-19.7.1.1',
    'http://tools.ietf.org/html/rfc2109#section-4.2.2', 'http://tools.ietf.org/html/rfc2109#section-4.3.4', 'http://en.wikipedia.org/wiki/Meta_refresh', 'http://www.w3.org/TR/cors/#$1-response-header', 'http://www.w3.org/TR/cors/#$1-request-header',
    'http://en.wikipedia.org/wiki/$1', 'http://msdn.microsoft.com/library/cc288472.aspx#_replace', 'http://msdn.microsoft.com/en-us/library/dd565640.aspx', 'http://msdn.microsoft.com/library/cc817574.aspx', 'http://en.wikipedia.org/wiki/X-Requested-With', 'http://noarchive.net/xrobots/'
  ],
  mail: ['http://tools.ietf.org/html/rfc2076#section-3.$key',
    '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16'
  ],
  sql: ['http://dev.mysql.com/doc/mysql/en/$key',
    'alter-event.html', 'alter-table.html', 'alter-view.html', 'analyze-table.html', 'create-event.html', 'create-function.html', 'create-procedure.html', 'create-index.html', 'create-table.html', 'create-trigger.html', 'create-view.html', 'drop-index.html', 'drop-table.html', 'begin-end.html', 'optimize-table.html', 'repair-table.html', 'set-transaction.html', 'show-columns.html', 'show-engines.html', 'show-index.html', 'show-processlist.html', 'show-status.html', 'show-tables.html', 'show-variables.html',
    '$1.html', '$1-statement.html', 'if-statement.html', 'repeat-statement.html', 'truncate-table.html', 'commit.html', 'savepoints.html', 'lock-tables.html', 'charset-connection.html', 'insert-on-duplicate.html', 'fulltext-search.html', 'example-auto-increment.html',
    'comparison-operators.html#operator_$1', 'comparison-operators.html#function_$1', 'any-in-some-subqueries.html', 'all-subqueries.html', 'exists-and-not-exists-subqueries.html', 'group-by-modifiers.html', 'string-functions.html#operator_$1', 'string-comparison-functions.html#operator_$1', 'regexp.html#operator_$1', 'regexp.html#operator_regexp', 'logical-operators.html#operator_$1', 'control-flow-functions.html#operator_$1', 'arithmetic-functions.html#operator_$1', 'cast-functions.html#operator_$1', 'date-and-time-functions.html#function_$1', 'date-and-time-functions.html#function_date-add',
    '', // keywords without link
    'numeric-type-overview.html', 'date-and-time-type-overview.html', 'string-type-overview.html', 'mathematical-functions.html#function_$1', 'information-functions.html#function_$1',
    'comparison-operators.html#function_$1', 'control-flow-functions.html#function_$1', 'string-functions.html#function_$1', 'string-comparison-functions.html#function_$1', 'mathematical-functions.html#function_$1', 'date-and-time-functions.html#function_$1', 'cast-functions.html#function_$1', 'xml-functions.html#function_$1', 'bit-functions.html#function_$1', 'encryption-functions.html#function_$1', 'information-functions.html#function_$1', 'miscellaneous-functions.html#function_$1', 'group-by-functions.html#function_$1',
    'row-subqueries.html',
    'fulltext-search.html#function_match'
  ],
  sqlset: ['http://dev.mysql.com/doc/mysql/en/$key',
    'innodb-parameters.html#sysvar_$1',
    'mysql-cluster-program-options-mysqld.html#option_mysqld_$1', 'mysql-cluster-replication-conflict-resolution.html#option_mysqld_$1', 'mysql-cluster-replication-schema.html', 'mysql-cluster-replication-starting.html', 'mysql-cluster-system-variables.html#sysvar_$1',
    'replication-options-binary-log.html#option_mysqld_$1', 'replication-options-binary-log.html#sysvar_$1', 'replication-options-master.html#sysvar_$1', 'replication-options-slave.html#option_mysqld_log-slave-updates', 'replication-options-slave.html#option_mysqld_$1', 'replication-options-slave.html#sysvar_$1', 'replication-options.html#option_mysqld_$1',
    'server-options.html#option_mysqld_big-tables', 'server-options.html#option_mysqld_$1',
    'server-system-variables.html#sysvar_$1', // previously server-session-variables
    'server-system-variables.html#sysvar_low_priority_updates', 'server-system-variables.html#sysvar_max_join_size', 'server-system-variables.html#sysvar_$1',
    'ssl-options.html#option_general_$1'
  ],
  sqlstatus: ['http://dev.mysql.com/doc/mysql/en/$key',
    'server-status-variables.html#statvar_Com_xxx',
    'server-status-variables.html#statvar_$1'
  ],
  sqlite: ['http://www.sqlite.org/$key',
    'lang_$1.html', 'lang_createvtab.html', 'lang_transaction.html',
    'lang_createindex.html', 'lang_createtable.html', 'lang_createtrigger.html', 'lang_createview.html',
    '',
    'lang_expr.html#$1', 'lang_corefunc.html#$1', 'lang_datefunc.html#$1', 'lang_aggfunc.html#$1'
  ],
  sqliteset: ['http://www.sqlite.org/pragma.html#$key',
    'pragma_$1'
  ],
  sqlitestatus: ['http://www.sqlite.org/compile.html#$key',
    '$1'
  ],
  pgsql: ['http://www.postgresql.org/docs/current/static/$key',
    'sql-$1.html', 'sql-$1.html', 'sql-alteropclass.html', 'sql-createopclass.html', 'sql-dropopclass.html',
    'functions-datetime.html', 'functions-info.html', 'functions-logical.html', 'functions-comparison.html', 'functions-matching.html', 'functions-conditional.html', 'functions-subquery.html',
    'functions-math.html', 'functions-string.html', 'functions-binarystring.html', 'functions-formatting.html', 'functions-datetime.html', 'functions-geometry.html', 'functions-net.html', 'functions-sequence.html', 'functions-array.html', 'functions-aggregate.html', 'functions-srf.html', 'functions-info.html', 'functions-admin.html'
  ],
  pgsqlset: ['http://www.postgresql.org/docs/current/static/runtime-config-$key.html#GUC-$1',
    'autovacuum', 'client', 'compatible', 'connection', 'custom', 'developer', 'file-locations', 'locks', 'logging', 'preset', 'query', 'resource', 'statistics', 'wal'
  ],
  mssql: ['http://msdn.microsoft.com/library/$key.aspx',
    'ms181700', 'ms178543', 'ms188372', 'ms189526', 'ms186865', 'ms178578', 'ms174387', 'ms190337', 'ms190487', 'ms187804', 'ms187377', 'ms188386', 'ms188929', 'ms187922', 'ms188362', 'ms177603', 'ms181271', 'ms188365', 'ms181765', 'ms187368', 'ms176089', 'ms188748', 'ms175035', 'ms188387', 'ms177938', 'ms184391', 'ms178628', 'ms190295', 'ms181708', 'ms174366', 'bb630352', 'ms187819', 'bb677335', 'bb630289', 'ms188782', 'ms187746', 'ms188927', 'ms180169', 'ms189835', 'ms188338', 'ms189748', 'ms182587', 'ms182706', 'ms176030', 'ms177521', 'ms188055', 'ms188332', 'ms181362', 'ms188336', 'ms180152', 'ms173773', 'ms173812', 'ms177634', 'cc280766', 'cc280487', 'ms178624', 'ms188037', 'ms180188', 'ms187965', 'ms177673', 'ms180199', 'bb677290', 'ms186775', 'ms182717', 'ms177682', 'ms174335', 'ms187745', 'ms188029', 'ms188795', 'ms173730', 'ms186764', 'ms180016', 'ms179859', 'bb510625', 'ms179882', 'ms174987', 'ms186939', 'ms189455', 'ms187993', 'ms190500', 'ms174433', 'ms190499', 'ms190322', 'ms188361', 'ms188385', 'ms177564', 'ms189461', 'ms176047', 'ms190372', 'ms186336', 'ms187972', 'ms174998', 'ms178632', 'ms187728', 'ms181299', 'ms174973', 'ms182776', 'ms188378', 'ms189499', 'ms188407', 'ms190356', 'ms188767', 'ms182418', 'ms175064', 'ms173829', 'bb677243', 'ms189463', 'ms175976', 'ms177570', 'ms180026', 'ms187942', 'ms177523', 'ms187348', 'ms189466', 'ms188366', 'ms186290', 'ms187331', 'ms188047', 'ms178642', 'ms175972', 'ms177607', 'ms186838', 'ms189797',
    'ms182741', 'ms181491', 'ms189524', 'ms174430', 'bb934170', 'ms187798', 'ms178528', 'ms189522', 'bb677184', 'ms176061', 'cc280404', 'bb677241', 'ms173565', 'ms181591', 'ms189453', 'bb677289', 'ms189520', 'ms187317', 'cc280405', 'ms186755', 'ms188783', 'ms189751', 'ms174382', 'ms187744', 'ms187802', 'ms179854', 'ms187926', 'ms190495', 'ms178024', 'bb895329', 'ms187936', 'ms186742', 'ms188064', 'ms189462', 'cc280448', 'cc280767', 'ms190332', 'ms188038', 'ms188357', 'ms177544', 'ms174979', 'ms189799', 'ms175007', 'ms173463', 'ms187956', 'bb934146', 'ms176009',
    'ms186847', 'ms177517', 'ms177514', 'ms188389', 'bb964728', 'ms179906', 'ms190475', 'ms189450', 'bb677309', 'ms178613', 'cc280479', 'bb630256', 'ms188747', 'ms181586', 'ms174414', 'bb630257', 'ms188403', 'ms184393', 'cc280482', 'ms190290', 'ms176118', 'ms188012', 'ms180071', 'ms186728', 'ms187759', 'ms181249', 'ms174969', 'ms190480', 'ms177539', 'bb933779', 'ms174988', 'ms189449', 'ms186791', 'ms186751', 'cc280899', 'cc280603', 'ms174990', 'ms186977', 'ms175075', 'ms182698', 'ms174996', 'ms173790', 'ms173497', 'ms174407', 'ms189438', 'ms173492', 'bb933867', 'ms189448',
    'ms188900', 'ms186711', 'ms187311', 'ms187359', 'bb933778', 'ms189511', 'ms187923', 'bb677336', 'ms174269', 'cc280645', 'bb630389', 'ms186332', 'bb630368', 'ms176095', 'ms188359', 'cc280871', 'ms186967', 'ms188388', 'ms189828', 'ms186937', 'ms187345', 'ms186307', 'ms190347', 'ms189762', 'ms189529', 'ms190363', 'bb934013', 'bb934024', 'ms189775', 'ms187353', 'ms173423', 'cc280563', 'cc280682', 'ms176036', 'ms187788', 'ms189440', 'ms190273', 'ms176072', 'ms176060', 'ms173846', 'bb895361', 'ms189778',
    'ms189800', 'ms178627', 'ms189749', 'ms178647', 'ms189770', 'ms177545', 'ms181581', 'ms188750', 'ms189508', 'cc627393', 'ms181746', 'ms173854', 'ms177677', 'ms173784', 'ms187928', 'ms189818', 'ms187324', 'ms180142', 'ms187323', 'ms186323', 'ms189788', 'ms188920', 'ms190349', 'ms190305', 'ms188732', 'ms174974', 'ms174968', 'ms186329', 'bb895240', 'ms187787', 'ms189760', 'ms180125', 'ms189534', 'ms188919', 'ms188921', 'ms175997', 'ms190317', 'cc627408', 'ms187352', 'ms188751', 'ms176050', 'ms177609', 'ms187319', 'ms176049', 'ms186823', 'ms173486', 'ms186819', 'ms189794', 'ms174395', 'ms174420', 'ms176052', 'ms186274', 'ms189753', 'ms188796', 'ms189507', 'ms178601', 'ms181860', 'ms365420', 'ms182559', 'ms188910', 'ms178566', 'ms173825', 'ms188753', 'ms186950', 'ms188061', 'ms174361', 'ms190357', 'ms178600', 'ms190358', 'ms175069', 'ms188398', 'ms178567', 'ms180031', 'ms173781', 'ms179857', 'ms182063', 'ms186275', 'ms181399', 'ms186980', 'ms176088', 'ms188069', 'ms188401', 'ms178531', 'ms186788', 'ms176078', 'ms177652', 'ms190370', 'ms188418', 'bb934014', 'ms181825', 'ms174960', 'ms188383', 'ms178635', 'ms178544', 'bb510624', 'ms187718', 'ms189802', 'ms174415', 'ms177605', 'ms178598', 'ms175098', 'ms189795', 'ms189834', 'ms186773', 'ms187729', 'ms178545', 'ms186271', 'cc627401', 'ms176015', 'ms187347', 'ms184325', 'ms186272', 'ms187385', 'ms189457', 'cc645960', 'ms177601', 'ms190329', 'ms190319', 'ms175121', 'ms345412', 'ms174400', 'ms177827', 'ms187751', 'ms179916', 'bb839514', 'ms187813', 'ms182673', 'ms190348', 'ms189786', 'ms175126', 'ms177562', 'ms176090', 'ms190328', 'ms186301', 'bb326599', 'ms176105', 'ms188390', 'ms179856', 'ms188427', 'ms190312', 'ms186918', 'bb895328', 'ms189492', 'ms188006', 'bb895239', 'ms188395', 'ms186915', 'ms189512', 'ms174276', 'ms189830', 'dd822792', 'dd822791', 'ms176114', 'ms189742', 'ms178592', 'ms177610', 'ms176102', 'ms187365', 'ms186963', 'ms176069', 'ms186862', 'ms174383', 'ms180040', 'ms177532', 'ms175003', 'ms186734', 'ms181406', 'ms178660', 'ms188797', 'ms175068', 'ms190315', 'ms174396', 'ms177587', 'ms175001', 'ms186297', 'ms188420', 'ms187913', 'ms187920', 'ms188377', 'ms187384', 'ms187950', 'ms178550', 'ms176108', 'ms173569', 'ms190330', 'ms190474', 'ms176080', 'ms189527', 'ms188043', 'ms187748', 'ms187810', 'ms176042', 'ms187934', 'ms179889', 'ms174427', 'bb677244', 'bb630353', 'bb677334', 'cc645882', 'bb630387', 'ms179930', 'ms190338', 'ms186881', 'ms176068', 'ms187362', 'bb630335', 'ms182737', 'ms181628', 'ms189750', 'ms188419', 'ms180059', 'ms187326', 'ms180055', 'ms186738', 'ms181466', 'ms188014', 'ms188735', 'ms178631', 'ms187791', 'ms187339', 'ms190316', 'ms186313'
  ],
  oracle: ['http://download.oracle.com/docs/cd/B19306_01/server.102/b14200/$key',
    'statements_1003.htm', 'statements_1004.htm', 'statements_1005.htm', 'statements_1006.htm', 'statements_1007.htm', 'statements_1008.htm', 'statements_1009.htm', 'statements_1010.htm', 'statements_2001.htm', 'statements_2002.htm', 'statements_2003.htm', 'statements_2004.htm', 'statements_2005.htm', 'statements_2006.htm', 'statements_2007.htm', 'statements_2008.htm', 'statements_2009.htm', 'statements_2010.htm', 'statements_2011.htm', 'statements_2012.htm', 'statements_2013.htm', 'statements_3001.htm', 'statements_3002.htm', 'statements_4001.htm', 'statements_4002.htm', 'statements_4003.htm', 'statements_4004.htm', 'statements_4005.htm', 'statements_4006.htm', 'statements_4007.htm', 'statements_4008.htm', 'statements_4009.htm', 'statements_4010.htm', 'statements_5001.htm', 'statements_5002.htm', 'statements_5003.htm', 'statements_5004.htm', 'statements_5005.htm', 'statements_5006.htm', 'statements_5007.htm', 'statements_5008.htm', 'statements_5009.htm', 'statements_5010.htm', 'statements_5011.htm', 'statements_5012.htm', 'statements_6001.htm', 'statements_6002.htm', 'statements_6003.htm', 'statements_6004.htm', 'statements_6005.htm', 'statements_6006.htm', 'statements_6007.htm', 'statements_6008.htm', 'statements_6009.htm', 'statements_6010.htm', 'statements_6011.htm', 'statements_6012.htm', 'statements_6013.htm', 'statements_6014.htm', 'statements_6015.htm', 'statements_6016.htm', 'statements_7001.htm', 'statements_7002.htm', 'statements_7003.htm', 'statements_7004.htm', 'statements_8001.htm', 'statements_8002.htm', 'statements_8003.htm', 'statements_8004.htm', 'statements_8005.htm', 'statements_8006.htm', 'statements_8007.htm', 'statements_8008.htm', 'statements_8009.htm', 'statements_8010.htm', 'statements_8011.htm', 'statements_8012.htm', 'statements_8013.htm', 'statements_8014.htm', 'statements_8015.htm', 'statements_8016.htm', 'statements_8017.htm', 'statements_8018.htm', 'statements_8019.htm', 'statements_8020.htm', 'statements_8021.htm', 'statements_8022.htm', 'statements_8023.htm', 'statements_8024.htm', 'statements_8025.htm', 'statements_8026.htm', 'statements_8027.htm', 'statements_8028.htm', 'statements_9001.htm', 'statements_9002.htm', 'statements_9003.htm', 'statements_9004.htm', 'statements_9005.htm', 'statements_9006.htm', 'statements_9007.htm', 'statements_9008.htm', 'statements_9009.htm', 'statements_9010.htm', 'statements_9011.htm', 'statements_9012.htm', 'statements_9013.htm', 'statements_9014.htm', 'statements_9015.htm', 'statements_9016.htm', 'statements_9017.htm', 'statements_9018.htm', 'statements_9019.htm', 'statements_9020.htm', 'statements_9021.htm', 'statements_10001.htm', 'statements_10002.htm', 'statements_10003.htm', 'statements_10004.htm', 'statements_10005.htm', 'statements_10006.htm', 'statements_10007.htm',
    'functions002.htm', 'functions003.htm', 'functions004.htm', 'functions005.htm', 'functions006.htm', 'functions007.htm', 'functions008.htm', 'functions009.htm', 'functions010.htm', 'functions011.htm', 'functions012.htm', 'functions013.htm', 'functions014.htm', 'functions015.htm', 'functions016.htm', 'functions017.htm', 'functions018.htm', 'functions019.htm', 'functions020.htm', 'functions021.htm', 'functions022.htm', 'functions023.htm', 'functions024.htm', 'functions025.htm', 'functions026.htm', 'functions027.htm', 'functions028.htm', 'functions029.htm#i1279881', 'functions029.htm#i1281694', 'functions030.htm', 'functions031.htm', 'functions032.htm', 'functions033.htm', 'functions034.htm', 'functions035.htm', 'functions036.htm', 'functions037.htm', 'functions038.htm', 'functions039.htm', 'functions040.htm', 'functions041.htm', 'functions042.htm', 'functions043.htm', 'functions044.htm', 'functions045.htm', 'functions046.htm', 'functions047.htm', 'functions048.htm', 'functions049.htm', 'functions050.htm', 'functions052.htm', 'functions053.htm', 'functions054.htm', 'functions055.htm', 'functions056.htm', 'functions057.htm', 'functions058.htm', 'functions059.htm', 'functions060.htm', 'functions061.htm', 'functions062.htm', 'functions063.htm', 'functions064.htm', 'functions065.htm', 'functions066.htm', 'functions067.htm', 'functions068.htm', 'functions069.htm', 'functions070.htm', 'functions071.htm', 'functions072.htm', 'functions073.htm', 'functions074.htm', 'functions075.htm', 'functions076.htm', 'functions077.htm', 'functions078.htm', 'functions079.htm', 'functions080.htm', 'functions081.htm', 'functions082.htm', 'functions083.htm', 'functions084.htm', 'functions085.htm', 'functions086.htm', 'functions087.htm', 'functions088.htm', 'functions089.htm', 'functions090.htm', 'functions091.htm', 'functions092.htm', 'functions093.htm', 'functions094.htm', 'functions095.htm', 'functions096.htm', 'functions097.htm', 'functions098.htm', 'functions099.htm', 'functions100.htm', 'functions101.htm', 'functions102.htm', 'functions103.htm', 'functions104.htm', 'functions105.htm', 'functions106.htm', 'functions107.htm', 'functions108.htm', 'functions109.htm', 'functions110.htm', 'functions111.htm', 'functions112.htm', 'functions113.htm', 'functions114.htm', 'functions115.htm', 'functions116.htm', 'functions117.htm', 'functions118.htm', 'functions119.htm', 'functions120.htm', 'functions121.htm', 'functions122.htm', 'functions123.htm', 'functions124.htm', 'functions125.htm', 'functions126.htm', 'functions127.htm', 'functions128.htm', 'functions129.htm', 'functions130.htm', 'functions131.htm', 'functions132.htm', 'functions133.htm', 'functions134.htm', 'functions135.htm', 'functions137.htm', 'functions138.htm', 'functions139.htm', 'functions140.htm', 'functions141.htm', 'functions142.htm', 'functions143.htm', 'functions144.htm', 'functions145.htm', 'functions146.htm', 'functions147.htm', 'functions148.htm', 'functions149.htm', 'functions150.htm', 'functions151.htm', 'functions152.htm', 'functions153.htm', 'functions154.htm', 'functions155.htm', 'functions156.htm', 'functions157.htm#sthref2125', 'functions157.htm#sthref2129', 'functions157.htm#sthref2132', 'functions158.htm', 'functions159.htm', 'functions160.htm', 'functions161.htm', 'functions162.htm', 'functions163.htm', 'functions164.htm', 'functions165.htm', 'functions166.htm', 'functions167.htm', 'functions168.htm', 'functions169.htm', 'functions170.htm', 'functions171.htm', 'functions172.htm', 'functions173.htm', 'functions174.htm', 'functions175.htm', 'functions176.htm', 'functions177.htm', 'functions178.htm', 'functions179.htm', 'functions182.htm', 'functions183.htm', 'functions184.htm', 'functions185.htm', 'functions186.htm', 'functions187.htm', 'functions190.htm', 'functions191.htm', 'functions192.htm', 'functions193.htm', 'functions194.htm', 'functions195.htm', 'functions196.htm', 'functions198.htm', 'functions199.htm', 'functions200.htm', 'functions202.htm', 'functions203.htm', 'functions204.htm', 'functions205.htm', 'functions206.htm', 'functions207.htm', 'functions208.htm', 'functions209.htm', 'functions210.htm', 'functions211.htm', 'functions212.htm', 'functions213.htm', 'functions214.htm', 'functions215.htm', 'functions216.htm', 'functions217.htm', 'functions218.htm', 'functions219.htm', 'functions220.htm', 'functions221.htm', 'functions222.htm', 'functions223.htm', 'functions224.htm', 'functions225.htm', 'functions226.htm', 'functions227.htm', 'functions228.htm', 'functions229.htm'
  ],
  cnf: ['http://httpd.apache.org/docs/current/mod/$key.html#$1',
    'beos', 'core', 'mod_actions', 'mod_alias', 'mod_auth_basic', 'mod_auth_digest', 'mod_authn_alias', 'mod_authn_anon', 'mod_authn_dbd', 'mod_authn_dbm', 'mod_authn_default', 'mod_authn_file', 'mod_authnz_ldap', 'mod_authz_dbm', 'mod_authz_default', 'mod_authz_groupfile', 'mod_authz_host', 'mod_authz_owner', 'mod_authz_user', 'mod_autoindex', 'mod_cache', 'mod_cern_meta', 'mod_cgi', 'mod_cgid', 'mod_dav', 'mod_dav_fs', 'mod_dav_lock', 'mod_dbd', 'mod_deflate', 'mod_dir', 'mod_disk_cache', 'mod_dumpio', 'mod_echo', 'mod_env', 'mod_example', 'mod_expires', 'mod_ext_filter', 'mod_file_cache', 'mod_filter', 'mod_charset_lite', 'mod_ident', 'mod_imagemap', 'mod_include', 'mod_info', 'mod_isapi', 'mod_ldap', 'mod_log_config', 'mod_log_forensic', 'mod_mem_cache', 'mod_mime', 'mod_mime_magic', 'mod_negotiation', 'mod_nw_ssl', 'mod_proxy', 'mod_rewrite', 'mod_setenvif', 'mod_so', 'mod_speling', 'mod_ssl', 'mod_status', 'mod_substitute', 'mod_suexec', 'mod_userdir', 'mod_usertrack', 'mod_version', 'mod_vhost_alias', 'mpm_common', 'mpm_netware', 'mpm_winnt', 'prefork'
  ],
  js: ['https://developer.mozilla.org/en/$key',
    'JavaScript/Reference/Global_Objects/$1',
    'JavaScript/Reference/Statements/$1',
    'JavaScript/Reference/Statements/do...while',
    'JavaScript/Reference/Statements/if...else',
    'JavaScript/Reference/Statements/try...catch',
    'JavaScript/Reference/Operators/Special/$1',
    'DOM/document.$1', 'DOM/element.$1', 'DOM/event.$1', 'DOM/form.$1', 'DOM/table.$1', 'DOM/window.$1',
    'http://www.w3.org/TR/XMLHttpRequest/',
    'JavaScript/Reference/Global_Objects/Array/$1',
    'JavaScript/Reference/Global_Objects/Date/$1',
    'JavaScript/Reference/Global_Objects/Function/$1',
    'JavaScript/Reference/Global_Objects/Number/$1',
    'JavaScript/Reference/Global_Objects/RegExp/$1',
    'JavaScript/Reference/Global_Objects/String/$1'
  ]
};

jush.links = {
  tag: {
    'interact/forms': /^(button|fieldset|form|input|isindex|label|legend|optgroup|option|select|textarea)$/i,
    'interact/scripts': /^(noscript)$/i,
    'present/frames': /^(frame|frameset|iframe|noframes)$/i,
    'present/graphics': /^(b|basefont|big|center|font|hr|i|s|small|strike|tt|u)$/i,
    'struct/dirlang': /^(bdo)$/i,
    'struct/global': /^(address|body|div|h1|h2|h3|h4|h5|h6|head|html|meta|span|title)$/i,
    'struct/links': /^(a|base|link)$/i,
    'struct/lists': /^(dd|dir|dl|dt|li|menu|ol|ul)$/i,
    'struct/objects': /^(applet|area|img|map|object|param)$/i,
    'struct/tables': /^(caption|col|colgroup|table|tbody|td|tfoot|th|thead|tr)$/i,
    'struct/text': /^(abbr|acronym|blockquote|br|cite|code|del|dfn|em|ins|kbd|p|pre|q|samp|strong|sub|sup|var)$/i
  },
  tag_css: {'present/styles': /^(style)$/i},
  tag_js: {'interact/scripts': /^(script)$/i},
  att_css: {'present/styles': /^(style)$/i},
  att_js: {'interact/scripts': /^(onblur|onchange|onclick|ondblclick|onfocus|onkeydown|onkeypress|onkeyup|onload|onmousedown|onmousemove|onmouseout|onmouseover|onmouseup|onreset|onselect|onsubmit|onunload|onunload)$/i},
  att_http: {'struct/global': /^(http-equiv)$/i},
  att: {
    'interact/forms': /^(accept-charset|accept|accesskey|action|align-LEGEND|checked|cols-TEXTAREA|disabled|enctype|for|label-OPTION|label-OPTGROUP|maxlength|method|multiple|name-BUTTON|name-SELECT|name-FORM|name-INPUT|prompt|readonly|rows-TEXTAREA|selected|size-INPUT|size-SELECT|src|tabindex|type-INPUT|type-BUTTON|value-INPUT|value-OPTION|value-BUTTON)$/i,
    'interact/scripts': /^(defer|language|src-SCRIPT|type-SCRIPT)$/i,
    'present/frames': /^(cols-FRAMESET|frameborder|height-IFRAME|longdesc-FRAME|marginheight|marginwidth|name-FRAME|noresize|rows-FRAMESET|scrolling|src-FRAME|target|width-IFRAME)$/i,
    'present/graphics': /^(align-HR|align|bgcolor|clear|color-FONT|face-FONT|noshade|size-HR|size-FONT|size-BASEFONT|width-HR)$/i,
    'present/styles': /^(media|type-STYLE)$/i,
    'struct/dirlang': /^(dir|dir-BDO|lang)$/i,
    'struct/global': /^(alink|background|class|content|id|link|name-META|profile|scheme|text|title|version|vlink)$/i,
    'struct/links': /^(charset|href|href-BASE|hreflang|name-A|rel|rev|type-A)$/i,
    'struct/lists': /^(compact|start|type-LI|type-OL|type-UL|value-LI)$/i,
    'struct/objects': /^(align-IMG|alt|archive-APPLET|archive-OBJECT|border-IMG|classid|code|codebase-OBJECT|codebase-APPLET|codetype|coords|data|declare|height-IMG|height-APPLET|hspace|ismap|longdesc-IMG|name-APPLET|name-IMG|name-MAP|name-PARAM|nohref|object|shape|src-IMG|standby|type-OBJECT|type-PARAM|usemap|value-PARAM|valuetype|vspace|width-IMG|width-APPLET)$/i,
    'struct/tables': /^(abbr|align-CAPTION|align-TABLE|align-TD|axis|border-TABLE|cellpadding|cellspacing|char|charoff|colspan|frame|headers|height-TH|nowrap|rowspan|rules|scope|span-COL|span-COLGROUP|summary|valign|width-TABLE|width-TH|width-COL|width-COLGROUP)$/i,
    'struct/text': /^(cite-Q|cite-INS|datetime|width-PRE)$/i
  },
  css_val: {
    'aural': /^(azimuth|cue-after|cue-before|cue|elevation|pause-after|pause-before|pause|pitch-range|pitch|play-during|richness|speak-header|speak-numeral|speak-punctuation|speak|speech-rate|stress|voice-family|volume)$/i,
    'box': /^(border(?:-top|-right|-bottom|-left)?(?:-color|-style|-width)?|margin(?:-top|-right|-bottom|-left)?|padding(?:-top|-right|-bottom|-left)?)$/i,
    'colors': /^(background-attachment|background-color|background-image|background-position|background-repeat|background|color)$/i,
    'fonts': /^(font-family|font-size|font-style|font-variant|font-weight|font)$/i,
    'generate': /^(content|counter-increment|counter-reset|list-style-image|list-style-position|list-style-type|list-style|quotes)$/i,
    'page': /^(orphans|page-break-after|page-break-before|page-break-inside|widows)$/i,
    'tables': /^(border-collapse|border-spacing|caption-side|empty-cells|table-layout)$/i,
    'text': /^(letter-spacing|text-align|text-decoration|text-indent|text-transform|white-space|word-spacing)$/i,
    'ui': /^(cursor|outline-color|outline-style|outline-width|outline)$/i,
    'visudet': /^(height|line-height|max-height|max-width|min-height|min-width|vertical-align|width)$/i,
    'visufx': /^(clip|overflow|visibility)$/i,
    'visuren': /^(bottom|clear|direction|display|float|left|position|right|top|unicode-bidi|z-index)$/i
  },
  css_at: {
    'page.html#page-box': /^page$/i,
    'media.html#at-media-rule': /^media$/i,
    'cascade.html#at-import': /^import$/i
  },
  js_write: {'document': /^(write|writeln)$/},
  js_http: {'method': /^(setRequestHeader|getResponseHeader)$/},
  php_new: {
    'http://www.php.net/language.oop5.basic#language.oop5.basic.$val': /^(class|new|extends)$/i,
    'http://www.php.net/language.oop5.interfaces#language.oop5.interfaces.$val': /^(implements|interface)$/i,
    'http://www.php.net/language.operators.type': /^instanceof$/i
  },
  php_met: {
    'language.oop5.paamayim-nekudotayim': /^(self|parent|static)$/i,
    'reserved.classes#reserved.classes.$val': /^Closure$/i,
    'ref.sqlite#sqlite.class.$val': /^(SQLiteDatabase|SQLiteResult|SQLiteUnbuffered)$/i,
    'class.$val': /^(ArrayAccess|ErrorException|Exception|Iterator|IteratorAggregate|Serializable|Traversable|AMQPConnection|AMQPConnectionException|AMQPException|AMQPExchange|AMQPExchangeException|AMQPQueue|AMQPQueueException|APCIterator|Cairo|CairoAntialias|CairoContent|CairoContext|CairoException|CairoExtend|CairoFillRule|CairoFilter|CairoFontFace|CairoFontOptions|CairoFontSlant|CairoFontType|CairoFontWeight|CairoFormat|CairoGradientPattern|CairoHintMetrics|CairoHintStyle|CairoImageSurface|CairoLinearGradient|CairoLineCap|CairoLineJoin|CairoMatrix|CairoOperator|CairoPath|CairoPattern|CairoPatternType|CairoPdfSurface|CairoPsLevel|CairoPsSurface|CairoRadialGradient|CairoScaledFont|CairoSolidPattern|CairoStatus|CairoSubpixelOrder|CairoSurface|CairoSurfacePattern|CairoSurfaceType|CairoSvgSurface|CairoSvgVersion|CairoToyFontFace|chdb|DateInterval|DatePeriod|DateTime|DateTimeZone|DOMAttr|DOMCdataSection|DOMCharacterData|DOMComment|DOMDocument|DOMDocumentFragment|DOMDocumentType|DOMElement|DOMEntity|DOMEntityReference|DOMException|DOMImplementation|DOMNamedNodeMap|DOMNode|DOMNodeList|DOMNotation|DOMProcessingInstruction|DOMText|DOMXPath|GearmanClient|GearmanException|GearmanJob|GearmanTask|GearmanWorker|Gmagick|GmagickDraw|GmagickException|GmagickPixel|GmagickPixelException|HaruAnnotation|HaruDestination|HaruDoc|HaruEncoder|HaruException|HaruFont|HaruImage|HaruOutline|HaruPage|HttpDeflateStream|HttpInflateStream|HttpMessage|HttpQueryString|HttpRequest|HttpRequestPool|HttpResponse|Imagick|ImagickDraw|ImagickPixel|ImagickPixelIterator|Collator|IntlDateFormatter|Locale|MessageFormatter|Normalizer|NumberFormatter|ResourceBundle|Spoofchecker|Transliterator|JsonSerializable|Judy|KTaglib_MPEG_Audioproperties|KTaglib_ID3v2_AttachedPictureFrame|KTagLib_ID3v2_Frame|KTagLib_ID3v2_Tag|KTagLib_MPEG_File|KTaglib_Tag|libXMLError|Memcache|Memcached|MemcachedException|SWFAction|SWFBitmap|SWFButton|SWFDisplayItem|SWFFill|SWFFont|SWFFontChar|SWFGradient|SWFMorph|SWFMovie|SWFPrebuiltClip|SWFShape|SWFSound|SWFSoundInstance|SWFSprite|SWFText|SWFTextField|SWFVideoStream|Mongo|MongoBinData|MongoCode|MongoCollection|MongoConnectionException|MongoCursor|MongoCursorException|MongoCursorTimeoutException|MongoDate|MongoDB|MongoDBRef|MongoException|MongoGridFS|MongoGridFSCursor|MongoGridFSException|MongoGridFSFile|MongoId|MongoInt32|MongoInt64|MongoMaxKey|MongoMinKey|MongoRegex|MongoTimestamp|MySQLi|MySQLi_Driver|MySQLi_Result|MySQLi_STMT|mysqli_warning|OAuth|OAuthException|OAuthProvider|PDO|PDOException|PDOStatement|Phar|PharData|PharException|PharFileInfo|RarArchive|RarEntry|RarException|Reflection|ReflectionClass|ReflectionException|ReflectionExtension|ReflectionFunction|ReflectionFunctionAbstract|ReflectionMethod|ReflectionObject|ReflectionParameter|ReflectionProperty|ReflectionZendExtension|Reflector|RRDCreator|RRDGraph|RRDUpdater|SimpleXMLElement|SNMP|SoapClient|SoapFault|SoapHeader|SoapParam|SoapServer|SoapVar|SolrClient|SolrClientException|SolrDocument|SolrDocumentField|SolrException|SolrGenericResponse|SolrIllegalArgumentException|SolrIllegalOperationException|SolrInputDocument|SolrModifiableParams|SolrObject|SolrParams|SolrPingResponse|SolrQuery|SolrQueryResponse|SolrResponse|SolrUpdateResponse|SolrUtils|SphinxClient|AppendIterator|ArrayIterator|ArrayObject|BadFunctionCallException|BadMethodCallException|CachingIterator|CallbackFilterIterator|Countable|DirectoryIterator|DomainException|EmptyIterator|FilesystemIterator|FilterIterator|GlobIterator|InfiniteIterator|InvalidArgumentException|IteratorIterator|LengthException|LimitIterator|LogicException|MultipleIterator|NoRewindIterator|OuterIterator|OutOfBoundsException|OutOfRangeException|OverflowException|ParentIterator|RangeException|RecursiveArrayIterator|RecursiveCachingIterator|RecursiveCallbackFilterIterator|RecursiveDirectoryIterator|RecursiveFilterIterator|RecursiveIterator|RecursiveIteratorIterator|RecursiveRegexIterator|RecursiveTreeIterator|RegexIterator|RuntimeException|SeekableIterator|SimpleXMLIterator|SplDoublyLinkedList|SplFileInfo|SplFileObject|SplFixedArray|SplHeap|SplMaxHeap|SplMinHeap|SplObjectStorage|SplObserver|SplPriorityQueue|SplQueue|SplStack|SplSubject|SplTempFileObject|UnderflowException|UnexpectedValueException|SplBool|SplEnum|SplFloat|SplInt|SplString|SQLiteDatabase|SQLiteResult|SQLiteUnbuffered|SQLite3|SQLite3Result|SQLite3Stmt|Stomp|StompException|StompFrame|streamWrapper|SVM|SVMException|SVMModel|Tidy|TidyNode|TokyoTyrant|tokyotyrantexception|TokyoTyrantIterator|TokyoTyrantQuery|TokyoTyrantTable|V8Js|V8JsException|XMLReader|XSLTProcessor|ZipArchive|dir)$/i
  },
  php_fun: {'http://www.php.net/functions.user-defined': /^function$/i},
  php_var: {
    'globals': /^\$GLOBALS$/,
    'server': /^\$_SERVER$/,
    'get': /^\$_GET$/,
    'post': /^\$_POST$/,
    'files': /^\$_FILES$/,
    'request': /^\$_REQUEST$/,
    'session': /^\$_SESSION$/,
    'environment': /^\$_ENV$/,
    'cookies': /^\$_COOKIE$/,
    'phperrormsg': /^\$php_errormsg$/,
    'httprawpostdata': /^\$HTTP_RAW_POST_DATA$/,
    'httpresponseheader': /^\$http_response_header$/,
    'argc': /^\$argc$/,
    'argv': /^\$argv$/
  },
  php_php: {'function': new RegExp('^' + jush.php_function + '$', 'i')},
  php_sql: {'function': new RegExp('^' + jush.sql_function + '$', 'i')},
  php_sqlite: {'function': new RegExp('^' + jush.sqlite_function + '$', 'i')},
  php_pgsql: {'function': new RegExp('^' + jush.pgsql_function + '$', 'i')},
  php_mssql: {
    'http://www.php.net/function.$val': /^mssql_query$/i,
    'cc296181': /^sqlsrv_prepare$/i,
    'cc296184': /^sqlsrv_query$/i
  },
  php_oracle: {'function': new RegExp('^' + jush.oracle_function + '$', 'i')},
  php_phpini: {'function': /^(ini_get|ini_set)$/i},
  php_http: {'function': /^header$/i},
  php_mail: {'function': /^mail$/i},
  php_echo: {'function': /^(echo|print)$/i},
  php_halt: {'function': /^__halt_compiler$/i},
  sql_sqlset: {'set-option.html': /.+/},
  sqlite_sqliteset: {'pragma.html': /.+/},
  pgsql_pgsqlset: {'sql-$val.html': /.+/},
  cnf_http: {'mod_cache': /CacheIgnoreHeaders/i, 'mod_headers': /.+/},
  cnf_php: {'configuration.file': /.+/},
  cnf_phpini: {'configuration.changes.apache': /.+/}
};

// first and last () is used as delimiter
jush.links2 = {
  php2: /(\b)((?:exit|die|return|(?:include|require)(?:_once)?|(end(?:for|foreach|if|switch|while|declare))|(break|continue|declare|else|elseif|for|foreach|if|switch|while|goto)|(do)|(as)|(case|default)|(var)|(__(?:CLASS|FILE|FUNCTION|LINE|METHOD|DIR|NAMESPACE)__)|(catch|throw|try)|(abstract|final)|(clone)|(const)|(private|protected|public)|(and|x?or)|(global|static)|(namespace|use)|(trait))\b|((?:a(?:cosh?|ddc?slashes|ggregat(?:e(?:_(?:methods(?:_by_(?:list|regexp))?|properties(?:_by_(?:list|regexp))?|info))?|ion_info)|p(?:ache_(?:get(?:_(?:modules|version)|env)|re(?:s(?:et_timeout|ponse_headers)|quest_headers)|(?:child_termina|no)te|lookup_uri|setenv)|c_(?:c(?:ache_info|(?:lear_cach|ompile_fil)e)|de(?:fine_constants|lete)|s(?:ma_info|tore)|add|fetch|load_constants)|d_(?:c(?:(?:allstac|lun|roa)k|ontinue)|dump_(?:function_table|(?:persistent|regular)_resources)|set_(?:session(?:_trace(?:_socket)?)?|pprof_trace)|breakpoint|echo|get_active_symbols))|r(?:ray(?:_(?:c(?:o(?:mbine|unt_values)|h(?:ange_key_case|unk))|diff(?:_(?:u(?:assoc|key)|assoc|key))?|f(?:il(?:l(?:_keys)?|ter)|lip)|intersect(?:_(?:u(?:assoc|key)|assoc|key))?|key(?:_exist)?s|m(?:erge(?:_recursive)?|ap|ultisort)|p(?:ad|op|roduct|ush)|r(?:e(?:place(?:_recursive)?|(?:duc|vers)e)|and)|s(?:earch|hift|p?lice|um)|u(?:diff(?:_u?assoc)?|intersect(?:_u?assoc)?|n(?:ique|shift))|walk(?:_recursive)?|values))?|sort)|s(?:inh?|sert(?:_options)?|ort)|tan[2h]?|bs)|b(?:ase(?:64_(?:de|en)code|_convert|name)|bcode_(?:add_(?:element|smiley)|set_(?:arg_parser|flags)|(?:creat|pars)e|destroy)|c(?:m(?:od|ul)|ompiler_(?:load(?:_exe)?|write_(?:c(?:lass|onstant)|f(?:unction(?:s_from_file)?|ile|ooter)|(?:exe_foot|head)er|included_filename)|parse_class|read)|pow(?:mod)?|s(?:cale|qrt|ub)|add|comp|div)|in(?:d(?:_textdomain_codeset|ec|textdomain)|2hex)|son_(?:de|en)code|z(?:c(?:lose|ompress)|err(?:no|(?:o|st)r)|decompress|flush|open|read|write))|c(?:a(?:iro_(?:a(?:rc(?:_negative)?|vailable_(?:font|surface)s|ppend_path)|c(?:l(?:ip(?:_(?:extents|preserve|rectangle_list))?|ose_path)|opy_pa(?:th(?:_flat)?|ge)|reate|urve_to)|device_to_user(?:_distance)?|f(?:ill(?:_(?:extents|preserve))?|o(?:nt_(?:face_(?:get_type|status)|options_(?:get_(?:hint_(?:metrics|style)|antialias|subpixel_order)|s(?:et_(?:hint_(?:metrics|style)|antialias|subpixel_order)|tatus)|(?:creat|merg)e|equal|hash)|extents)|rmat_stride_for_width))|g(?:et_(?:dash(?:_count)?|f(?:ont_(?:face|matrix|options)|ill_rule)|line_(?:cap|join|width)|m(?:atrix|iter_limit)|s(?:caled_font|ource)|t(?:arget|olerance)|antialias|(?:current_poin|group_targe)t|operator)|lyph_path)|i(?:mage_surface_(?:create(?:_f(?:or_data|rom_png))?|get_(?:data|(?:forma|heigh)t|stride|width))|n_(?:fill|stroke)|dentity_matrix)|m(?:a(?:sk(?:_surface)?|trix_(?:create_(?:scal|translat)e|in(?:it(?:_(?:identity|(?:(?:rot|transl)at|scal)e))?|vert)|trans(?:form_(?:distance|point)|late)|multiply|(?:rotat|scal)e))|ove_to)|new_(?:sub_)?path|p(?:a(?:int(?:_with_alpha)?|t(?:tern_(?:add_color_stop_rgba?|create_(?:r(?:gba?|adial)|for_surface|linear)|get_(?:color_stop_(?:count|rgba)|r(?:adial_circles|gba)|extend|filter|linear_points|matrix|(?:surfac|typ)e)|s(?:et_(?:extend|filter|matrix)|tatus))|h_extents))|df_surface_(?:creat|set_siz)e|op_group(?:_to_source)?|s_(?:surface_(?:dsc_(?:begin_(?:page_)?setup|comment)|set_(?:eps|size)|create|get_eps|restrict_to_level)|get_levels|level_to_string)|ush_group(?:_with_content)?)|r(?:e(?:l_(?:(?:cur|mo)v|lin)e_to|s(?:et_clip|tore)|ctangle)|otate)|s(?:cale(?:d_font_(?:g(?:et_(?:font_(?:face|matrix|options)|ctm|scale_matrix|type)|lyph_extents)|create|(?:(?:text_)?extent|statu)s))?|e(?:t_(?:f(?:ont_(?:(?:fac|siz)e|matrix|options)|ill_rule)|line_(?:cap|join|width)|m(?:atrix|iter_limit)|s(?:ource(?:_surface)?|caled_font)|antialias|dash|operator|tolerance)|lect_font_face)|how_(?:page|text)|t(?:atus(?:_to_string)?|roke(?:_(?:extents|preserve))?)|urface_(?:c(?:opy_page|reate_similar)|f(?:ini|lu)sh|get_(?:(?:conten|device_offse)t|font_options|type)|mark_dirty(?:_rectangle)?|s(?:et_(?:device_offset|fallback_resolution)|how_page|tatus)|write_to_png)|vg_(?:surface_(?:create|restrict_to_version)|get_versions|version_to_string)|ave)|t(?:ext_(?:extents|path)|rans(?:form|late))|user_to_device(?:_distance)?|version(?:_string)?|has_current_point|line_to)|l(?:_(?:days_in_month|(?:from|to)_jd|info)|cul_?hmac|l_user_(?:func(?:_array)?|method(?:_array)?)))|l(?:ass(?:_(?:alia|(?:exis|(?:implem|par)en)t)s|kit_(?:method_(?:re(?:defin|mov|nam)e|add|copy)|import))|ose(?:dir|log)|earstatcache)|o(?:llator_(?:c(?:ompar|reat)e|get_(?:error_(?:cod|messag)e|s(?:ort_key|trength)|(?:attribut|local)e)|s(?:et_(?:attribute|strength)|ort(?:_with_sort_keys)?)|asort)|m(?:_(?:get(?:_active_object)?|load(?:_typelib)?|pr(?:op(?:[gs]e|pu)t|int_typeinfo)|addref|create_guid|event_sink|isenum|message_pump|release|set)|pact)|n(?:nection_(?:aborted|status|timeout)|vert_(?:uu(?:de|en)code|cyr_string)|stant)|sh?|unt(?:_chars)?|py)|r(?:ack_(?:c(?:losedict|heck)|getlastmessage|opendict)|c32|eate_function|ypt)|type_(?:al(?:num|pha)|p(?:rin|unc)t|cntrl|x?digit|graph|(?:low|upp)er|space)|ur(?:l_(?:c(?:los|opy_handl)e|e(?:rr(?:no|or)|xec)|multi_(?:in(?:fo_read|it)|(?:(?:add|remove)_handl|clos)e|exec|(?:getconten|selec)t)|setopt(?:_array)?|getinfo|init|version)|rent)|yrus_(?:c(?:lose|onnect)|authenticate|(?:un)?bind|query)|h(?:eckd(?:ate|nsrr)|o(?:p|wn)|r(?:oot)?|dir|grp|mod|unk_split)|eil)|d(?:ate(?:_(?:create(?:_from_format)?|d(?:efault_timezone_[gs]et|ate_set|iff)|i(?:nterval_(?:create_from_date_string|format)|sodate_set)|parse(?:_from_format)?|su(?:n(?:_info|rise|set)|b)|time(?:stamp_[gs]et|zone_[gs]et|_set)|add|(?:forma|offset_ge)t|get_last_errors|modify)|fmt_(?:get_(?:error_(?:cod|messag)e|time(?:type|zone_id)|calendar|(?:datetyp|local)e|pattern)|set_(?:calendar|lenient|pattern|timezone_id)|(?:creat|localtim|pars)e|(?:forma|is_lenien)t))?|b(?:2_(?:c(?:l(?:ient_info|ose)|o(?:lumn(?:_privilege)?s|nn(?:_error(?:msg)?|ect)|mmit)|ursor_type)|e(?:xec(?:ute)?|scape_string)|f(?:etch_(?:a(?:rray|ssoc)|both|object|row)|ield_(?:n(?:ame|um)|(?:display_siz|scal|typ)e|precision|width)|ree_(?:resul|stm)t|oreign_keys)|l(?:ast_insert_i|ob_rea)d|n(?:um_(?:field|row)s|ext_result)|p(?:c(?:lose|onnect)|r(?:ocedure(?:_column)?s|epare|imary_keys))|r(?:esult|ollback)|s(?:e(?:rver_info|t_option)|t(?:mt_error(?:msg)?|atistics)|pecial_columns)|table(?:_privilege)?s|autocommit|bind_param|get_option)|a(?:_(?:f(?:etch|irstkey)|op(?:en|timize)|(?:clos|delet|replac)e|(?:exist|handler)s|(?:inser|key_spli|lis)t|nextkey|popen|sync)|se_(?:c(?:los|reat)e|get_(?:record(?:_with_names)?|header_info)|num(?:fiel|recor)ds|(?:add|(?:delet|replac)e)_record|open|pack))|plus_(?:a(?:dd|ql)|c(?:lose|(?:ur|hdi)r)|err(?:code|no)|f(?:i(?:nd|rst)|ree(?:(?:all|r)locks|lock)|lush)|get(?:lock|unique)|l(?:ast|ockrel)|r(?:c(?:r(?:t(?:exact|like)|eate)|hperm)|es(?:olve|torepos)|keys|open|query|rename|secindex|unlink|zap)|s(?:etindex(?:bynumber)?|avepos|ql)|t(?:cl|remove)|u(?:n(?:do(?:prepare)?|lockrel|select)|pdate)|x(?:un)?lockrel|info|next|open|prev)|x_(?:c(?:o(?:mpare|nnect)|lose)|e(?:rror|scape_string)|fetch_row|query|sort))|cn?gettext|e(?:bug_(?:(?:print_)?backtrace|zval_dump)|c(?:bin|oct|hex)|fine(?:_syslog_variables|d)?|aggregate|g2rad)|i(?:o_(?:s(?:eek|tat)|t(?:csetattr|runcate)|(?:clos|writ)e|fcntl|open|read)|sk(?:_(?:free|total)_space|freespace)|(?:rnam)?e)|n(?:s_(?:get_(?:mx|record)|check_record)|gettext)|o(?:m(?:xml_(?:open_(?:file|mem)|x(?:slt_(?:stylesheet(?:_(?:doc|file))?|version)|mltree)|new_doc|version)|_import_simplexml)|tnet_load|ubleval)|gettext|l)|e(?:a(?:ster_da(?:te|ys)|ch)|n(?:chant_(?:broker_(?:d(?:escribe|ict_exists)|free(?:_dict)?|request_(?:pwl_)?dict|get_error|init|list_dicts|set_ordering)|dict_(?:add_to_(?:personal|session)|s(?:tore_replacemen|ugges)t|describe|get_error|(?:quick_)?check|is_in_session))|d)|r(?:eg(?:i(?:_replace)?|_replace)?|ror_(?:get_last|(?:lo|reportin)g))|scapeshell(?:arg|cmd)|v(?:ent_(?:b(?:ase_(?:loop(?:break|exit)?|free|new|(?:priority_ini|se)t)|uffer_(?:f(?:d_set|ree)|w(?:atermark_set|rite)|(?:base|priority|timeout)_set|(?:dis|en)able|new|read))|add|del|free|new|set)|al)|x(?:i(?:f_(?:t(?:agname|humbnail)|imagetype|read_data)|t)|p(?:ect_(?:expectl|popen)|lode|m1)?|t(?:ension_loaded|ract)|ec)|cho|mpty|zmlm_hash)|f(?:am_(?:c(?:ancel_monitor|lose)|monitor_(?:collection|directory|file)|next_event|open|pending|(?:resume|suspend)_monitor)|bsql_(?:a(?:ffected_rows|utocommit)|c(?:lo(?:b_siz|s)e|o(?:mmi|nnec)t|reate_(?:[bc]lo|d)b|hange_user)|d(?:ata(?:base(?:_password)?|_seek)|b_(?:query|status)|rop_db)|err(?:no|or)|f(?:etch_(?:a(?:rray|ssoc)|field|lengths|object|row)|ield_(?:t(?:abl|yp)e|flags|len|name|seek)|ree_result)|list_(?:db|field|table)s|n(?:um_(?:field|row)s|ext_result)|p(?:assword|connect)|r(?:e(?:ad_[bc]lob|sult)|o(?:llback|ws_fetched))|s(?:e(?:t_(?:characterset|lob_mode|password|transaction)|lect_db)|t(?:art|op)_db)|table_?name|(?:blob_siz|(?:host|user)nam)e|get_autostart_info|insert_id|query|warnings)|df_(?:add_(?:doc_javascript|template)|c(?:los|reat)e|e(?:rr(?:no|or)|num_values)|get_(?:a(?:p|ttachment)|f(?:ile|lags)|v(?:alue|ersion)|encoding|opt|status)|open(?:_string)?|s(?:ave(?:_string)?|et_(?:f(?:ile|lags)|o(?:n_import_javascri)?pt|s(?:tatus|ubmit_form_action)|v(?:alue|ersion)|ap|encoding|javascript_action|target_frame))|header|next_field_name|remove_item)|get(?:c(?:sv)?|ss?)|i(?:l(?:e(?:_(?:exis|(?:ge|pu)t_conten)ts|p(?:ro(?:_(?:field(?:count|(?:nam|typ)e|width)|r(?:etrieve|owcount)))?|erms)|(?:[acm]tim|inod|siz|typ)e|group|owner)?|ter_(?:i(?:nput(?:_array)?|d)|var(?:_array)?|has_var|list))|nfo_(?:buffer|(?:clos|fil)e|open|set_flags))|l(?:o(?:atval|ck|or)|ush)|o(?:rward_static_call(?:_array)?|pen)|p(?:ut(?:csv|s)|assthru|rintf)|r(?:e(?:a|nchtoj)d|ibidi_log2vis)|s(?:canf|eek|ockopen|tat)|t(?:p_(?:c(?:h(?:dir|mod)|dup|lose|onnect)|f(?:ge|pu)t|get(?:_option)?|m(?:dtm|kdir)|n(?:b_(?:f(?:ge|pu)t|continue|(?:ge|pu)t)|list)|p(?:asv|ut|wd)|r(?:aw(?:list)?|ename|mdir)|s(?:i[tz]e|et_option|sl_connect|ystype)|(?:allo|exe)c|delete|login|quit)|ell|ok|runcate)|unc(?:_(?:get_args?|num_args)|tion_exists)|(?:clos|writ)e|eof|(?:flus|nmatc)h|mod)|g(?:c_(?:enabled?|collect_cycles|disable)|e(?:oip_(?:co(?:untry_(?:code3?_by_name|name_by_name)|ntinent_code_by_name)|d(?:b_(?:avail|filename|get_all_info)|atabase_info)|i(?:d|sp)_by_name|re(?:gion_(?:by_nam|name_by_cod)e|cord_by_name)|org_by_name|time_zone_by_country_and_region)|t(?:_(?:c(?:lass(?:_(?:method|var)s)?|alled_class|(?:fg_va|urrent_use)r)|de(?:clared_(?:class|interfac)es|fined_(?:constant|function|var)s)|h(?:eaders|tml_translation_table)|include(?:_path|d_files)|m(?:agic_quotes_(?:gpc|runtime)|eta_tags)|re(?:quired_files|source_type)|browser|(?:extension_func|loaded_extension|object_var|parent_clas)s)|host(?:by(?:namel?|addr)|name)|m(?:y(?:[gpu]id|inode)|xrr)|protobyn(?:ame|umber)|r(?:andmax|usage)|servby(?:name|port)|t(?:ext|imeofday|ype)|allheaders|(?:cw|lastmo)d|(?:dat|imagesiz)e|env|opt))|m(?:p_(?:a(?:bs|[dn]d)|c(?:lrbit|mp|om)|div(?:_(?:qr?|r)|exact)?|gcd(?:ext)?|in(?:(?:i|ver)t|tval)|m(?:od|ul)|ne(?:g|xtprime)|p(?:o(?:wm?|pcount)|(?:erfect_squar|rob_prim)e)|s(?:can[01]|qrt(?:rem)?|etbit|ign|trval|ub)|(?:fac|hamdis|testbi)t|jacobi|legendre|x?or|random)|(?:dat|(?:mk|strf)tim)e)|nupg_(?:add(?:(?:de|en)crypt|sign)key|clear(?:(?:de|en)crypt|sign)keys|decrypt(?:verify)?|e(?:ncrypt(?:sign)?|xport)|get(?:error|protocol)|i(?:mpor|ni)t|s(?:et(?:armor|(?:error|sign)mode)|ign)|keyinfo|verify)|r(?:apheme_(?:s(?:tr(?:i(?:pos|str)|ri?pos|len|pos|str)|ubstr)|extract)|egoriantojd)|upnp_(?:cont(?:ext_(?:get_(?:host_ip|(?:por|subscription_timeou)t)|(?:un)?host_path|new|set_subscription_timeout|timeout_add)|rol_point_(?:browse_st(?:art|op)|callback_set|new))|device_(?:info_get(?:_service)?|action_callback_set)|root_device_(?:get_(?:available|relative_location)|s(?:t(?:art|op)|et_available)|new)|service_(?:action_(?:return(?:_error)?|[gs]et)|in(?:fo_get(?:_introspection)?|trospection_get_state_variable)|proxy_(?:a(?:ction_[gs]et|dd_notify)|se(?:nd_action|t_subscribed)|callback_set|get_subscribed|remove_notify)|(?:(?:freeze|thaw)_)?notify))|z(?:c(?:lose|ompress)|de(?:cod|flat)e|e(?:ncode|of)|get(?:ss?|c)|p(?:assthru|uts)|re(?:a|win)d|(?:fil|(?:infla|wri)t)e|open|seek|tell|uncompress)|d_info|lob|opher_parsedir)|h(?:ash(?:_(?:fi(?:le|nal)|hmac(?:_file)?|update(?:_(?:file|stream))?|algos|copy|init))?|e(?:ader(?:s_(?:lis|sen)t|_remove)?|brevc?|xdec)|ighlight_(?:file|string)|t(?:ml(?:specialchars(?:_decode)?|_entity_decode|entities)|tp_build_query)|w(?:_(?:a(?:pi_(?:attribute|(?:conten|objec)t)|rray2objrec)|c(?:onnect(?:ion_info)?|h(?:ildren(?:obj)?|angeobject)|lose|p)|d(?:oc(?:byanchor(?:obj)?|ument_(?:s(?:etcontent|ize)|attributes|bodytag|content))|eleteobject|ummy)|e(?:rror(?:msg)?|dittext)|get(?:an(?:chors(?:obj)?|dlock)|child(?:coll(?:obj)?|doccoll(?:obj)?)|object(?:byquery(?:coll(?:obj)?|obj)?)?|parents(?:obj)?|re(?:mote(?:children)?|llink)|srcbydestobj|text|username)|i(?:n(?:s(?:ert(?:anchors|(?:documen|objec)t)|coll|doc)|collections|fo)|dentify)|m(?:apid|odifyobject|v)|o(?:bjrec2array|utput_document)|p(?:connec|ipedocumen)t|s(?:etlinkroo|ta)t|(?:(?:free|new)_documen|roo)t|unlock|who)|api_hgcsp)|ypot)|i(?:base_(?:a(?:dd_user|ffected_rows)|b(?:lob_(?:c(?:ancel|(?:los|reat)e)|i(?:mport|nfo)|add|echo|get|open)|ackup)|c(?:o(?:mmit(?:_ret)?|nnect)|lose)|d(?:b_info|elete_user|rop_db)|e(?:rr(?:code|msg)|xecute)|f(?:etch_(?:assoc|object|row)|ree_(?:event_handler|query|result)|ield_info)|m(?:aintain_db|odify_user)|n(?:um_(?:field|param)s|ame_result)|p(?:aram_info|connect|repare)|r(?:ollback(?:_ret)?|estore)|se(?:rv(?:ice_(?:at|de)tach|er_info)|t_event_handler)|t(?:imefmt|rans)|gen_id|query|wait_event)|conv(?:_(?:mime_(?:decode(?:_headers)?|encode)|s(?:tr(?:len|r?pos)|et_encoding|ubstr)|get_encoding))?|d(?:3_(?:get_(?:frame_(?:long|short)_name|genre_(?:id|list|name)|tag|version)|(?:remove|set)_tag)|n_(?:to_(?:u(?:nicode|tf8)|ascii)|strerror)|ate)|fx(?:_(?:b(?:lobinfile_mode|yteasvarchar)|c(?:o(?:nnect|py_blob)|reate_(?:blob|char)|lose)|error(?:msg)?|f(?:ield(?:properti|typ)es|ree_(?:blob|char|result)|etch_row)|get(?:_(?:blob|char)|sqlca)|nu(?:m_(?:field|row)s|llformat)|p(?:connect|repare)|update_(?:blob|char)|affected_rows|do|htmltbl_result|query|textasvarchar)|us_(?:c(?:los|reat)e_slob|(?:(?:fre|writ)e|open|read|seek|tell)_slob))|is_(?:get_(?:s(?:erv(?:er_(?:by_(?:comment|path)|rights)|ice_state)|cript_map)|dir_security)|s(?:et_(?:s(?:cript_map|erver_rights)|app_settings|dir_security)|t(?:art_serv(?:er|ice)|op_serv(?:er|ice)))|(?:add|remove)_server)|m(?:a(?:ge(?:_type_to_(?:extension|mime_type)|a(?:lphablending|ntialias|rc)|c(?:o(?:lor(?:a(?:llocate(?:alpha)?|t)|closest(?:alpha|hwb)?|exact(?:alpha)?|resolve(?:alpha)?|s(?:et|forindex|total)|deallocate|match|transparent)|py(?:merge(?:gray)?|res(?:ampl|iz)ed)?|nvolution)|reate(?:from(?:g(?:d(?:2(?:part)?)?|if)|x[bp]m|(?:jpe|(?:p|stri)n)g|wbmp)|truecolor)?|har(?:up)?)|d(?:ashedline|estroy)|f(?:il(?:l(?:ed(?:arc|(?:ellips|rectangl)e|polygon)|toborder)?|ter)|ont(?:height|width)|t(?:bbox|text))|g(?:d2?|rab(?:screen|window)|ammacorrect|if)|i(?:nterlace|struecolor)|l(?:(?:ayereffec|oadfon)t|ine)|p(?:s(?:e(?:ncode|xtend)font|bbox|(?:(?:free|load|slant)fon|tex)t)|alettecopy|ng|olygon)|r(?:ectangl|otat)e|s(?:et(?:t(?:hickness|ile)|brush|pixel|style)|tring(?:up)?|avealpha|[xy])|t(?:tf(?:bbox|text)|ruecolortopalette|ypes)|2?wbmp|ellipse|jpeg|xbm)|p_(?:a(?:lerts|ppend)|b(?:ody(?:struct)?|ase64|inary)|c(?:l(?:earflag_full|ose)|reatemailbox|heck)|delete(?:mailbox)?|e(?:rrors|xpunge)|fetch(?:_overview|body|header|structure)|g(?:et(?:_quota(?:root)?|acl|mailboxes|subscribed)|c)|header(?:info|s)?|l(?:ist(?:s(?:can|ubscribed)|mailbox)?|ast_error|sub)|m(?:ail(?:_(?:co(?:mpose|py)|move)|boxmsginfo)?|ime_header_decode|sgno)|num_(?:msg|recent)|r(?:e(?:namemailbox|open)|fc822_(?:parse_(?:adrlist|headers)|write_address))|s(?:e(?:t(?:_quota|(?:ac|flag_ful)l)|arch)|avebody|canmailbox|ort|tatus|ubscribe)|t(?:hread|imeout)|u(?:n(?:delet|subscrib)e|tf(?:7_(?:de|en)code|8)|id)|(?:8bi|qprin)t|open|ping))|p(?:lode|ort_request_variables))|n(?:et_(?:ntop|pton)|gres_(?:autocommit(?:_state)?|c(?:o(?:mmi|nnec)t|lose|ursor|harset)|e(?:rr(?:no|or|sqlstate)|scape_string|xecute)|f(?:etch_(?:a(?:rray|ssoc)|object|proc_return|row)|ield_(?:n(?:am|ullabl)e|length|precision|(?:scal|typ)e)|ree_result)|n(?:um_(?:field|row)s|ext_error)|p(?:connect|repare)|r(?:esult_see|ollbac)k|(?:unbuffered_)?query|set_environment)|i_(?:get(?:_all)?|alter|restore|set)|otify_(?:r(?:ead|m_watch)|add_watch|init|queue_len)|t(?:l_(?:get_error_(?:cod|messag)e|(?:error_nam|is_failur)e)|erface_exists|val)|_array|clued_get_data)|p(?:tc(?:embed|parse)|2long)|s(?:_(?:a(?:rray)?|d(?:ir|ouble)|f(?:i(?:l|nit)e|loat)|in(?:t(?:eger)?|finite)|l(?:ink|ong)|n(?:u(?:ll|meric)|an)|re(?:a(?:dable|l)|source)|s(?:calar|oap_fault|tring|ubclass_of)|write?able|bool|(?:(?:call|execut)ab|uploaded_fi)le|object)|set)|terator_(?:(?:appl|to_arra)y|count)|gnore_user_abort)|j(?:ava_last_exception_(?:clear|get)|d(?:to(?:j(?:ewish|ulian)|french|gregorian|unix)|dayofweek|monthname)|son_(?:(?:de|en)code|last_error)|(?:ewish|ulian)tojd|oin|peg2wbmp)|k(?:adm5_(?:c(?:reate|hpass)_principal|de(?:lete_principal|stroy)|get_p(?:rincipals?|olicies)|flush|init_with_password|modify_principal)|ey|r?sort)|l(?:c(?:h(?:grp|own)|first|g_value)|dap_(?:c(?:o(?:mpare|nnect|unt_entries)|lose)|d(?:elete|n2ufn)|e(?:rr(?:(?:2st|o)r|no)|xplode_dn)|f(?:irst_(?:(?:attribut|referenc)e|entry)|ree_result)|get_(?:values(?:_len)?|(?:attribut|entri)es|(?:d|optio)n)|mod(?:_(?:add|del|replace)|ify)|next_(?:(?:attribut|referenc)e|entry)|parse_re(?:ference|sult)|re(?:ad|name)|s(?:e(?:t_(?:option|rebind_proc)|arch)|asl_bind|ort|tart_tls)|8859_to_t61|(?:ad|(?:un)?bin)d|list|t61_to_8859)|i(?:bxml_(?:get_(?:errors|last_error)|(?:clear|use_internal)_errors|disable_entity_loader|set_streams_context)|nk(?:info)?|st)|o(?:cal(?:e(?:_(?:get_(?:d(?:isplay_(?:(?:languag|nam)e|region|(?:scrip|varian)t)|efault)|(?:all_variant|keyword)s|primary_language|region|script)|(?:accept_from_htt|looku)p|(?:compo|par)se|filter_matches|set_default)|conv)|time)|g(?:1[0p])?|ng2ip)|zf_(?:(?:de)?compress|optimized_for)|evenshtein|stat|trim)|m(?:_(?:c(?:o(?:nnect(?:ionerror)?|mpleteauthorizations)|heckstatus)|de(?:stroy(?:conn|engine)|letetrans)|get(?:c(?:ell(?:bynum)?|ommadelimited)|header)|i(?:nit(?:conn|engine)|scommadelimited)|m(?:axconntimeout|onitor)|num(?:column|row)s|re(?:sponse(?:keys|param)|turnstatus)|s(?:et(?:ssl(?:_(?:cafile|files))?|blocking|dropfile|ip|timeout)|slcert_gen_hash)|trans(?:actionssent|inqueue|keyval|new|send)|v(?:erify(?:connection|sslcert)|alidateidentifier)|parsecommadelimited|uwait)|a(?:il(?:parse_(?:msg_(?:extract_(?:part(?:_file)?|whole_part_file)|get_(?:part(?:_data)?|structure)|parse(?:_file)?|(?:creat|fre)e)|determine_best_xfer_encoding|rfc822_parse_addresses|stream_encode|uudecode_all))?|x(?:db_(?:a(?:ffected_rows|utocommit)|bind_(?:param|result)|c(?:l(?:ient_encoding|ose)|o(?:nnect(?:_err(?:no|or))?|mmit)|ha(?:nge_user|racter_set_name))|d(?:isable_r(?:eads_from_master|pl_parse)|ata_seek|ebug|ump_debug_info)|e(?:nable_r(?:eads_from_master|pl_parse)|rr(?:no|or)|mbedded_connect|scape_string|xecute)|f(?:etch(?:_(?:a(?:rray|ssoc)|field(?:_direct|s)?|lengths|object|row))?|ield_(?:count|seek|tell)|ree_result)|get_(?:client_(?:info|version)|server_(?:info|version)|(?:host|proto)_info|metadata)|in(?:fo|it|sert_id)|m(?:(?:aster|ulti)_query|ore_results)|n(?:um_(?:field|row)s|ext_result)|p(?:aram_count|ing|repare)|r(?:e(?:al_(?:connect|escape_string|query)|port)|pl_(?:p(?:arse_enabled|robe)|query_type)|ollback)|s(?:e(?:nd_(?:long_data|query)|rver_(?:end|init)|lect_db|t_opt)|t(?:mt_(?:bind_(?:param|result)|close(?:_long_data)?|e(?:rr(?:no|or)|xecute)|f(?:etch|ree_result)|p(?:aram_count|repare)|res(?:et|ult_metadata)|s(?:end_long_data|qlstate|tore_result)|(?:affected|num)_rows|data_seek|init)|(?:a|ore_resul)t)|qlstate|sl_set)|thread_(?:id|safe)|kill|options|query|(?:use_resul|warning_coun)t))?|gic_quotes_runtime)|b_(?:c(?:onvert_(?:case|encoding|kana|variables)|heck_encoding)|de(?:code_(?:mimeheader|numericentity)|tect_(?:encoding|order))|e(?:ncode_(?:mimeheader|numericentity)|reg(?:_(?:search(?:_(?:get(?:po|reg)s|init|(?:(?:set)?po|reg)s))?|match|replace)|i(?:_replace)?)?)|http_(?:in|out)put|l(?:anguage|ist_encodings)|p(?:arse_str|referred_mime_name)|regex_(?:encoding|set_options)|s(?:tr(?:i(?:mwidth|pos|str)|r(?:i(?:chr|pos)|chr|pos)|to(?:low|upp)er|cut|len|pos|str|width)|ubst(?:r(?:_count)?|itute_character)|end_mail|plit)|get_info|internal_encoding|output_handler)|crypt_(?:c(?:bc|fb|reate_iv)|e(?:nc(?:_(?:get_(?:(?:(?:algorithm|mode)s_nam|(?:block|iv|key)_siz)e|supported_key_sizes)|is_block_(?:algorithm(?:_mode)?|mode)|self_test)|rypt)|cb)|ge(?:neric(?:_(?:(?:de)?init|end))?|t_(?:(?:block|iv|key)_siz|cipher_nam)e)|list_(?:algorithm|mode)s|module_(?:get_(?:algo_(?:block|key)_size|supported_key_sizes)|is_block_(?:algorithm(?:_mode)?|mode)|close|open|self_test)|decrypt|ofb)|d(?:5(?:_file)?|ecrypt_generic)|e(?:m(?:ory_get_(?:peak_)?usage|cache_debug)|t(?:aphone|hod_exists))|hash(?:_(?:get_(?:block_siz|hash_nam)e|count|keygen_s2k))?|i(?:n(?:g_(?:set(?:s(?:cale|wfcompression)|cubicthreshold)|use(?:constants|swfversion)|keypress))?|(?:crotim|me_content_typ)e)|k(?:dir|time)|o(?:ney_format|ve_uploaded_file)|qseries_(?:b(?:ack|egin)|c(?:onnx?|lose|mit)|put1?|s(?:et|trerror)|disc|get|inq|open)|s(?:ession_(?:c(?:o(?:nnec|un)t|reate)|d(?:estroy|isconnect)|get(?:_(?:array|data))?|l(?:ist(?:var)?|ock)|set(?:_(?:array|data))?|un(?:iq|lock)|find|inc|plugin|randstr|timeout)|g(?:_(?:re(?:ceiv|move_queu)e|s(?:e(?:nd|t_queue)|tat_queue)|get_queue|queue_exists)|fmt_(?:format(?:_message)?|get_(?:error_(?:cod|messag)e|locale|pattern)|parse(?:_message)?|create|set_pattern))|ql(?:_(?:c(?:reate_?db|lose|onnect)|d(?:b(?:_query|name)|ata_seek|rop_db)|f(?:etch_(?:array|field|object|row)|ield(?:_(?:t(?:abl|yp)e|flags|len|name|seek)|t(?:abl|yp)e|flags|len|name)|ree_result)|list_(?:db|field|table)s|num(?:_(?:field|row)s|(?:field|row)s)|re(?:gcase|sult)|affected_rows|error|pconnect|query|select_db|tablename))?|sql_(?:c(?:lose|onnect)|f(?:etch_(?:a(?:rray|ssoc)|batch|field|object|row)|ield_(?:length|(?:nam|typ)e|seek)|ree_(?:resul|statemen)t)|g(?:et_last_message|uid_string)|min_(?:error|message)_severity|n(?:um_(?:field|row)s|ext_result)|r(?:esult|ows_affected)|bind|data_seek|execute|(?:ini|pconnec)t|query|select_db))|t_(?:getrandmax|s?rand)|ysql(?:_(?:c(?:l(?:ient_encoding|ose)|onnect|reate_db)|d(?:b_(?:name|query)|ata_seek|rop_db)|e(?:rr(?:no|or)|scape_string)|f(?:etch_(?:a(?:rray|ssoc)|field|lengths|object|row)|ield_(?:t(?:abl|yp)e|flags|len|name|seek)|ree_result)|get_(?:(?:clien|hos)t|proto|server)_info|in(?:fo|sert_id)|list_(?:db|field|(?:process|tabl)e)s|num_(?:field|row)s|p(?:connect|ing)|re(?:al_escape_string|sult)|s(?:e(?:lect_db|t_charset)|tat)|t(?:ablename|hread_id)|affected_rows|(?:unbuffered_)?query)|i_(?:a(?:ffected_rows|utocommit)|bind_(?:param|result)|c(?:l(?:ient_encoding|ose)|o(?:nnect(?:_err(?:no|or))?|mmit)|ha(?:nge_user|racter_set_name))|d(?:isable_r(?:eads_from_master|pl_parse)|ata_seek|ebug|ump_debug_info)|e(?:mbedded_server_(?:end|start)|nable_r(?:eads_from_master|pl_parse)|rr(?:no|or)|scape_string|xecute)|f(?:etch(?:_(?:a(?:ll|rray|ssoc)|field(?:_direct|s)?|lengths|object|row))?|ield_(?:count|seek|tell)|ree_result)|get_(?:c(?:lient_(?:info|stats|version)|(?:ache|onnection)_stats|harset)|server_(?:info|version)|(?:host|proto)_info|metadata|warnings)|in(?:fo|it|sert_id)|m(?:(?:aster|ulti)_query|ore_results)|n(?:um_(?:field|row)s|ext_result)|p(?:aram_count|ing|oll|repare)|r(?:e(?:a(?:l_(?:connect|escape_string|query)|p_async_query)|port)|pl_(?:p(?:arse_enabled|robe)|query_type)|ollback)|s(?:e(?:nd_(?:long_data|query)|t_(?:local_infile_(?:default|handler)|(?:charse|op)t)|lect_db)|t(?:mt_(?:a(?:ttr_[gs]et|ffected_rows)|bind_(?:param|result)|e(?:rr(?:no|or)|xecute)|f(?:etch|(?:ield_coun|ree_resul)t)|in(?:it|sert_id)|p(?:aram_count|repare)|res(?:et|ult_metadata)|s(?:end_long_data|qlstate|tore_result)|close|data_seek|(?:get_warning|num_row)s)|(?:a|ore_resul)t)|lave_query|qlstate|sl_set)|thread_(?:id|safe)|kill|options|query|(?:use_resul|warning_coun)t)))|n(?:at(?:case)?sort|curses_(?:a(?:dd(?:ch(?:n?str)?|n?str)|ttr(?:o(?:ff|n)|set)|ssume_default_colors)|b(?:kgd(?:set)?|o(?:rder|ttom_panel)|audrate|eep)|c(?:l(?:rto(?:bot|eol)|ear)|olor_(?:conten|se)t|an_change_color|break|urs_set)|d(?:e(?:f(?:_(?:prog|shell)_mode|ine_key)|l(?:_panel|ay_output|(?:etel|wi)n|ch))|oupdate)|e(?:cho(?:char)?|rase(?:char)?|nd)|f(?:l(?:ash|ushinp)|ilter)|get(?:m(?:axyx|ouse)|ch|yx)|h(?:a(?:s_(?:i[cl]|colors|key)|lfdelay)|ide_panel|line)|i(?:n(?:it(?:_(?:colo|pai)r)?|s(?:(?:del|ert)ln|ch|s?tr)|ch)|sendwin)|k(?:ey(?:ok|pad)|illchar)|m(?:o(?:use(?:_trafo|interval|mask)|ve(?:_panel)?)|v(?:add(?:ch(?:n?str)?|n?str)|(?:cu|waddst)r|(?:del|get|in)ch|[hv]line)|eta)|n(?:ew(?:_panel|pad|win)|o(?:cbreak|echo|nl|qiflush|raw)|apms|l)|p(?:a(?:nel_(?:above|(?:bel|wind)ow)|ir_content)|(?:nout)?refresh|utp)|r(?:e(?:set(?:_(?:prog|shell)_mode|ty)|fresh|place_panel)|aw)|s(?:cr(?:_(?:dump|(?:ini|se)t|restore)|l)|lk_(?:attr(?:o(?:ff|n)|set)?|c(?:lea|olo)r|re(?:fresh|store)|(?:ini|se)t|(?:noutrefres|touc)h)|ta(?:nd(?:end|out)|rt_color)|avetty|how_panel)|t(?:erm(?:attrs|name)|imeout|op_panel|ypeahead)|u(?:nget(?:ch|mouse)|se_(?:e(?:nv|xtended_names)|default_colors)|pdate_panels)|v(?:idattr|line)|w(?:a(?:dd(?:ch|str)|ttr(?:o(?:ff|n)|set))|c(?:lear|olor_set)|mo(?:use_trafo|ve)|stand(?:end|out)|border|(?:eras|[hv]lin)e|(?:getc|(?:nout)?refres)h)|longname|qiflush)|e(?:wt_(?:b(?:utton(?:_bar)?|ell)|c(?:l(?:ear_key_buffer|s)|omp(?:onent_(?:add_callback|takes_focus)|act_button)|ursor_o(?:ff|n)|heckbox(?:_(?:set_(?:flags|value)|tree(?:_(?:get_(?:current|entry_value|(?:multi_)?selection)|set_(?:entry(?:_value)?|current|width)|(?:ad|fin)d_item|multi))?|get_value))?|entered_window|reate_grid)|d(?:raw_(?:form|root_text)|elay)|entry(?:_(?:set(?:_f(?:ilter|lags))?|get_value))?|f(?:orm(?:_(?:add_(?:components?|hot_key)|set_(?:background|height|size|timer|width)|destroy|get_current|run|watch_fd))?|inished)|g(?:rid_(?:h_(?:close_)?stacked|s(?:et_field|imple_window)|v_(?:close_)?stacked|wrapped_window(?:_at)?|add_components_to_form|basic_window|(?:fre|get_siz|plac)e)|et_screen_size)|l(?:abel(?:_set_text)?|ist(?:box(?:_(?:clear(?:_selection)?|get_(?:current|selection)|i(?:nsert_entry|tem_count)|se(?:t_(?:current(?:_by_key)?|data|entry|width)|lect_item)|(?:append|delete)_entry))?|item(?:_(?:get_data|set))?))|p(?:op_(?:help_line|window)|ush_help_line)|r(?:adio(?:_get_current|button)|e(?:f(?:low_text|resh)|s(?:ize_screen|ume)|draw_help_line)|un_form)|s(?:c(?:ale(?:_set)?|rollbar_set)|et_(?:help|suspend)_callback|uspend)|textbox(?:_(?:set_(?:heigh|tex)t|get_num_lines|reflowed))?|w(?:in_(?:me(?:ssagev?|nu)|entries|choice|ternary)|ait_for_key)|init|open_window|vertical_scrollbar)|xt)|l(?:_langinfo|2br)|o(?:rmalizer_(?:is_normalized|normalize)|tes_(?:c(?:reate_(?:db|note)|opy_db)|mark_(?:un)?read|body|drop_db|(?:find_no|nav_crea)te|header_info|list_msgs|search|unread|version))|sapi_(?:re(?:quest|sponse)_headers|virtual)|um(?:fmt_(?:format(?:_currency)?|get_(?:error_(?:cod|messag)e|(?:(?:text_)?attribut|local)e|pattern|symbol)|parse(?:_currency)?|set_(?:(?:text_)?attribute|pattern|symbol)|create)|ber_format)|gettext|thmac)|o(?:auth_(?:get_sbs|urlencode)|b_(?:end_(?:clean|flush)|g(?:et_(?:c(?:lean|ontents)|le(?:ngth|vel)|flush|status)|zhandler)|i(?:conv_handler|mplicit_flush)|clean|flush|list_handlers|start|tidyhandler)|c(?:i(?:_(?:bind_(?:array_)?by_name|c(?:o(?:mmi|nnec)t|ancel|lose)|e(?:rror|xecute)|f(?:etch(?:_(?:a(?:ll|rray|ssoc)|object|row))?|ield_(?:s(?:cal|iz)e|type(?:_raw)?|is_null|name|precision)|ree_statement)|lob_(?:copy|is_equal)|n(?:ew_(?:c(?:o(?:llection|nnect)|ursor)|descriptor)|um_(?:field|row)s)|p(?:a(?:rs|ssword_chang)e|connect)|r(?:esult|ollback)|s(?:e(?:t_(?:client_i(?:dentifier|nfo)|(?:ac|edi)tion|module_name|prefetch)|rver_version)|tatement_type)|define_by_name|internal_debug)|c(?:o(?:l(?:l(?:a(?:ssign(?:elem)?|ppend)|(?:getele|tri)m|max|size)|umn(?:s(?:cal|iz)e|type(?:raw)?|isnull|name|precision))|mmit)|ancel|loselob)|e(?:rror|xecute)|f(?:etch(?:into|statement)?|ree(?:c(?:ollection|ursor)|desc|statement))|lo(?:go(?:ff|n)|adlob)|n(?:ew(?:c(?:ollection|ursor)|descriptor)|logon|umcols)|p(?:arse|logon)|r(?:o(?:llback|wcount)|esult)|s(?:avelob(?:file)?|e(?:rverversion|tprefetch)|tatementtype)|write(?:lobtofile|temporarylob)|(?:bind|define)byname|internaldebug)|tdec)|dbc_(?:c(?:lose(?:_all)?|o(?:lumn(?:privilege)?s|(?:mmi|nnec)t)|ursor)|d(?:ata_source|o)|e(?:rror(?:msg)?|xec(?:ute)?)|f(?:etch_(?:array|into|object|row)|ield_(?:n(?:ame|um)|(?:le|precisio)n|(?:scal|typ)e)|oreignkeys|ree_result)|n(?:um_(?:field|row)s|ext_result)|p(?:r(?:ocedure(?:column)?s|epare|imarykeys)|connect)|r(?:esult(?:_all)?|ollback)|s(?:etoption|(?:pecialcolumn|tatistic)s)|table(?:privilege)?s|autocommit|binmode|gettypeinfo|longreadlen)|pen(?:al_(?:buffer_(?:d(?:ata|estroy)|create|get|loadwav)|context_(?:c(?:reate|urrent)|destroy|process|suspend)|device_(?:close|open)|listener_[gs]et|s(?:ource_(?:p(?:ause|lay)|s(?:et|top)|create|destroy|get|rewind)|tream))|ssl_(?:csr_(?:export(?:_to_file)?|get_(?:public_key|subject)|new|sign)|d(?:(?:ecryp|iges)t|h_compute_key)|e(?:ncrypt|rror_string)|get_(?:p(?:rivate|ublic)key|(?:cipher|md)_methods)|p(?:k(?:cs(?:12_(?:export(?:_to_file)?|read)|7_(?:(?:de|en)crypt|sign|verify))|ey_(?:export(?:_to_file)?|get_(?:p(?:rivate|ublic)|details)|free|new))|rivate_(?:de|en)crypt|ublic_(?:de|en)crypt)|s(?:eal|ign)|x509_(?:export(?:_to_file)?|check(?:_private_key|purpose)|(?:fre|pars)e|read)|(?:free_ke|verif)y|open|random_pseudo_bytes)|dir|log)|utput_(?:add_rewrite_var|reset_rewrite_vars)|v(?:er(?:load|ride_function)|rimos_(?:c(?:o(?:mmi|nnec)t|lose|ursor)|exec(?:ute)?|f(?:etch_(?:into|row)|ield_(?:n(?:ame|um)|len|type)|ree_result)|num_(?:field|row)s|r(?:esult(?:_all)?|ollback)|longreadlen|prepare))|rd)|p(?:a(?:rse(?:_(?:ini_(?:file|string)|str|url)|kit_(?:compile_(?:file|string)|func_arginfo))|ck|ssthru|thinfo)|c(?:ntl_(?:s(?:ig(?:nal(?:_dispatch)?|procmask|timedwait|waitinfo)|etpriority)|w(?:ait(?:pid)?|if(?:s(?:ignal|topp)ed|exited)|exitstatus|(?:stop|term)sig)|alarm|exec|fork|getpriority)|lose)|d(?:f_(?:a(?:dd_(?:l(?:aunch|ocal)link|n(?:ameddest|ote)|t(?:(?:able_cel|humbnai)l|extflow)|annotation|(?:bookmar|(?:pdf|web)lin)k|outline)|rcn?|ctivate_item|ttach_file)|begin_(?:pa(?:ge(?:_ext)?|ttern)|template(?:_ext)?|(?:docume|fo)nt|glyph|item|layer)|c(?:l(?:ose(?:_(?:pdi(?:_page)?|image)|path(?:_(?:fill_)?stroke)?)?|ip)|on(?:ca|tinue_tex)t|reate_(?:a(?:c|nnota)tion|field(?:group)?|(?:3dvie|textflo)w|bookmark|gstate|pvf)|ircle|urveto)|de(?:lete(?:_(?:t(?:able|extflow)|pvf))?|fine_layer)|en(?:d(?:_(?:pa(?:ge(?:_ext)?|ttern)|(?:docume|fo)nt|glyph|item|layer|template)|path)|coding_set_char)|fi(?:ll(?:_(?:(?:image|pdf|text)block|stroke))?|t_(?:t(?:ext(?:flow|line)|able)|(?:im|pdi_p)age)|ndfont)|get_(?:err(?:msg|num)|font(?:(?:nam|siz)e)?|image_(?:height|width)|m(?:aj|in)orversion|p(?:di_(?:parameter|value)|arameter)|(?:apinam|valu)e|buffer)|in(?:fo_(?:t(?:ext(?:flow|line)|able)|font|matchbox)|itgraphics)|l(?:oad_(?:i(?:ccprofil|mag)e|3ddata|font)|ineto)|m(?:akespotcolor|oveto)|open_(?:image(?:_file)?|pdi(?:_page)?|ccitt|(?:fil|memory_imag)e|(?:gi|tif)f|jpeg)|p(?:cos_get_(?:str(?:eam|ing)|number)|lace_(?:im|pdi_p)age|rocess_pdi)|r(?:e(?:s(?:tor|ume_pag)e|ct)|otate)|s(?:et(?:_(?:border_(?:color|dash|style)|info(?:_(?:(?:auth|creat)or|keywords|subject|title))?|l(?:ayer_dependency|eading)|text_(?:r(?:endering|ise)|matrix|pos)|duration|(?:gstat|valu)e|(?:horiz_scal|(?:char|word)_spac)ing|parameter)|dash(?:pattern)?|f(?:la|on)t|gray(?:_(?:fill|stroke))?|line(?:cap|join|width)|m(?:atrix|iterlimit)|rgbcolor(?:_(?:fill|stroke))?|color|polydash)|h(?:ading(?:_pattern)?|ow(?:_(?:boxed|xy))?|fill)|tr(?:ingwidth|oke)|(?:av|cal|uspend_pag)e|kew)|utf(?:16_to_utf8|(?:32|8)_to_utf16)|new|translate)|o_drivers)|g_(?:c(?:l(?:ient_encoding|ose)|o(?:n(?:nect(?:ion_(?:busy|reset|status))?|vert)|py_(?:from|to))|ancel_query)|d(?:bnam|elet)e|e(?:scape_(?:bytea|string)|nd_copy|xecute)|f(?:etch_(?:a(?:ll(?:_columns)?|rray|ssoc)|r(?:esult|ow)|object)|ield_(?:n(?:ame|um)|t(?:ype(?:_oid)?|able)|is_null|prtlen|size)|ree_result)|get_(?:notify|pid|result)|l(?:ast_(?:error|notice|oid)|o_(?:c(?:los|reat)e|read(?:_all)?|(?:ex|im)port|open|(?:see|unlin)k|tell|write))|num_(?:field|row)s|p(?:arameter_status|(?:connec|or)t|ing|(?:repar|ut_lin)e)|query(?:_params)?|result_(?:error(?:_field)?|s(?:eek|tatus))|se(?:nd_(?:query(?:_params)?|(?:execut|prepar)e)|t_(?:client_encoding|error_verbosity)|lect)|t(?:ra(?:ce|nsaction_status)|ty)|u(?:n(?:escape_bytea|trace)|pdate)|(?:affected_row|option)s|(?:hos|inser)t|meta_data|version)|hp(?:_(?:ini_(?:loaded_file|scanned_files)|s(?:api_nam|trip_whitespac)e|check_syntax|logo_guid|uname)|credits|info|version)|o(?:s(?:ix_(?:get(?:e[gu]id|g(?:r(?:gid|nam|oups)|id)|p(?:g(?:id|rp)|w(?:nam|uid)|p?id)|_last_error|(?:cw|[su]i)d|login|rlimit)|i(?:nitgroups|satty)|mk(?:fifo|nod)|s(?:et(?:e[gu]id|(?:p?g|[su])id)|trerror)|t(?:imes|tyname)|access|ctermid|errno|kill|uname))?|pen|w)|r(?:e(?:g_(?:match(?:_all)?|replace(?:_callback)?|(?:filte|last_erro)r|grep|quote|split)|v)|int(?:er_(?:c(?:reate_(?:brush|dc|font|pen)|lose)|d(?:elete_(?:brush|dc|font|pen)|raw_(?:r(?:ectangle|oundrect)|bmp|(?:elips|lin|pi)e|chord|text))|end_(?:doc|page)|l(?:is|ogical_fontheigh)t|s(?:e(?:lect_(?:brush|font|pen)|t_option)|tart_(?:doc|page))|abort|(?:get_optio|ope)n|write)|_r|f)?|o(?:c_(?:(?:clos|nic|terminat)e|get_status|open)|perty_exists))|s(?:_(?:a(?:dd_(?:l(?:aunch|ocal)link|(?:bookmar|(?:pdf|web)lin)k|note)|rcn?)|begin_(?:pa(?:ge|ttern)|template)|c(?:l(?:ose(?:path(?:_stroke)?|_image)?|ip)|ircle|ontinue_text|urveto)|end_(?:pa(?:ge|ttern)|template)|fi(?:ll(?:_stroke)?|ndfont)|get_(?:(?:buff|paramet)er|value)|m(?:akespotcolor|oveto)|open_(?:image(?:_file)?|(?:fil|memory_imag)e)|r(?:e(?:ct|store)|otate)|s(?:et(?:_(?:border_(?:color|dash|style)|info|parameter|text_pos|value)|f(?:la|on)t|line(?:cap|join|width)|color|(?:poly)?dash|gray|miterlimit|overprintmode)|h(?:ading(?:_pattern)?|ow(?:_(?:xy2?|boxed)|2)?|fill)|tr(?:ing(?:_geometry|width)|oke)|ymbol(?:_(?:name|width))?|(?:av|cal)e)|(?:(?:dele|(?:hyphen|transl)a)t|include_fil|place_imag)e|lineto|new)|pell_(?:add_to_(?:personal|session)|c(?:onfig_(?:d(?:ata|ict)_dir|r(?:epl|untogether)|(?:creat|ignor|mod)e|(?:persona|save_rep)l)|lear_session|heck)|new(?:_(?:config|personal))?|s(?:(?:ave_wordli|ugge)s|tore_replacemen)t))|x_(?:c(?:lose|reate_fp)|d(?:elete(?:_record)?|ate2string)|get_(?:(?:fiel|recor)d|info|parameter|schema|value)|n(?:um(?:fiel|recor)ds|ew)|set_(?:ta(?:blename|rgetencoding)|(?:blob_fil|valu)e|parameter)|(?:(?:inser|pu)t|(?:retriev|updat)e)_record|open_fp|timestamp2string)|fsockopen|i|ng2wbmp|utenv)|q(?:dom_(?:error|tree)|uote(?:d_printable_(?:de|en)code|meta))|r(?:a(?:d(?:ius_(?:a(?:(?:cct|uth)_open|dd_server)|c(?:vt_(?:addr|int|string)|lose|onfig|reate_request)|demangle(?:_mppe_key)?|get_(?:vendor_)?attr|put_(?:a(?:dd|tt)r|vendor_(?:a(?:dd|tt)r|int|string)|int|string)|s(?:e(?:nd_reques|rver_secre)t|trerror)|request_authenticator)|2deg)|n(?:d|ge)|r_(?:c(?:lose|omment_get)|(?:entry_ge|lis)t|open|solid_is)|wurl(?:de|en)code)|e(?:a(?:d(?:lin(?:e(?:_(?:c(?:allback_(?:handler_(?:install|remove)|read_char)|lear_history|ompletion_function)|re(?:ad_histor|displa)y|(?:add|list|write)_history|info|on_new_line))?|k)|_exif_data|dir|(?:gz)?file)|lpath(?:_cache_(?:get|size))?)|code(?:_(?:file|string))?|gister_(?:shutdown|tick)_function|name(?:_function)?|s(?:ourcebundle_(?:c(?:ount|reate)|get(?:_error_(?:cod|messag)e)?|locales)|tore_(?:e(?:rror|xception)_handler|include_path)|et)|wind(?:dir)?)|pm_(?:close|get_tag|is_valid|(?:ope|versio)n)|unkit_(?:c(?:lass_(?:adopt|emancipate)|onstant_(?:re(?:defin|mov)e|add))|function_(?:re(?:defin|mov|nam)e|add|copy)|lint(?:_file)?|method_(?:re(?:defin|mov|nam)e|add|copy)|s(?:andbox_output_handler|uperglobals)|import|return_value_used)|mdir|ound|sort|trim)|s(?:e(?:m_(?:re(?:leas|mov)e|acquire|get)|ssion_(?:c(?:ache_(?:expire|limiter)|ommit)|de(?:code|stroy)|i(?:s_registere)?d|pgsql_(?:get_(?:error|field)|s(?:et_field|tatus)|add_error|reset)|reg(?:enerate_id|ister)|s(?:et_(?:cookie_params|save_handler)|ave_path|tart)|un(?:register|set)|(?:encod|(?:module_)?nam|write_clos)e|get_cookie_params)|t(?:_(?:e(?:rror|xception)_handler|file_buffer|include_path|magic_quotes_runtime|socket_blocking|time_limit)|(?:(?:raw)?cooki|local|typ)e)|rialize)|h(?:a1(?:_file)?|m(?:_(?:remove(?:_var)?|(?:at|de)tach|(?:(?:ge|pu)t|has)_var)|op_(?:(?:clos|(?:dele|wri)t|siz)e|open|read))|ell_exec|(?:ow_sourc|uffl)e)|i(?:m(?:plexml_(?:load_(?:file|string)|import_dom)|ilar_text)|nh?|zeof)|nmp(?:_(?:get_(?:quick_print|valueretrieval)|set_(?:oid_(?:numeric_prin|output_forma)t|(?:enum|quick)_print|valueretrieval)|read_mib)|get(?:next)?|walk(?:oid)?|realwalk|set)|o(?:cket_(?:c(?:l(?:ear_error|ose)|reate(?:_(?:listen|pair))?|onnect)|get(?:_(?:option|status)|(?:peer|sock)name)|l(?:ast_error|isten)|re(?:cv(?:from)?|ad)|s(?:e(?:nd(?:to)?|t_(?:block(?:ing)?|nonblock|option|timeout)|lect)|hutdown|trerror)|accept|bind|write)|lr_get_version|rt|undex)|p(?:l(?:_(?:autoload(?:_(?:call|(?:extens|funct)ions|(?:un)?register))?|classes|object_hash)|fileobject::(?:__tostring|getcurrentline)|iti?)|rintf)|q(?:l(?:ite_(?:c(?:reate_(?:aggregate|function)|lose|olumn|urrent|hanges)|e(?:(?:rror|scape)_string|xec)|f(?:etch_(?:a(?:ll|rray)|s(?:ingle|tring)|column_types|object)|actory|ield_name)|has_(?:more|prev)|l(?:ast_(?:error|insert_rowid)|ib(?:encoding|version))|n(?:um_(?:field|row)s|ext)|p(?:open|rev)|s(?:eek|ingle_query)|u(?:df_(?:de|en)code_binary|nbuffered_query)|(?:(?:array_)?quer|ke)y|busy_timeout|open|(?:rewin|vali)d)|_regcase)|rt)|s(?:h2_(?:auth_(?:p(?:assword|ubkey_file)|(?:hostbased_fil|non)e)|f(?:etch_stream|ingerprint)|publickey_(?:add|(?:ini|lis)t|remove)|s(?:cp_(?:recv|send)|ftp(?:_(?:r(?:e(?:a(?:dlink|lpath)|name)|mdir)|s(?:tat|ymlink)|lstat|mkdir|unlink))?|hell)|connect|exec|methods_negotiated|tunnel)|canf)|t(?:at(?:s_(?:c(?:df_(?:b(?:eta|inomial)|c(?:auchy|hisquare)|l(?:aplace|ogistic)|n(?:oncentral_(?:f|chisquare)|egative_binomial)|(?:exponentia|weibul)l|[ft]|gamma|poisson|uniform)|ovariance)|den(?:s_(?:c(?:auchy|hisquare)|l(?:aplace|ogistic)|n(?:egative_binomi|orm)al|pmf_(?:binomial|hypergeometric|poisson)|(?:bet|gamm)a|(?:exponentia|weibul)l|[ft])|_uniform)|rand_(?:ge(?:n_(?:f(?:uniform)?|i(?:binomial(?:_negative)?|nt|poisson|uniform)|no(?:ncen(?:tral_[ft]|ral_chisquare)|rmal)|(?:bet|gamm)a|exponential|chisquare|t)|t_seeds)|phrase_to_seeds|ranf|setall)|s(?:ta(?:t_(?:in(?:dependent_|nerproduc)t|p(?:aired_t|ercentile|owersum)|binomial_coef|correlation|gennch|noncentral_t)|ndard_deviation)|kew)|(?:absolute_deviatio|harmonic_mea)n|kurtosis|variance))?|omp_(?:a(?:bort|ck)|c(?:o(?:nnect(?:_error)?|mmit)|lose)|get_(?:read_timeout|session_id)|s(?:e(?:nd|t_read_timeout)|ubscribe)|(?:begi|versio)n|error|(?:(?:has|read)_fram|unsubscrib)e)|r(?:_(?:r(?:ep(?:eat|lace)|ot13)|s(?:huffle|plit)|getcsv|ireplace|pad|word_count)|c(?:(?:asec)?mp|oll|spn|hr)|eam_(?:bucket_(?:(?:ap|pre)pend|make_writeable|new)|co(?:ntext_(?:get_(?:default|(?:option|param)s)|set_(?:default|option|params)|create)|py_to_stream)|filter_(?:re(?:gister|move)|(?:ap|pre)pend)|get_(?:(?:(?:conten|transpor)t|(?:filt|wrapp)er)s|line|meta_data)|re(?:gister_wrapper|solve_include_path)|s(?:e(?:t_(?:blocking|timeout|write_buffer)|lect)|ocket_(?:s(?:e(?:ndto|rver)|hutdown)|(?:accep|clien)t|enable_crypto|get_name|pair|recvfrom)|upports_lock)|wrapper_(?:re(?:gister|store)|unregister)|encoding|is_local)|i(?:p(?:_tag|c?slashe|o)s|str)|n(?:atc(?:asec)?mp|c(?:asec)?mp)|p(?:brk|os|time)|r(?:ev|chr|i?pos)|s(?:pn|tr)|t(?:o(?:k|(?:low|upp)er|time)|r)|ftime|len|val))|ubstr(?:_(?:co(?:mpare|unt)|replace))?|vn_(?:a(?:uth_[gs]et_parameter|dd)|c(?:l(?:eanup|ient_version)|(?:a|ommi|heckou)t)|d(?:elete|iff)|fs_(?:a(?:bort_txn|pply_text)|c(?:o(?:ntents_changed|py)|h(?:ange_node_prop|eck_path))|d(?:elete|ir_entries)|file_(?:contents|length)|is_(?:dir|file)|make_(?:dir|file)|node_(?:created_rev|prop)|revision_(?:prop|root)|begin_txn2|props_changed|txn_root|youngest_rev)|l(?:og|s)|re(?:pos_(?:fs(?:_(?:begin_txn_for_commit|commit_txn))?|create|hotcopy|open|recover)|vert)|(?:blam|updat)e|(?:ex|im)port|mkdir|status)|wf_(?:a(?:ction(?:g(?:oto(?:frame|label)|eturl)|p(?:lay|revframe)|s(?:ettarget|top)|(?:next|waitfor)frame|togglequality)|dd(?:buttonrecord|color))|define(?:bitmap|(?:fon|rec|tex)t|line|poly)|end(?:s(?:hape|ymbol)|(?:butt|doacti)on)|font(?:s(?:ize|lant)|tracking)|get(?:f(?:ontinfo|rame)|bitmapinfo)|l(?:abelframe|ookat)|m(?:odifyobject|ulcolor)|o(?:rtho2?|ncondition|penfile)|p(?:o(?:larview|pmatrix|sround)|erspective|laceobject|ushmatrix)|r(?:emoveobject|otate)|s(?:etf(?:ont|rame)|h(?:ape(?:curveto3?|fill(?:bitmap(?:clip|tile)|off|solid)|line(?:solid|to)|arc|moveto)|owframe)|tart(?:s(?:hape|ymbol)|(?:butt|doacti)on)|cale)|t(?:extwidth|ranslate)|closefile|nextid|viewport)|y(?:base_(?:c(?:lose|onnect)|d(?:ata_seek|eadlock_retry_count)|f(?:etch_(?:a(?:rray|ssoc)|field|object|row)|ield_seek|ree_result)|min_(?:client|(?:erro|serve)r|message)_severity|num_(?:field|row)s|se(?:lect_db|t_message_handler)|affected_rows|get_last_message|(?:pconnec|resul)t|(?:unbuffered_)?query)|s(?:_get(?:_temp_dir|loadavg)|log|tem)|mlink)|candir|leep|rand)|t(?:anh?|e(?:mpnam|xtdomain)|i(?:dy_(?:c(?:lean_repair|onfig_count)|get(?:_(?:h(?:tml(?:_ver)?|ead)|o(?:pt_doc|utput)|r(?:elease|oot)|body|config|error_buffer|status)|opt)|is_x(?:ht)?ml|parse_(?:file|string)|re(?:pair_(?:file|string)|set_config)|s(?:et(?:_encoding|opt)|ave_config)|(?:access|error|warning)_count|diagnose|load_config)|me(?:_(?:nanosleep|sleep_until)|zone_(?:name_(?:from_abbr|get)|o(?:ffset_get|pen)|(?:(?:abbreviation|identifier)s_lis|(?:(?:locat|vers)ion|transitions)_ge)t))?)|o(?:ken_(?:get_all|name)|uch)|ri(?:gger_error|m)|cpwrap_check|mpfile)|u(?:c(?:first|words)|dm_(?:a(?:lloc_agent(?:_array)?|dd_search_limit|pi_version)|c(?:at_(?:list|path)|l(?:ear_search_limits|ose_stored)|heck_(?:charset|stored)|rc32)|err(?:no|or)|f(?:ree_(?:agent|ispell_data|res)|ind)|get_(?:res_(?:field|param)|doc_count)|hash32|load_ispell_data|open_stored|set_agent_param)|n(?:i(?:code_(?:get_(?:error_mode|subst_char)|set_(?:error_mode|subst_char)|(?:de|en)code)|(?:qi|xtoj)d)|se(?:rialize|t)|(?:lin|pac)k|register_tick_function)|rl(?:de|en)code|s(?:e(?:_soap_error_handle|r_erro)r|leep|ort)|tf8_(?:de|en)code|[ak]sort|mask)|v(?:ar(?:_(?:dump|export)|iant_(?:a(?:bs|[dn]d)|c(?:as?t|mp)|d(?:ate_(?:from|to)_timestamp|iv)|i(?:div|mp|nt)|m(?:od|ul)|n(?:eg|ot)|s(?:et(?:_type)?|ub)|eqv|fix|get_type|x?or|pow|round))|p(?:opmail_(?:a(?:dd_(?:alias_domain(?:_ex)?|domain(?:_ex)?|user)|lias_(?:del(?:_domain)?|get(?:_all)?|add)|uth_user)|del_(?:domain(?:_ex)?|user)|error|passwd|set_user_quota)|rintf)|ersion_compare|[fs]printf|irtual)|w(?:32api_(?:in(?:it_dtype|voke_function)|deftype|register_function|set_call_method)|ddx_(?:packet_(?:end|start)|serialize_va(?:lue|rs)|add_vars|(?:de|un)serialize)|in(?:32_(?:ps_(?:stat_(?:mem|proc)|list_procs)|s(?:t(?:art_service(?:_ctrl_dispatcher)?|op_service)|et_service_status)|(?:(?:crea|dele)te_servic|get_last_control_messag)e|query_service_status)|cache_(?:fcache_(?:file|mem)info|ocache_(?:file|mem)info|r(?:plist_(?:file|mem)info|efresh_if_changed)|u(?:cache_(?:c(?:as|lear)|de(?:c|lete)|in(?:c|fo)|add|exists|[gs]et|meminfo)|nlock)|lock|scache_info))|ordwrap)|x(?:attr_(?:s(?:et|upported)|(?:ge|lis)t|remove)|diff_(?:file_(?:b(?:diff(?:_size)?|patch)|diff(?:_binary)?|patch(?:_binary)?|merge3|rabdiff)|string_(?:b(?:diff(?:_size)?|patch)|patch(?:_binary)?|diff|merge3))|ml(?:_(?:get_(?:current_(?:byte_index|(?:column|line)_number)|error_code)|parse(?:r_(?:create(?:_ns)?|free|[gs]et_option)|_into_struct)?|set_(?:e(?:lement|nd_namespace_decl|xternal_entity_ref)_handler|(?:default|character_data|(?:notation|start_namespace|unparsed_entity)_decl|processing_instruction)_handler|object)|error_string)|rpc_(?:decode(?:_request)?|encode(?:_request)?|se(?:rver_(?:c(?:all_method|reate)|register_(?:introspection_callback|method)|add_introspection_data|destroy)|t_type)|get_type|is_fault|parse_method_descriptions)|writer_(?:end_(?:c(?:data|omment)|d(?:td(?:_(?:e(?:lement|ntity)|attlist))?|ocument)|attribute|element|pi)|f(?:lush|ull_end_element)|o(?:pen_(?:memory|uri)|utput_memory)|s(?:et_indent(?:_string)?|tart_(?:attribute(?:_ns)?|c(?:data|omment)|d(?:td(?:_(?:e(?:lement|ntity)|attlist))?|ocument)|element(?:_ns)?|pi))|write_(?:attribute(?:_ns)?|c(?:data|omment)|dtd(?:_(?:e(?:lement|ntity)|attlist))?|element(?:_ns)?|pi|raw)|text))|p(?:ath_(?:register_ns(?:_auto)?|new_context)|tr_new_context)|slt_(?:backend_(?:info|name|version)|err(?:no|or)|set(?:_(?:e(?:ncoding|rror_handler)|s(?:ax_handlers?|cheme_handlers?)|base|log|object)|opt)|(?:creat|fre)e|getopt|process))|y(?:a(?:ml_(?:emit(?:_file)?|parse(?:_(?:file|url))?)|z_(?:c(?:cl_(?:conf|parse)|lose|onnect)|e(?:rr(?:no|or)|s(?:_result)?|lement)|r(?:ange|ecord)|s(?:c(?:an(?:_result)?|hema)|e(?:arch|t_option)|ort|yntax)|addinfo|database|get_option|hits|itemorder|(?:presen|wai)t))|p_(?:err(?:_string|no)|ma(?:ster|tch)|all|(?:ca|firs|nex)t|get_default_domain|order))|z(?:end_(?:(?:logo_gu|thread_)id|version)|ip_(?:entry_(?:c(?:ompress(?:edsize|ionmethod)|lose)|(?:filesiz|nam)e|open|read)|close|open|read)|lib_get_coding_type)))(\s*\(|$))/gi, // collisions: while
  php_new: /(\b)(ArrayAccess|ErrorException|Exception|Iterator|IteratorAggregate|Serializable|Traversable|AMQPConnection|AMQPConnectionException|AMQPException|AMQPExchange|AMQPExchangeException|AMQPQueue|AMQPQueueException|APCIterator|Cairo|CairoAntialias|CairoContent|CairoContext|CairoException|CairoExtend|CairoFillRule|CairoFilter|CairoFontFace|CairoFontOptions|CairoFontSlant|CairoFontType|CairoFontWeight|CairoFormat|CairoGradientPattern|CairoHintMetrics|CairoHintStyle|CairoImageSurface|CairoLinearGradient|CairoLineCap|CairoLineJoin|CairoMatrix|CairoOperator|CairoPath|CairoPattern|CairoPatternType|CairoPdfSurface|CairoPsLevel|CairoPsSurface|CairoRadialGradient|CairoScaledFont|CairoSolidPattern|CairoStatus|CairoSubpixelOrder|CairoSurface|CairoSurfacePattern|CairoSurfaceType|CairoSvgSurface|CairoSvgVersion|CairoToyFontFace|chdb|DateInterval|DatePeriod|DateTime|DateTimeZone|DOMAttr|DOMCdataSection|DOMCharacterData|DOMComment|DOMDocument|DOMDocumentFragment|DOMDocumentType|DOMElement|DOMEntity|DOMEntityReference|DOMException|DOMImplementation|DOMNamedNodeMap|DOMNode|DOMNodeList|DOMNotation|DOMProcessingInstruction|DOMText|DOMXPath|GearmanClient|GearmanException|GearmanJob|GearmanTask|GearmanWorker|Gmagick|GmagickDraw|GmagickException|GmagickPixel|GmagickPixelException|HaruAnnotation|HaruDestination|HaruDoc|HaruEncoder|HaruException|HaruFont|HaruImage|HaruOutline|HaruPage|HttpDeflateStream|HttpInflateStream|HttpMessage|HttpQueryString|HttpRequest|HttpRequestPool|HttpResponse|Imagick|ImagickDraw|ImagickPixel|ImagickPixelIterator|Collator|IntlDateFormatter|Locale|MessageFormatter|Normalizer|NumberFormatter|ResourceBundle|Spoofchecker|Transliterator|JsonSerializable|Judy|KTaglib_MPEG_Audioproperties|KTaglib_ID3v2_AttachedPictureFrame|KTagLib_ID3v2_Frame|KTagLib_ID3v2_Tag|KTagLib_MPEG_File|KTaglib_Tag|libXMLError|Memcache|Memcached|MemcachedException|SWFAction|SWFBitmap|SWFButton|SWFDisplayItem|SWFFill|SWFFont|SWFFontChar|SWFGradient|SWFMorph|SWFMovie|SWFPrebuiltClip|SWFShape|SWFSound|SWFSoundInstance|SWFSprite|SWFText|SWFTextField|SWFVideoStream|Mongo|MongoBinData|MongoCode|MongoCollection|MongoConnectionException|MongoCursor|MongoCursorException|MongoCursorTimeoutException|MongoDate|MongoDB|MongoDBRef|MongoException|MongoGridFS|MongoGridFSCursor|MongoGridFSException|MongoGridFSFile|MongoId|MongoInt32|MongoInt64|MongoMaxKey|MongoMinKey|MongoRegex|MongoTimestamp|MySQLi|MySQLi_Driver|MySQLi_Result|MySQLi_STMT|mysqli_warning|OAuth|OAuthException|OAuthProvider|PDO|PDOException|PDOStatement|Phar|PharData|PharException|PharFileInfo|RarArchive|RarEntry|RarException|Reflection|ReflectionClass|ReflectionException|ReflectionExtension|ReflectionFunction|ReflectionFunctionAbstract|ReflectionMethod|ReflectionObject|ReflectionParameter|ReflectionProperty|ReflectionZendExtension|Reflector|RRDCreator|RRDGraph|RRDUpdater|SimpleXMLElement|SNMP|SoapClient|SoapFault|SoapHeader|SoapParam|SoapServer|SoapVar|SolrClient|SolrClientException|SolrDocument|SolrDocumentField|SolrException|SolrGenericResponse|SolrIllegalArgumentException|SolrIllegalOperationException|SolrInputDocument|SolrModifiableParams|SolrObject|SolrParams|SolrPingResponse|SolrQuery|SolrQueryResponse|SolrResponse|SolrUpdateResponse|SolrUtils|SphinxClient|AppendIterator|ArrayIterator|ArrayObject|BadFunctionCallException|BadMethodCallException|CachingIterator|CallbackFilterIterator|Countable|DirectoryIterator|DomainException|EmptyIterator|FilesystemIterator|FilterIterator|GlobIterator|InfiniteIterator|InvalidArgumentException|IteratorIterator|LengthException|LimitIterator|LogicException|MultipleIterator|NoRewindIterator|OuterIterator|OutOfBoundsException|OutOfRangeException|OverflowException|ParentIterator|RangeException|RecursiveArrayIterator|RecursiveCachingIterator|RecursiveCallbackFilterIterator|RecursiveDirectoryIterator|RecursiveFilterIterator|RecursiveIterator|RecursiveIteratorIterator|RecursiveRegexIterator|RecursiveTreeIterator|RegexIterator|RuntimeException|SeekableIterator|SimpleXMLIterator|SplDoublyLinkedList|SplFileInfo|SplFileObject|SplFixedArray|SplHeap|SplMaxHeap|SplMinHeap|SplObjectStorage|SplObserver|SplPriorityQueue|SplQueue|SplStack|SplSubject|SplTempFileObject|UnderflowException|UnexpectedValueException|SplBool|SplEnum|SplFloat|SplInt|SplString|SQLiteDatabase|SQLiteResult|SQLiteUnbuffered|SQLite3|SQLite3Result|SQLite3Stmt|Stomp|StompException|StompFrame|streamWrapper|SVM|SVMException|SVMModel|Tidy|TidyNode|TokyoTyrant|tokyotyrantexception|TokyoTyrantIterator|TokyoTyrantQuery|TokyoTyrantTable|V8Js|V8JsException|XMLReader|XSLTProcessor|ZipArchive|dir|(stdClass)|(__PHP_Incomplete_Class)|(Closure)|(self|parent|static)|(SQLiteDatabase|SQLiteResult|SQLiteUnbuffered))(\b)/i,
  php_fun: /(\b)(__autoload|(__construct)|(__destruct)|(__call|__callStatic)|(__get|__set|__isset|__unset)|(__sleep|__wakeup)|(__toString)|(__invoke)|(__set_state)|(__clone))(\b)/i, //! link interfaces method inside class
  phpini: /((?:^|\n)\s*)(allow_call_time_pass_reference|always_populate_raw_post_data|arg_separator\.input|arg_separator\.output|asp_tags|auto_append_file|auto_globals_jit|auto_prepend_file|cgi\.check_shebang_line|cgi\.fix_pathinfo|cgi\.force_redirect|cgi\.redirect_status_env|cgi\.rfc2616_headers|default_charset|default_mimetype|detect_unicode|disable_classes|disable_functions|doc_root|expose_php|extension|extension_dir|fastcgi\.impersonate|file_uploads|gpc_order|include_path|memory_limit|open_basedir|post_max_size|precision|realpath_cache_size|realpath_cache_ttl|register_argc_argv|register_globals|register_long_arrays|request_order|serialize_precision|short_open_tag|sql\.safe_mode|track_vars|upload_max_filesize|max_file_uploads|upload_tmp_dir|user_dir|variables_order|y2k_compliance|zend\.ze1_compatibility_mode|zend\.multibyte|zend_extension|zend_extension_debug|zend_extension_debug_ts|zend_extension_ts|(allow_url_fopen|allow_url_include|auto_detect_line_endings|default_socket_timeout|from|user_agent)|(apc\.cache_by_default|apc\.enabled|apc\.enable_cli|apc\.file_update_protection|apc\.filters|apc\.gc_ttl|apc\.include_once_override|apc\.localcache|apc\.localcache\.size|apc\.max_file_size|apc\.mmap_file_mask|apc\.num_files_hint|apc\.optimization|apc\.report_autofilter|apc\.rfc1867|apc\.rfc1867_freq|apc\.rfc1867_name|apc\.rfc1867_prefix|apc\.shm_segments|apc\.shm_size|apc\.slam_defense|apc\.stat|apc\.ttl|apc\.user_entries_hint|apc\.user_ttl|apc\.write_lock)|(apc\.stat_ctime|apd\.bitmask|arg_separator|async_send|axis2\.client_home|axis2\.enable_exception|axis2\.enable_trace|axis2\.log_path|bcompiler\.enabled|birdstep\.max_links|blenc\.key_file|cgi\.discard_path|cgi\.nph|coin_acceptor\.autoreset|coin_acceptor\.auto_initialize|coin_acceptor\.auto_reset|coin_acceptor\.command_function|coin_acceptor\.delay|coin_acceptor\.delay_coins|coin_acceptor\.delay_prom|coin_acceptor\.device|coin_acceptor\.lock_on_close|coin_acceptor\.start_unlocked|crack\.default_dictionary|daffodildb\.default_host|daffodildb\.default_password|daffodildb\.default_socket|daffodildb\.default_user|daffodildb\.port|dba\.default_handler|etpan\.default\.charset|etpan\.default\.protocol|fastcgi\.logging|fbsql\.allow_persistant|fbsql\.allow_persistent|fbsql\.autocommit|fbsql\.batchSize|fbsql\.batchsize|fbsql\.default_database|fbsql\.default_database_password|fbsql\.default_host|fbsql\.default_password|fbsql\.default_user|fbsql\.generate_warnings|fbsql\.max_connections|fbsql\.max_links|fbsql\.max_persistent|fbsql\.max_results|fbsql\.mbatchSize|fbsql\.show_timestamp_decimals|geoip\.custom_directory|geoip\.database_standard|hidef\.ini_path|htscanner\.config_file|htscanner\.default_docroot|htscanner\.default_ttl|htscanner\.stop_on_error|http\.allowed_methods|http\.allowed_methods_log|http\.cache_log|http\.composite_log|http\.etag\.mode|http\.etag_mode|http\.force_exit|http\.log\.allowed_methods|http\.log\.cache|http\.log\.composite|http\.log\.not_found|http\.log\.redirect|http\.ob_deflate_auto|http\.ob_deflate_flags|http\.ob_inflate_auto|http\.ob_inflate_flags|http\.only_exceptions|http\.persistent\.handles\.ident|http\.persistent\.handles\.limit|http\.redirect_log|http\.request\.datashare\.connect|http\.request\.datashare\.cookie|http\.request\.datashare\.dns|http\.request\.datashare\.ssl|http\.request\.methods\.allowed|http\.request\.methods\.custom|http\.send\.deflate\.start_auto|http\.send\.deflate\.start_flags|http\.send\.inflate\.start_auto|http\.send\.inflate\.start_flags|http\.send\.not_found_404|hyerwave\.allow_persistent|hyperwave\.allow_persistent|hyperwave\.default_port|iconv\.input_encoding|iconv\.internal_encoding|iconv\.output_encoding|imlib2\.font_cache_max_size|imlib2\.font_path|ingres\.allow_persistent|ingres\.array_index_start|ingres\.blob_segment_length|ingres\.cursor_mode|ingres\.default_database|ingres\.default_password|ingres\.default_user|ingres\.max_links|ingres\.max_persistent|ingres\.report_db_warnings|ingres\.timeout|ingres\.trace_connect|ircg\.control_user|ircg\.keep_alive_interval|ircg\.max_format_message_sets|ircg\.shared_mem_size|ircg\.work_dir|ldap\.base_dn|ldap\.max_links|log\.dbm_dir|mail\.force_extra_parameters|mailparse\.def_charset|mbstring\.script_encoding|mcrypt\.algorithms_dir|mcrypt\.modes_dir|mssql\.allow_persistent|mssql\.batchsize|mssql\.charset|mssql\.compatability_mode|mssql\.connect_timeout|mssql\.datetimeconvert|mssql\.max_links|mssql\.max_persistent|mssql\.max_procs|mssql\.min_error_severity|mssql\.min_message_severity|mssql\.secure_connection|mssql\.textlimit|mssql\.textsize|mssql\.timeout|mysqli\.reconnect|namazu\.debugmode|namazu\.lang|namazu\.loggingmode|namazu\.sortmethod|namazu\.sortorder|odbtp\.datetime_format|odbtp\.detach_default_queries|odbtp\.guid_format|odbtp\.interface_file|odbtp\.truncation_errors|opendirectory\.default_separator|opendirectory\.max_refs|opendirectory\.separator|oracle\.allow_persistent|oracle\.max_links|oracle\.max_persistent|pam\.servicename|pfpro\.defaulthost|pfpro\.defaultport|pfpro\.defaulttimeout|pfpro\.proxyaddress|pfpro\.proxylogon|pfpro\.proxypassword|pfpro\.proxyport|printer\.default_printer|python\.append_path|python\.prepend_path|report_zend_debug|runkit\.internal_override|session\.gc_dividend|session_pgsql\.create_table|session_pgsql\.db|session_pgsql\.disable|session_pgsql\.failover_mode|session_pgsql\.gc_interval|session_pgsql\.keep_expired|session_pgsql\.sem_file_name|session_pgsql\.serializable|session_pgsql\.short_circuit|session_pgsql\.use_app_vars|session_pgsql\.vacuum_interval|simple_cvs\.authMethod|simple_cvs\.compressionLevel|simple_cvs\.cvsRoot|simple_cvs\.host|simple_cvs\.moduleName|simple_cvs\.userName|simple_cvs\.workingDir|soap\.wsdl_cache|sybase\.hostname|sybase\.interface_file|sybase\.login_timeout|sybase\.min_client_severity|sybase\.min_server_severity|sybase\.timeout|sybct\.packet_size|sysvshm\.init_mem|unserialize_callback_func|uploadprogress\.file\.filename_template|user_ini\.cache_ttl|user_ini\.filename|valkyrie\.auto_validate|valkyrie\.config_path|velocis\.max_links|vld\.active|vld\.execute|vld\.skip_append|vld\.skip_prepend|xdebug\.auto_profile|xdebug\.auto_profile_mode|xdebug\.auto_trace|xdebug\.collect_includes|xdebug\.collect_params|xdebug\.collect_return|xdebug\.collect_vars|xdebug\.default_enable|xdebug\.dump\.COOKIE|xdebug\.dump\.ENV|xdebug\.dump\.FILES|xdebug\.dump\.GET|xdebug\.dump\.POST|xdebug\.dump\.REQUEST|xdebug\.dump\.SERVER|xdebug\.dump\.SESSION|xdebug\.dump_globals|xdebug\.dump_once|xdebug\.dump_undefined|xdebug\.extended_info|xdebug\.idekey|xdebug\.manual_url|xdebug\.max_nesting_level|xdebug\.output_dir|xdebug\.profiler_aggregate|xdebug\.profiler_append|xdebug\.profiler_enable|xdebug\.profiler_enable_trigger|xdebug\.profiler_output_dir|xdebug\.profiler_output_name|xdebug\.remote_autostart|xdebug\.remote_enable|xdebug\.remote_handler|xdebug\.remote_host|xdebug\.remote_log|xdebug\.remote_mode|xdebug\.remote_port|xdebug\.show_exception_trace|xdebug\.show_local_vars|xdebug\.show_mem_delta|xdebug\.trace_format|xdebug\.trace_options|xdebug\.trace_output_dir|xdebug\.trace_output_name|xdebug\.var_display_max_children|xdebug\.var_display_max_data|xdebug\.var_display_max_depth|xmms\.path|xmms\.session|yami\.response\.timeout|yaz\.keepalive|yaz\.log_file|yaz\.log_mask|yaz\.max_links)|(apd\.dumpdir|apd\.statement_tracing)|(assert\.active|assert\.bail|assert\.callback|assert\.quiet_eval|assert\.warning|enable_dl|magic_quotes_gpc|magic_quotes_runtime|max_execution_time|max_input_nesting_level|max_input_time|zend\.enable_gc)|(bcmath\.scale)|(browscap|highlight\.bg|highlight\.comment|highlight\.default|highlight\.html|highlight\.keyword|highlight\.string|ignore_user_abort)|(child_terminate|engine|last_modified|xbithack)|(cli\.pager|cli\.prompt)|(com\.allow_dcom|com\.autoregister_casesensitive|com\.autoregister_typelib|com\.autoregister_verbose|com\.code_page|com\.typelib_file)|(date\.default_latitude|date\.default_longitude|date\.sunrise_zenith|date\.sunset_zenith|date\.timezone)|(dbx\.colnames_case)|(define_syslog_variables)|(display_errors|display_startup_errors|docref_ext|docref_root|error_append_string|error_log|error_prepend_string|error_reporting|html_errors|ignore_repeated_errors|ignore_repeated_source|log_errors|log_errors_max_len|report_memleaks|track_errors|xmlrpc_errors|xmlrpc_error_number)|(exif\.decode_jis_intel|exif\.decode_jis_motorola|exif\.decode_unicode_intel|exif\.decode_unicode_motorola|exif\.encode_jis|exif\.encode_unicode)|(expect\.logfile|expect\.loguser|expect\.timeout)|(filter\.default|filter\.default_flags)|(gd\.jpeg_ignore_warning)|(ibase\.allow_persistent|ibase\.dateformat|ibase\.default_charset|ibase\.default_db|ibase\.default_password|ibase\.default_user|ibase\.max_links|ibase\.max_persistent|ibase\.timeformat|ibase\.timestampformat)|(ibm_db2\.binmode|ibm_db2\.i5_allow_commit|ibm_db2\.i5_dbcs_alloc|ibm_db2\.instance_name)|(ifx\.allow_persistent|ifx\.blobinfile|ifx\.byteasvarchar|ifx\.charasvarchar|ifx\.default_host|ifx\.default_password|ifx\.default_user|ifx\.max_links|ifx\.max_persistent|ifx\.nullformat|ifx\.textasvarchar)|(implicit_flush|output_buffering|output_handler)|(magic_quotes_sybase|sybase\.allow_persistent|sybase\.max_links|sybase\.max_persistent|sybase\.min_error_severity|sybase\.min_message_severity|sybct\.allow_persistent|sybct\.deadlock_retry_count|sybct\.hostname|sybct\.login_timeout|sybct\.max_links|sybct\.max_persistent|sybct\.min_client_severity|sybct\.min_server_severity|sybct\.timeout)|(mail\.add_x_header|mail\.log|sendmail_from|sendmail_path|SMTP|smtp_port)|(maxdb\.default_db|maxdb\.default_host|maxdb\.default_pw|maxdb\.default_user|maxdb\.long_readlen)|(mbstring\.detect_order|mbstring\.encoding_translation|mbstring\.func_overload|mbstring\.http_input|mbstring\.http_output|mbstring\.internal_encoding|mbstring\.language|mbstring\.strict_detection|mbstring\.substitute_character)|(memcache\.allow_failover|memcache\.chunk_size|memcache\.default_port|memcache\.hash_function|memcache\.hash_strategy|memcache\.max_failover_attempts)|(mime_magic\.debug|mime_magic\.magicfile)|(msql\.allow_persistent|msql\.max_links|msql\.max_persistent)|(mysql\.allow_persistent|mysql\.connect_timeout|mysql\.default_host|mysql\.default_password|mysql\.default_port|mysql\.default_socket|mysql\.default_user|mysql\.max_links|mysql\.max_persistent|mysql\.trace_mode)|(mysqli\.default_host|mysqli\.default_port|mysqli\.default_pw|mysqli\.default_socket|mysqli\.default_user|mysqli\.max_links)|(nsapi\.read_timeout)|(oci8\.default_prefetch|oci8\.max_persistent|oci8\.old_oci_close_semantics|oci8\.persistent_timeout|oci8\.ping_interval|oci8\.privileged_connect|oci8\.statement_cache_size)|(odbc\.allow_persistent|odbc\.check_persistent|odbc\.defaultbinmode|odbc\.defaultlrl|odbc\.default_db|odbc\.default_pw|odbc\.default_user|odbc\.max_links|odbc\.max_persistent)|(pcre\.backtrack_limit|pcre\.recursion_limit)|(pdo_odbc\.connection_pooling|pdo_odbc\.db2_instance_name)|(pgsql\.allow_persistent|pgsql\.auto_reset_persistent|pgsql\.ignore_notice|pgsql\.log_notice|pgsql\.max_links|pgsql\.max_persistent)|(phar\.extract_list|phar\.readonly|phar\.require_hash)|(runkit\.superglobal)|(safe_mode|safe_mode_allowed_env_vars|safe_mode_exec_dir|safe_mode_gid|safe_mode_include_dir|safe_mode_protected_env_vars)|(session\.auto_start|session\.bug_compat_42|session\.bug_compat_warn|session\.cache_expire|session\.cache_limiter|session\.cookie_domain|session\.cookie_httponly|session\.cookie_lifetime|session\.cookie_path|session\.cookie_secure|session\.entropy_file|session\.entropy_length|session\.gc_divisor|session\.gc_maxlifetime|session\.gc_probability|session\.hash_bits_per_character|session\.hash_function|session\.name|session\.referer_check|session\.save_handler|session\.save_path|session\.serialize_handler|session\.use_cookies|session\.use_only_cookies|session\.use_trans_sid|url_rewriter\.tags)|(soap\.wsdl_cache_dir|soap\.wsdl_cache_enabled|soap\.wsdl_cache_limit|soap\.wsdl_cache_ttl)|(sqlite\.assoc_case)|(tidy\.clean_output|tidy\.default_config)|(zlib\.output_compression|zlib\.output_compression_level|zlib\.output_handler)|(suhosin\.[-a-z0-9_.]+))(\b)/gi,
  php_doc: /(^[ \t]*|\n\s*\*\s*|(?={))(@(?:abstract|access|author|category|copyright|deprecated|example|final|filesource|global|ignore|internal|license|link|method|name|package|param|property|return|see|since|static|staticvar|subpackage|todo|tutorial|uses|var|version)|(@(?:exception|throws))|(\{@(?:example|id|internal|inheritdoc|link|source|toc|tutorial)))(\b)/g,
  js_doc: /(^[ \t]*|\n\s*\*\s*|(?={))(@(?:augments|author|borrows|class|constant|constructor|constructs|default|deprecated|description|event|example|field|fileOverview|function|ignore|inner|lends|memberOf|name|namespace|param|private|property|public|requires|returns|see|since|static|throws|type|version)|(@argument)|(@extends)|(\{@link))(\b)/g,
  http: /(^(?:HTTP\/[0-9.]+\s+)?)(100.*|(101.*)|(200.*)|(201.*)|(202.*)|(203.*)|(204.*)|(205.*)|(206.*)|(300.*)|(301.*)|(302.*)|(303.*)|(304.*)|(305.*)|(306.*)|(307.*)|(400.*)|(401.*)|(402.*)|(403.*)|(404.*)|(405.*)|(406.*)|(407.*)|(408.*)|(409.*)|(410.*)|(411.*)|(412.*)|(413.*)|(414.*)|(415.*)|(416.*)|(417.*)|(500.*)|(501.*)|(502.*)|(503.*)|(504.*)|(505.*)|(Accept)|(Accept-Charset)|(Accept-Encoding)|(Accept-Language)|(Accept-Ranges)|(Age)|(Allow)|(Authorization)|(Cache-Control)|(Connection)|(Content-Encoding)|(Content-Language)|(Content-Length)|(Content-Location)|(Content-MD5)|(Content-Range)|(Content-Type)|(Date)|(ETag)|(Expect)|(Expires)|(From)|(Host)|(If-Match)|(If-Modified-Since)|(If-None-Match)|(If-Range)|(If-Unmodified-Since)|(Last-Modified)|(Location)|(Max-Forwards)|(Pragma)|(Proxy-Authenticate)|(Proxy-Authorization)|(Range)|(Referer)|(Retry-After)|(Server)|(TE)|(Trailer)|(Transfer-Encoding)|(Upgrade)|(User-Agent)|(Vary)|(Via)|(Warning)|(WWW-Authenticate)|(Content-Disposition)|(Keep-Alive)|(Set-Cookie)|(Cookie)|(Refresh)|(Access-Control-Allow-Origin|Access-Control-Max-Age|Access-Control-Allow-Credentials|Access-Control-Allow-Methods|Access-Control-Allow-Headers)|(Origin|Access-Control-Request-Method|Access-Control-Request-Headers)|(X-Forwarded-For)|(X-Frame-Options|X-XSS-Protection)|(X-Content-Type-Options)|(X-UA-Compatible)|(X-Requested-With)|(X-Robots-Tag))(:|$)/gim,
  mail: /(^|\n|\\n)(Return-Path|Received|Path|DL-Expansion-History-Indication|(MIME-Version|Control|Also-Control|Original-Encoded-Information-Types|Alternate-Recipient|Disclose-Recipients|Content-Disposition)|(From|Approved|Sender|To|Cc|Bcc|For-Handling|For-Comment|Newsgroups|Apparently-To|Distribution|Fax|Telefax|Phone|Mail-System-Version|Mailer|Originating-Client|X-Mailer|X-Newsreader)|(Reply-To|Followup-To|Errors-To|Return-Receipt-To|Prevent-NonDelivery-Report|Generate-Delivery-Report|Content-Return|X400-Content-Return)|(Message-ID|Content-ID|Content-Base|Content-Location|In-Reply-To|References|See-Also|Obsoletes|Supersedes|Article-Updates|Article-Names)|(Keywords|Subject|Comments|Content-Description|Organization|Organisation|Summary|Content-Identifier)|(Delivery-Date|Date|Expires|Expiry-Date|Reply-By)|(Priority|Precedence|Importance|Sensitivity|Incomplete-Copy)|(Language|Content-Language)|(Content-Length|Lines)|(Conversion|Content-Conversion|Conversion-With-Loss)|(Content-Type|Content-SGML-Entity|Content-Transfer-Encoding|Message-Type|Encoding)|(Resent-Reply-To|Resent-From|Resent-Sender|Resent-From|Resent-Date|Resent-To|Resent-cc|Resent-bcc|Resent-Message-ID)|(Content-MD5|Xref)|(Fcc|Auto-Forwarded|Discarded-X400-IPMS-Extensions|Discarded-X400-MTS-Extensions|Status))(:|$)/gi,
  sql: /(\b)(ALTER(?:\s+DEFINER\s*=\s*\S+)?\s+EVENT|(ALTER(?:\s+ONLINE|\s+OFFLINE)?(?:\s+IGNORE)?\s+TABLE)|(ALTER(?:\s+ALGORITHM\s*=\s*(?:UNDEFINED|MERGE|TEMPTABLE))?(?:\s+DEFINER\s*=\s*\S+)?(?:\s+SQL\s+SECURITY\s+(?:DEFINER|INVOKER))?\s+VIEW)|(ANALYZE(?:\s+NO_WRITE_TO_BINLOG|\s+LOCAL)?\s+TABLE)|(CREATE(?:\s+DEFINER\s*=\s*\S+)?\s+EVENT)|(CREATE(?:\s+DEFINER\s*=\s*\S+)?\s+FUNCTION)|(CREATE(?:\s+DEFINER\s*=\s*\S+)?\s+PROCEDURE)|(CREATE(?:\s+ONLINE|\s+OFFLINE)?(?:\s+UNIQUE|\s+FULLTEXT|\s+SPATIAL)?\s+INDEX)|(CREATE(?:\s+TEMPORARY)?\s+TABLE)|(CREATE(?:\s+DEFINER\s*=\s*\S+)?\s+TRIGGER)|(CREATE(?:\s+OR\s+REPLACE)?(?:\s+ALGORITHM\s*=\s*(?:UNDEFINED|MERGE|TEMPTABLE))?(?:\s+DEFINER\s*=\s*\S+)?(?:\s+SQL\s+SECURITY\s+(?:DEFINER|INVOKER))?\s+VIEW)|(DROP(?:\s+ONLINE|\s+OFFLINE)?\s+INDEX)|(DROP(?:\s+TEMPORARY)?\s+TABLE)|(END)|(OPTIMIZE(?:\s+NO_WRITE_TO_BINLOG|\s+LOCAL)?\s+TABLE)|(REPAIR(?:\s+NO_WRITE_TO_BINLOG|\s+LOCAL)?\s+TABLE)|(SET(?:\s+GLOBAL|\s+SESSION)?\s+TRANSACTION\s+ISOLATION\s+LEVEL)|(SHOW(?:\s+FULL)?\s+COLUMNS)|(SHOW(?:\s+STORAGE)?\s+ENGINES)|(SHOW\s+(?:INDEX|INDEXES|KEYS))|(SHOW(?:\s+FULL)?\s+PROCESSLIST)|(SHOW(?:\s+GLOBAL|\s+SESSION)?\s+STATUS)|(SHOW(?:\s+FULL)?\s+TABLES)|(SHOW(?:\s+GLOBAL|\s+SESSION)?\s+VARIABLES)|(ALTER\s+(?:DATABASE|SCHEMA)|ALTER\s+LOGFILE\s+GROUP|ALTER\s+SERVER|ALTER\s+TABLESPACE|BACKUP\s+TABLE|CACHE\s+INDEX|CALL|CHANGE\s+MASTER\s+TO|CHECK\s+TABLE|CHECKSUM\s+TABLE|CREATE\s+(?:DATABASE|SCHEMA)|CREATE\s+LOGFILE\s+GROUP|CREATE\s+SERVER|CREATE\s+TABLESPACE|CREATE\s+USER|DELETE|DESCRIBE|DO|DROP\s+(?:DATABASE|SCHEMA)|DROP\s+EVENT|DROP\s+FUNCTION|DROP\s+PROCEDURE|DROP\s+LOGFILE\s+GROUP|DROP\s+SERVER|DROP\s+TABLESPACE|DROP\s+TRIGGER|DROP\s+USER|DROP\s+VIEW|EXPLAIN|FLUSH|GRANT|HANDLER|HELP|INSERT|INSTALL\s+PLUGIN|JOIN|KILL|LOAD\s+DATA\s+FROM\s+MASTER|LOAD\s+DATA|LOAD\s+INDEX|LOAD\s+XML|PURGE\s+MASTER\s+LOGS|RENAME\s+(?:DATABASE|SCHEMA)|RENAME\s+TABLE|RENAME\s+USER|REPLACE|RESET\s+MASTER|RESET\s+SLAVE|RESIGNAL|RESTORE\s+TABLE|REVOKE|SELECT|SET\s+PASSWORD|SHOW\s+AUTHORS|SHOW\s+BINARY\s+LOGS|SHOW\s+BINLOG\s+EVENTS|SHOW\s+CHARACTER\s+SET|SHOW\s+COLLATION|SHOW\s+CONTRIBUTORS|SHOW\s+CREATE\s+(?:DATABASE|SCHEMA)|SHOW\s+CREATE\s+TABLE|SHOW\s+CREATE\s+VIEW|SHOW\s+(?:DATABASE|SCHEMA)S|SHOW\s+ENGINE|SHOW\s+ERRORS|SHOW\s+GRANTS|SHOW\s+MASTER\s+STATUS|SHOW\s+OPEN\s+TABLES|SHOW\s+PLUGINS|SHOW\s+PRIVILEGES|SHOW\s+SCHEDULER\s+STATUS|SHOW\s+SLAVE\s+HOSTS|SHOW\s+SLAVE\s+STATUS|SHOW\s+TABLE\s+STATUS|SHOW\s+TRIGGERS|SHOW\s+WARNINGS|SHOW|SIGNAL|START\s+SLAVE|STOP\s+SLAVE|UNINSTALL\s+PLUGIN|UNION|UPDATE|USE)|(LOOP|LEAVE|ITERATE|WHILE)|(IF|ELSEIF)|(REPEAT|UNTIL)|(TRUNCATE(?:\s+TABLE)?)|(START\s+TRANSACTION|BEGIN|COMMIT|ROLLBACK)|(SAVEPOINT|ROLLBACK\s+TO\s+SAVEPOINT)|((?:UN)?LOCK\s+TABLES?)|(SET\s+NAMES|SET\s+CHARACTER\s+SET)|(ON\s+DUPLICATE\s+KEY\s+UPDATE)|(IN\s+BOOLEAN\s+MODE|IN\s+NATURAL\s+LANGUAGE\s+MODE|WITH\s+QUERY\s+EXPANSION)|(AUTO_INCREMENT)|(IS|IS\s+NULL)|(BETWEEN|NOT\s+BETWEEN|IN|NOT\s+IN)|(ANY|SOME)|(ALL)|(EXISTS|NOT\s+EXISTS)|(WITH\s+ROLLUP)|(SOUNDS\s+LIKE)|(LIKE|NOT\s+LIKE)|(NOT\s+REGEXP|REGEXP)|(RLIKE)|(NOT|AND|OR|XOR)|(CASE)|(DIV)|(BINARY)|(CURRENT_DATE|CURRENT_TIME|CURRENT_TIMESTAMP|LOCALTIME|LOCALTIMESTAMP|UTC_DATE|UTC_TIME|UTC_TIMESTAMP)|(INTERVAL)|(ACCESSIBLE|ADD|ALTER|ANALYZE|AS|ASC|ASENSITIVE|BEFORE|BOTH|BY|CASCADE|CHANGE|CHARACTER|CHECK|CLOSE|COLLATE|COLUMN|CONDITION|CONSTRAINT|CONTINUE|CONVERT|CREATE|CROSS|CURSOR|DATABASE|DATABASES|DAY_HOUR|DAY_MICROSECOND|DAY_MINUTE|DAY_SECOND|DECLARE|DEFAULT|DELAYED|DESC|DETERMINISTIC|DISTINCT|DISTINCTROW|DROP|DUAL|EACH|ELSE|ENCLOSED|ESCAPED|EXIT|FALSE|FETCH|FLOAT4|FLOAT8|FOR|FORCE|FOREIGN|FROM|FULLTEXT|GROUP|HAVING|HIGH_PRIORITY|HOUR_MICROSECOND|HOUR_MINUTE|HOUR_SECOND|IGNORE|INDEX|INFILE|INNER|INOUT|INSENSITIVE|INT1|INT2|INT3|INT4|INT8|INTO|KEY|KEYS|LEADING|LEFT|LIMIT|LINEAR|LINES|LOAD|LOCK|LONG|LOW_PRIORITY|MASTER_SSL_VERIFY_SERVER_CERT|MATCH|MIDDLEINT|MINUTE_MICROSECOND|MINUTE_SECOND|MODIFIES|NATURAL|NO_WRITE_TO_BINLOG|NULL|OFFSET|ON|OPEN|OPTIMIZE|OPTION|OPTIONALLY|ORDER|OUT|OUTER|OUTFILE|PRECISION|PRIMARY|PROCEDURE|PURGE|RANGE|READ|READS|READ_WRITE|REFERENCES|RELEASE|RENAME|REQUIRE|RESTRICT|RETURN|RIGHT|SCHEMA|SCHEMAS|SECOND_MICROSECOND|SENSITIVE|SEPARATOR|SPATIAL|SPECIFIC|SQL|SQLEXCEPTION|SQLSTATE|SQLWARNING|SQL_BIG_RESULT|SQL_CALC_FOUND_ROWS|SQL_SMALL_RESULT|SSL|STARTING|STRAIGHT_JOIN|TABLE|TERMINATED|THEN|TO|TRAILING|TRIGGER|TRUE|UNDO|UNIQUE|UNLOCK|UNSIGNED|USAGE|USING|VALUES|VARCHARACTER|VARYING|WHEN|WHERE|WITH|WRITE|XOR|YEAR_MONTH|ZEROFILL))\b(?!\()|\b(bit|tinyint|bool|boolean|smallint|mediumint|int|integer|bigint|float|double\s+precision|double|real|decimal|dec|numeric|fixed|(date|datetime|timestamp|time|year)|(char|varchar|binary|varbinary|tinyblob|tinytext|blob|text|mediumblob|mediumtext|longblob|longtext|enum|set)|(mod)|(CURRENT_USER))\b|\b(coalesce|greatest|isnull|interval|least|(if|ifnull|nullif)|(ascii|bin|bit_length|char|char_length|character_length|concat|concat_ws|conv|elt|export_set|field|find_in_set|format|hex|insert|instr|lcase|left|length|load_file|locate|lower|lpad|ltrim|make_set|mid|oct|octet_length|ord|position|quote|repeat|replace|reverse|right|rpad|rtrim|soundex|sounds_like|space|substr|substring|substring_index|trim|ucase|unhex|upper)|(strcmp)|(abs|acos|asin|atan|atan2|ceil|ceiling|cos|cot|crc32|degrees|exp|floor|ln|log|log2|log10|pi|pow|power|radians|rand|round|sign|sin|sqrt|tan|truncate)|(adddate|addtime|convert_tz|curdate|curtime|date|datediff|date_add|date_format|date_sub|day|dayname|dayofmonth|dayofweek|dayofyear|extract|from_days|from_unixtime|get_format|hour|last_day|makedate|maketime|microsecond|minute|month|monthname|now|period_add|period_diff|quarter|second|sec_to_time|str_to_date|subdate|subtime|sysdate|time|timediff|timestamp|timestampadd|timestampdiff|time_format|time_to_sec|to_days|to_seconds|unix_timestamp|week|weekday|weekofyear|year|yearweek)|(cast|convert)|(extractvalue|updatexml)|(bit_count)|(aes_encrypt|aes_decrypt|compress|decode|encode|des_decrypt|des_encrypt|encrypt|md5|old_password|password|sha|sha1|uncompress|uncompressed_length)|(benchmark|charset|coercibility|collation|connection_id|database|found_rows|last_insert_id|row_count|schema|session_user|system_user|user|version)|(default|get_lock|inet_aton|inet_ntoa|is_free_lock|is_used_lock|master_pos_wait|name_const|release_lock|sleep|uuid|uuid_short|values)|(avg|bit_and|bit_or|bit_xor|count|count_distinct|group_concat|min|max|std|stddev|stddev_pop|stddev_samp|sum|var_pop|var_samp|variance)|(row)|(match|against))(\s*\(|$)/gi, // collisions: char, set, allow parenthesis - IN, ANY, ALL, SOME, NOT, AND, OR, XOR
  sqlset: /(\b)(ignore_builtin_innodb|innodb_adaptive_hash_index|innodb_additional_mem_pool_size|innodb_autoextend_increment|innodb_autoinc_lock_mode|innodb_buffer_pool_awe_mem_mb|innodb_buffer_pool_size|innodb_commit_concurrency|innodb_concurrency_tickets|innodb_data_file_path|innodb_data_home_dir|innodb_doublewrite|innodb_fast_shutdown|innodb_file_io_threads|innodb_file_per_table|innodb_flush_log_at_trx_commit|innodb_flush_method|innodb_force_recovery|innodb_checksums|innodb_lock_wait_timeout|innodb_locks_unsafe_for_binlog|innodb_log_arch_dir|innodb_log_archive|innodb_log_buffer_size|innodb_log_file_size|innodb_log_files_in_group|innodb_log_group_home_dir|innodb_max_dirty_pages_pct|innodb_max_purge_lag|innodb_mirrored_log_groups|innodb_open_files|innodb_rollback_on_timeout|innodb_stats_on_metadata|innodb_support_xa|innodb_sync_spin_loops|innodb_table_locks|innodb_thread_concurrency|innodb_thread_sleep_delay|innodb_use_legacy_cardinality_algorithm|(ndb[-_]batch[-_]size)|(ndb[-_]log[-_]update[-_]as[-_]write|ndb_log_updated_only)|(ndb_log_orig)|(slave[-_]allow[-_]batching)|(have_ndbcluster|multi_range_count|ndb_autoincrement_prefetch_sz|ndb_cache_check_time|ndb_extra_logging|ndb_force_send|ndb_use_copying_alter_table|ndb_use_exact_count|ndb_wait_connected)|(log[-_]bin[-_]trust[-_]function[-_]creators|log[-_]bin)|(binlog_cache_size|max_binlog_cache_size|max_binlog_size|sync_binlog)|(auto_increment_increment|auto_increment_offset)|(ndb_log_empty_epochs)|(log[-_]slave[-_]updates|report[-_]host|report[-_]password|report[-_]port|report[-_]user|slave[-_]net[-_]timeout|slave[-_]skip[-_]errors)|(init_slave|rpl_recovery_rank|slave_compressed_protocol|slave_exec_mode|slave_transaction_retries|sql_slave_skip_counter)|(master[-_]bind|slave[-_]load[-_]tmpdir|server[-_]id)|(sql_big_tables)|(basedir|big[-_]tables|binlog[-_]format|collation[-_]server|datadir|debug|delay[-_]key[-_]write|engine[-_]condition[-_]pushdown|event[-_]scheduler|general[-_]log|character[-_]set[-_]filesystem|character[-_]set[-_]server|character[-_]sets[-_]dir|init[-_]file|language|large[-_]pages|log[-_]error|log[-_]output|log[-_]queries[-_]not[-_]using[-_]indexes|log[-_]slow[-_]queries|log[-_]warnings|log|low[-_]priority[-_]updates|memlock|min[-_]examined[-_]row[-_]limit|old[-_]passwords|open[-_]files[-_]limit|pid[-_]file|port|safe[-_]show[-_]database|secure[-_]auth|secure[-_]file[-_]priv|skip[-_]external[-_]locking|skip[-_]networking|skip[-_]show[-_]database|slow[-_]query[-_]log|socket|sql[-_]mode|tmpdir|version)|(autocommit|error_count|foreign_key_checks|identity|insert_id|last_insert_id|profiling|profiling_history_size|rand_seed1|rand_seed2|sql_auto_is_null|sql_big_selects|sql_buffer_result|sql_log_bin|sql_log_off|sql_log_update|sql_notes|sql_quote_show_create|sql_safe_updates|sql_warnings|timestamp|unique_checks|warning_count)|(sql_low_priority_updates)|(sql_max_join_size)|(automatic_sp_privileges|back_log|bulk_insert_buffer_size|collation_connection|collation_database|completion_type|concurrent_insert|connect_timeout|date_format|datetime_format|default_week_format|delayed_insert_limit|delayed_insert_timeout|delayed_queue_size|div_precision_increment|expire_logs_days|flush|flush_time|ft_boolean_syntax|ft_max_word_len|ft_min_word_len|ft_query_expansion_limit|ft_stopword_file|general_log_file|group_concat_max_len|have_archive|have_blackhole_engine|have_compress|have_crypt|have_csv|have_dynamic_loading|have_example_engine|have_federated_engine|have_geometry|have_innodb|have_isam|have_merge_engine|have_openssl|have_partitioning|have_query_cache|have_raid|have_row_based_replication|have_rtree_keys|have_ssl|have_symlink|hostname|character_set_client|character_set_connection|character_set_database|character_set_results|character_set_system|init_connect|interactive_timeout|join_buffer_size|keep_files_on_create|key_buffer_size|key_cache_age_threshold|key_cache_block_size|key_cache_division_limit|large_page_size|lc_time_names|license|local_infile|locked_in_memory|log_bin|long_query_time|lower_case_file_system|lower_case_table_names|max_allowed_packet|max_connect_errors|max_connections|max_delayed_threads|max_error_count|max_heap_table_size|max_insert_delayed_threads|max_join_size|max_length_for_sort_data|max_prepared_stmt_count|max_relay_log_size|max_seeks_for_key|max_sort_length|max_sp_recursion_depth|max_tmp_tables|max_user_connections|max_write_lock_count|myisam_data_pointer_size|myisam_max_sort_file_size|myisam_recover_options|myisam_repair_threads|myisam_sort_buffer_size|myisam_stats_method|myisam_use_mmap|named_pipe|net_buffer_length|net_read_timeout|net_retry_count|net_write_timeout|new|old|optimizer_prune_level|optimizer_search_depth|optimizer_switch|plugin_dir|preload_buffer_size|prepared_stmt_count|protocol_version|pseudo_thread_id|query_alloc_block_size|query_cache_limit|query_cache_min_res_unit|query_cache_size|query_cache_type|query_cache_wlock_invalidate|query_prealloc_size|range_alloc_block_size|read_buffer_size|read_only|read_rnd_buffer_size|relay_log_purge|relay_log_space_limit|shared_memory|shared_memory_base_name|slow_launch_time|slow_query_log_file|sort_buffer_size|sql_select_limit|storage_engine|sync_frm|system_time_zone|table_cache|table_definition_cache|table_lock_wait_timeout|table_open_cache|table_type|thread_cache_size|thread_concurrency|thread_handling|thread_stack|time_format|time_zone|timed_mutexes|tmp_table_size|transaction_alloc_block_size|transaction_prealloc_size|tx_isolation|updatable_views_with_limit|version_comment|version_compile_machine|version_compile_os|wait_timeout)|(ssl[-_]ca|ssl[-_]capath|ssl[-_]cert|ssl[-_]cipher|ssl[-_]key))((?!-)\b)/gi,
  sqlstatus: /()(Com_.+|(.+))()/gi,
  sqlite: /(\b)(ALTER\s+TABLE|ANALYZE|ATTACH|COPY|DELETE|DETACH|DROP\s+INDEX|DROP\s+TABLE|DROP\s+TRIGGER|DROP\s+VIEW|EXPLAIN|INSERT|CONFLICT|REINDEX|REPLACE|SELECT|UPDATE|TRANSACTION|VACUUM|(CREATE\s+VIRTUAL\s+TABLE)|(BEGIN|COMMIT|ROLLBACK)|(CREATE(?:\s+UNIQUE)?\s+INDEX)|(CREATE(?:\s+TEMP|\s+TEMPORARY)?\s+TABLE)|(CREATE(?:\s+TEMP|\s+TEMPORARY)?\s+TRIGGER)|(CREATE(?:\s+TEMP|\s+TEMPORARY)?\s+VIEW)|(ABORT|ACTION|ADD|AFTER|ALL|AS|ASC|AUTOINCREMENT|BEFORE|BY|CASCADE|CHECK|COLUMN|CONSTRAINT|CROSS|CURRENT_DATE|CURRENT_TIME|CURRENT_TIMESTAMP|DATABASE|DEFAULT|DEFERRABLE|DEFERRED|DESC|DISTINCT|EACH|END|EXCEPT|EXCLUSIVE|FAIL|FOR|FOREIGN|FROM|FULL|GROUP|HAVING|IF|IGNORE|IMMEDIATE|INDEXED|INITIALLY|INNER|INSTEAD|INTERSECT|INTO|IS|JOIN|KEY|LEFT|LIMIT|NATURAL|NO|NOT|NOTNULL|NULL|OF|OFFSET|ON|ORDER|OUTER|PLAN|PRAGMA|PRIMARY|QUERY|RAISE|REFERENCES|RELEASE|RENAME|RESTRICT|RIGHT|ROW|SAVEPOINT|SET|TEMPORARY|TO|UNION|UNIQUE|USING|VALUES|WHERE)|(like|glob|regexp|match|escape|isnull|isnotnull|between|exists|case|when|then|else|cast|collate|in|and|or|not))\b|\b(abs|coalesce|glob|ifnull|hex|last_insert_rowid|length|like|load_extension|lower|nullif|quote|random|randomblob|round|soundex|sqlite_version|substr|typeof|upper|(date|time|datetime|julianday|strftime)|(avg|count|max|min|sum|total))(\s*\(|$)/gi, // collisions: min, max, end, like, glob
  sqliteset: /(\b)(auto_vacuum|cache_size|case_sensitive_like|count_changes|default_cache_size|empty_result_callbacks|encoding|foreign_keys|full_column_names|fullfsync|incremental_vacuum|journal_mode|journal_size_limit|legacy_file_format|locking_mode|page_size|max_page_count|read_uncommitted|recursive_triggers|reverse_unordered_selects|secure_delete|short_column_names|synchronous|temp_store|temp_store_directory|collation_list|database_list|foreign_key_list|freelist_count|index_info|index_list|page_count|table_info|schema_version|compile_options|integrity_check|quick_check|parser_trace|vdbe_trace|vdbe_listing)(\b)/gi,
  sqlitestatus: /()(.+)()/g,
  pgsql: /(\b)(COMMIT\s+PREPARED|DROP\s+OWNED|PREPARE\s+TRANSACTION|REASSIGN\s+OWNED|RELEASE\s+SAVEPOINT|ROLLBACK\s+PREPARED|ROLLBACK\s+TO|SET\s+CONSTRAINTS|SET\s+ROLE|SET\s+SESSION\s+AUTHORIZATION|SET\s+TRANSACTION|START\s+TRANSACTION|(ABORT|ALTER\s+AGGREGATE|ALTER\s+CONVERSION|ALTER\s+DATABASE|ALTER\s+DOMAIN|ALTER\s+FUNCTION|ALTER\s+GROUP|ALTER\s+INDEX|ALTER\s+LANGUAGE|ALTER\s+OPERATOR|ALTER\s+ROLE|ALTER\s+SCHEMA|ALTER\s+SEQUENCE|ALTER\s+TABLE|ALTER\s+TABLESPACE|ALTER\s+TRIGGER|ALTER\s+TYPE|ALTER\s+USER|ANALYZE|BEGIN|CHECKPOINT|CLOSE|CLUSTER|COMMENT|COMMIT|COPY|CREATE\s+AGGREGATE|CREATE\s+CAST|CREATE\s+CONSTRAINT|CREATE\s+CONVERSION|CREATE\s+DATABASE|CREATE\s+DOMAIN|CREATE\s+FUNCTION|CREATE\s+GROUP|CREATE\s+INDEX|CREATE\s+LANGUAGE|CREATE\s+OPERATOR|CREATE\s+ROLE|CREATE\s+RULE|CREATE\s+SCHEMA|CREATE\s+SEQUENCE|CREATE\s+TABLE|CREATE\s+TABLE\s+AS|CREATE\s+TABLESPACE|CREATE\s+TRIGGER|CREATE\s+TYPE|CREATE\s+USER|CREATE\s+VIEW|DEALLOCATE|DECLARE|DELETE|DROP\s+AGGREGATE|DROP\s+CAST|DROP\s+CONVERSION|DROP\s+DATABASE|DROP\s+DOMAIN|DROP\s+FUNCTION|DROP\s+GROUP|DROP\s+INDEX|DROP\s+LANGUAGE|DROP\s+OPERATOR|DROP\s+ROLE|DROP\s+RULE|DROP\s+SCHEMA|DROP\s+SEQUENCE|DROP\s+TABLE|DROP\s+TABLESPACE|DROP\s+TRIGGER|DROP\s+TYPE|DROP\s+USER|DROP\s+VIEW|END|EXECUTE|EXPLAIN|FETCH|GRANT|INSERT|LISTEN|LOAD|LOCK|MOVE|NOTIFY|PREPARE|REINDEX|RESET|REVOKE|ROLLBACK|SAVEPOINT|SELECT|SELECT\s+INTO|TRUNCATE|UNLISTEN|UPDATE|VACUUM|VALUES)|(ALTER\s+OPERATOR\s+CLASS)|(CREATE\s+OPERATOR\s+CLASS)|(DROP\s+OPERATOR\s+CLASS)|(current_date|current_time|current_timestamp|localtime|localtimestamp|AT\s+TIME\s+ZONE)|(current_user|session_user|user)|(AND|NOT|OR)|(BETWEEN)|(LIKE|SIMILAR\s+TO)|(CASE|WHEN|THEN|ELSE|coalesce|nullif|greatest|least)|(EXISTS|IN|ANY|SOME|ALL))\b|\b(abs|cbrt|ceil|ceiling|degrees|exp|floor|ln|log|mod|pi|power|radians|random|round|setseed|sign|sqrt|trunc|width_bucket|acos|asin|atan|atan2|cos|cot|sin|tan|(bit_length|char_length|convert|lower|octet_length|overlay|position|substring|trim|upper|ascii|btrim|chr|decode|encode|initcap|length|lpad|ltrim|md5|pg_client_encoding|quote_ident|quote_literal|regexp_replace|repeat|replace|rpad|rtrim|split_part|strpos|substr|to_ascii|to_hex|translate)|(get_bit|get_byte|set_bit|set_byte|md5)|(to_char|to_date|to_number|to_timestamp)|(age|clock_timestamp|date_part|date_trunc|extract|isfinite|justify_days|justify_hours|justify_interval|now|statement_timestamp|timeofday|transaction_timestamp)|(area|center|diameter|height|isclosed|isopen|npoints|pclose|popen|radius|width|box|circle|lseg|path|point|polygon)|(abbrev|broadcast|family|host|hostmask|masklen|netmask|network|set_masklen|text|trunc)|(currval|nextval|setval)|(array_append|array_cat|array_dims|array_lower|array_prepend|array_to_string|array_upper|string_to_array)|(avg|bit_and|bit_or|bool_and|bool_or|count|every|max|min|sum|corr|covar_pop|covar_samp|regr_avgx|regr_avgy|regr_count|regr_intercept|regr_r2|regr_slope|regr_sxx|regr_sxy|regr_syy|stddev|stddev_pop|stddev_samp|variance|var_pop|var_samp)|(generate_series)|(current_database|current_schema|current_schemas|inet_client_addr|inet_client_port|inet_server_addr|inet_server_port|pg_my_temp_schema|pg_is_other_temp_schema|pg_postmaster_start_time|version|has_database_privilege|has_function_privilege|has_language_privilege|has_schema_privilege|has_table_privilege|has_tablespace_privilege|pg_has_role|pg_conversion_is_visible|pg_function_is_visible|pg_operator_is_visible|pg_opclass_is_visible|pg_table_is_visible|pg_type_is_visible|format_type|pg_get_constraintdef|pg_get_expr|pg_get_indexdef|pg_get_ruledef|pg_get_serial_sequence|pg_get_triggerdef|pg_get_userbyid|pg_get_viewdef|pg_tablespace_databases|col_description|obj_description|shobj_description)|(current_setting|set_config|pg_cancel_backend|pg_reload_conf|pg_rotate_logfile|pg_start_backup|pg_stop_backup|pg_switch_xlog|pg_current_xlog_location|pg_current_xlog_insert_location|pg_xlogfile_name_offset|pg_xlogfile_name|pg_column_size|pg_database_size|pg_relation_size|pg_size_pretty|pg_tablespace_size|pg_total_relation_size|pg_ls_dir|pg_read_file|pg_stat_file|pg_advisory_lock|pg_advisory_lock_shared|pg_try_advisory_lock|pg_try_advisory_lock_shared|pg_advisory_unlock|pg_advisory_unlock_shared|pg_advisory_unlock_all))(\s*\(|$)/gi, // collisions: IN, ANY, SOME, ALL (array), trunc, md5, abbrev
  pgsqlset: /(\b)(autovacuum|log_autovacuum_min_duration|autovacuum_max_workers|autovacuum_naptime|autovacuum_vacuum_threshold|autovacuum_analyze_threshold|autovacuum_vacuum_scale_factor|autovacuum_analyze_scale_factor|autovacuum_freeze_max_age|autovacuum_vacuum_cost_delay|autovacuum_vacuum_cost_limit|(search_path|default_tablespace|temp_tablespaces|check_function_bodies|default_transaction_isolation|default_transaction_read_only|session_replication_role|statement_timeout|vacuum_freeze_table_age|vacuum_freeze_min_age|xmlbinary|xmloption|datestyle|intervalstyle|timezone|timezone_abbreviations|extra_float_digits|client_encoding|lc_messages|lc_monetary|lc_numeric|lc_time|default_text_search_config|dynamic_library_path|gin_fuzzy_search_limit|local_preload_libraries)|(add_missing_from|array_nulls|backslash_quote|default_with_oids|escape_string_warning|regex_flavor|sql_inheritance|standard_conforming_strings|synchronize_seqscans|transform_null_equals)|(listen_addresses|port|max_connections|superuser_reserved_connections|unix_socket_directory|unix_socket_group|unix_socket_permissions|bonjour_name|tcp_keepalives_idle|tcp_keepalives_interval|tcp_keepalives_count|authentication_timeout|ssl|ssl_renegotiation_limit|ssl_ciphers|password_encryption|krb_server_keyfile|krb_srvname|krb_caseins_users|db_user_namespace)|(custom_variable_classes)|(allow_system_table_mods|debug_assertions|ignore_system_indexes|post_auth_delay|pre_auth_delay|trace_notify|trace_sort|wal_debug|zero_damaged_pages)|(data_directory|config_file|hba_file|ident_file|external_pid_file)|(deadlock_timeout|max_locks_per_transaction)|(log_destination|logging_collector|log_directory|log_filename|log_rotation_age|log_rotation_size|log_truncate_on_rotation|syslog_facility|syslog_ident|silent_mode|client_min_messages|log_min_messages|log_error_verbosity|log_min_error_statement|log_min_duration_statement|log_checkpoints|log_connections|log_disconnections|log_duration|log_hostname|log_line_prefix|log_lock_waits|log_statement|log_temp_files|log_timezone)|(block_size|integer_datetimes|lc_collate|lc_ctype|max_function_args|max_identifier_length|max_index_keys|segment_size|server_encoding|server_version|server_version_num|wal_block_size|wal_segment_size)|(enable_bitmapscan|enable_hashagg|enable_hashjoin|enable_indexscan|enable_mergejoin|enable_nestloop|enable_seqscan|enable_sort|enable_tidscan|seq_page_cost|random_page_cost|cpu_tuple_cost|cpu_index_tuple_cost|cpu_operator_cost|effective_cache_size|geqo|geqo_threshold|geqo_effort|geqo_pool_size|geqo_generations|geqo_selection_bias|default_statistics_target|constraint_exclusion|cursor_tuple_fraction|from_collapse_limit|join_collapse_limit)|(shared_buffers|temp_buffers|max_prepared_transactions|work_mem|maintenance_work_mem|max_stack_depth|max_files_per_process|shared_preload_libraries|vacuum_cost_delay|vacuum_cost_page_hit|vacuum_cost_page_miss|vacuum_cost_page_dirty|vacuum_cost_limit|bgwriter_delay|bgwriter_lru_maxpages|bgwriter_lru_multiplier|effective_io_concurrency)|(track_activities|track_activity_query_size|track_counts|track_functions|update_process_title|stats_temp_directory)|(fsync|synchronous_commit|wal_sync_method|full_page_writes|wal_buffers|wal_writer_delay|commit_delay|commit_siblings|checkpoint_segments|checkpoint_timeout|checkpoint_completion_target|checkpoint_warning|archive_mode|archive_command|archive_timeout))(\b)/gi,
  mssql: /(\b)(ADD(?:\s+COUNTER)?\s+SIGNATURE|(ALL)|(AND)|(ANY)|(BACKUP)|(BACKUP\s+CERTIFICATE)|(BACKUP\s+MASTER\s+KEY)|(BACKUP\s+SERVICE\s+MASTER\s+KEY)|(BEGIN)|(BEGIN\s+CONVERSATION\s+TIMER)|(BEGIN\s+DIALOG)|(BEGIN\s+DISTRIBUTED\s+(?:TRANSACTION|TRAN))|(BEGIN\s+(?:TRANSACTION|TRAN))|(BETWEEN)|((?:var)?binary)|(bit)|(BREAK)|(BULK\s+INSERT)|(CASE)|(CATCH)|((?:var)?char)|(CHECKPOINT)|(CLOSE)|(CLOSE\s+MASTER\s+KEY)|(CLOSE\s+(?:SYMMETRIC\s+KEY|ALL\s+SYMMETRIC\s+KEYS))|(COLLATE)|(COMMIT)|(COMMIT\s+(?:TRANSACTION|TRAN))|(COMPUTE)|(CONTINUE)|(date)|(datetime)|(datetime2)|(datetimeoffset)|(DEALLOCATE)|(decimal|numeric)|(DECLARE)|(DECLARE\s+CURSOR)|(DELETE)|(DENY)|(DISABLE\s+TRIGGER)|(ELSE)|(ENABLE\s+TRIGGER)|(END)|(END\s+CONVERSATION)|(EXCEPT|INTERSECT)|(EXECUTE|EXEC)|((?:EXECUTE|EXEC)\s+AS)|(EXISTS)|(FETCH)|(float|real)|(FOR)|(FROM)|(geography)|(geometry)|(GET\s+CONVERSATION\s+GROUP)|(GO)|(GOTO)|(GRANT)|(GROUP\s+BY)|(HAVING)|(hierarchyid)|(IDENTITY)|(IF)|(IN)|(INSERT)|((?:big|small|tiny)?int)|(INTO)|(IS(?:\s+NOT)?\s+NULL)|(KILL)|(KILL\s+QUERY\s+NOTIFICATION\s+SUBSCRIPTION)|(KILL\s+STATS\s+JOB)|(LIKE)|(MERGE)|((?:small)?money)|(MOVE\s+CONVERSATION)|(nchar|nvarchar)|(NOT)|(ntext|text|image)|(OPEN)|(OPEN\s+MASTER\s+KEY)|(OPEN\s+SYMMETRIC\s+KEY)|(OPTION)|(OR)|(ORDER\s+BY)|(OUTPUT)|(OVER)|(PRINT)|(RESTORE)|(RESTORE\s+MASTER\s+KEY)|(RESTORE\s+SERVICE\s+MASTER\s+KEY)|(RETURN)|(REVERT)|(REVOKE)|(ROLLBACK\s+TRANSACTION)|(ROLLBACK\s+WORK)|(rowversion)|(SAVE\s+TRANSACTION)|(SELECT)|(SEND)|(SET)|(SHUTDOWN)|(smalldatetime)|(SOME|ANY)|(sql_variant)|(time)|(TOP)|(TRY)|(TRUNCATE\s+TABLE)|(UNION)|(uniqueidentifier)|(UPDATE)|(UPDATE\s+STATISTICS)|(UPDATETEXT)|(USE)|(VAR)|(WAITFOR)|(WHERE)|(WHILE)|(WITH)|(WITH\s+XMLNAMESPACES)|(WRITETEXT)|(XACT_STATE)|(CREATE\s+AGGREGATE)|(CREATE\s+APPLICATION\s+ROLE)|(CREATE\s+ASSEMBLY)|(CREATE\s+ASYMMETRIC\s+KEY)|(CREATE\s+BROKER\s+PRIORITY)|(CREATE\s+CERTIFICATE)|(CREATE\s+CONTRACT)|(CREATE\s+CREDENTIAL)|(CREATE\s+CRYPTOGRAPHIC\s+PROVIDER)|(CREATE\s+DATABASE)|(CREATE\s+DATABASE\s+AUDIT\s+SPECIFICATION)|(CREATE\s+DATABASE\s+ENCRYPTION\s+KEY)|(CREATE\s+DEFAULT)|(CREATE\s+ENDPOINT)|(CREATE\s+EVENT\s+NOTIFICATION)|(CREATE\s+EVENT\s+SESSION)|(CREATE\s+FULLTEXT\s+CATALOG)|(CREATE\s+FULLTEXT\s+INDEX)|(CREATE\s+FULLTEXT\s+STOPLIST)|(CREATE\s+FUNCTION)|(CREATE(?:\s+UNIQUE)?\s+INDEX)|(CREATE\s+LOGIN)|(CREATE\s+MASTER\s+KEY)|(CREATE\s+MESSAGE\s+TYPE)|(CREATE\s+PARTITION\s+FUNCTION)|(CREATE\s+PARTITION\s+SCHEME)|(CREATE\s+PROCEDURE)|(CREATE\s+QUEUE)|(CREATE\s+REMOTE\s+SERVICE\s+BINDING)|(CREATE\s+RESOURCE\s+POOL)|(CREATE\s+ROLE)|(CREATE\s+ROUTE)|(CREATE\s+RULE)|(CREATE\s+SCHEMA)|(CREATE\s+SERVER\s+AUDIT)|(CREATE\s+SERVER\s+AUDIT\s+SPECIFICATION)|(CREATE\s+SERVICE)|(CREATE\s+STATISTICS)|(CREATE\s+SYMMETRIC\s+KEY)|(CREATE\s+SYNONYM)|(CREATE\s+TABLE)|(CREATE\s+TRIGGER)|(CREATE\s+TYPE)|(CREATE\s+USER)|(CREATE\s+VIEW)|(CREATE\s+WORKLOAD\s+GROUP)|(CREATE\s+XML\s+SCHEMA\s+COLLECTION)|(DROP\s+AGGREGATE)|(DROP\s+APPLICATION\s+ROLE)|(DROP\s+ASSEMBLY)|(DROP\s+ASYMMETRIC\s+KEY)|(DROP\s+BROKER\s+PRIORITY)|(DROP\s+CERTIFICATE)|(DROP\s+CONTRACT)|(DROP\s+CREDENTIAL)|(DROP\s+CRYPTOGRAPHIC\s+PROVIDER)|(DROP\s+DATABASE)|(DROP\s+DATABASE\s+AUDIT\s+SPECIFICATION)|(DROP\s+DATABASE\s+ENCRYPTION\s+KEY)|(DROP\s+DEFAULT)|(DROP\s+ENDPOINT)|(DROP\s+EVENT\s+NOTIFICATION)|(DROP\s+EVENT\s+SESSION)|(DROP\s+FULLTEXT\s+CATALOG)|(DROP\s+FULLTEXT\s+INDEX)|(DROP\s+FULLTEXT\s+STOPLIST)|(DROP\s+FUNCTION)|(DROP\s+INDEX)|(DROP\s+LOGIN)|(DROP\s+MASTER\s+KEY)|(DROP\s+MESSAGE\s+TYPE)|(DROP\s+PARTITION\s+FUNCTION)|(DROP\s+PARTITION\s+SCHEME)|(DROP\s+PROCEDURE)|(DROP\s+QUEUE)|(DROP\s+REMOTE\s+SERVICE\s+BINDING)|(DROP\s+RESOURCE\s+POOL)|(DROP\s+ROLE)|(DROP\s+ROUTE)|(DROP\s+RULE)|(DROP\s+SCHEMA)|(DROP\s+SERVER\s+AUDIT)|(DROP\s+SERVER\s+AUDIT\s+SPECIFICATION)|(DROP\s+SERVICE)|(DROP\s+SIGNATURE)|(DROP\s+STATISTICS)|(DROP\s+SYMMETRIC\s+KEY)|(DROP\s+SYNONYM)|(DROP\s+TABLE)|(DROP\s+TRIGGER)|(DROP\s+TYPE)|(DROP\s+USER)|(DROP\s+VIEW)|(DROP\s+WORKLOAD\s+GROUP)|(DROP\s+XML\s+SCHEMA\s+COLLECTION)|(ALTER\s+APPLICATION\s+ROLE)|(ALTER\s+ASSEMBLY)|(ALTER\s+ASYMMETRIC\s+KEY)|(ALTER\s+AUTHORIZATION)|(ALTER\s+BROKER\s+PRIORITY)|(ALTER\s+CERTIFICATE)|(ALTER\s+CREDENTIAL)|(ALTER\s+CRYPTOGRAPHIC\s+PROVIDER)|(ALTER\s+DATABASE)|(ALTER\s+DATABASE\s+AUDIT\s+SPECIFICATION)|(ALTER\s+DATABASE\s+ENCRYPTION\s+KEY)|(ALTER\s+ENDPOINT)|(ALTER\s+EVENT\s+SESSION)|(ALTER\s+FULLTEXT\s+CATALOG)|(ALTER\s+FULLTEXT\s+INDEX)|(ALTER\s+FULLTEXT\s+STOPLIST)|(ALTER\s+FUNCTION)|(ALTER\s+INDEX)|(ALTER\s+LOGIN)|(ALTER\s+MASTER\s+KEY)|(ALTER\s+MESSAGE\s+TYPE)|(ALTER\s+PARTITION\s+FUNCTION)|(ALTER\s+PARTITION\s+SCHEME)|(ALTER\s+PROCEDURE)|(ALTER\s+QUEUE)|(ALTER\s+REMOTE\s+SERVICE\s+BINDING)|(ALTER\s+RESOURCE\s+GOVERNOR)|(ALTER\s+RESOURCE\s+POOL)|(ALTER\s+ROLE)|(ALTER\s+ROUTE)|(ALTER\s+SCHEMA)|(ALTER\s+SERVER\s+AUDIT)|(ALTER\s+SERVER\s+AUDIT\s+SPECIFICATION)|(ALTER\s+SERVICE)|(ALTER\s+SERVICE\s+MASTER\s+KEY)|(ALTER\s+SYMMETRIC\s+KEY)|(ALTER\s+TABLE)|(ALTER\s+TRIGGER)|(ALTER\s+USER)|(ALTER\s+VIEW)|(ALTER\s+WORKLOAD\s+GROUP)|(ALTER\s+XML\s+SCHEMA\s+COLLECTION))\b|\b(ABS|(ACOS)|(APPLOCK_MODE)|(APPLOCK_TEST)|(APP_NAME)|(ASCII)|(ASIN)|(ASSEMBLYPROPERTY)|(ASYMKEY_ID)|(ASYMKEYPROPERTY)|(ATAN)|(ATN2)|(AVG)|(BINARY_CHECKSUM )|(CAST|CONVERT)|(CEILING)|(CertProperty)|(Cert_ID)|(CHAR)|(CHARINDEX)|(CHECKSUM)|(CHECKSUM_AGG)|(COALESCE)|(COLLATIONPROPERTY)|(COL_LENGTH)|(COL_NAME)|(COLUMNPROPERTY)|(COLUMNS_UPDATED)|(CONNECTIONPROPERTY)|(CONTAINS)|(CONTAINSTABLE)|(CONTEXT_INFO)|(CONVERT)|(COS)|(COT)|(COUNT)|(COUNT_BIG)|(CRYPT_GEN_RANDOM)|(CURRENT_REQUEST_ID)|(CURRENT_TIMESTAMP)|(CURRENT_USER)|(CURSOR_STATUS)|(DATABASE_PRINCIPAL_ID)|(DATABASEPROPERTY)|(DATABASEPROPERTYEX)|(DATALENGTH)|(DATEADD)|(DATEDIFF)|(DATENAME)|(DATEPART)|(DAY)|(DB_ID)|(DB_NAME)|(DBCC)|(DECRYPTBYASYMKEY)|(DECRYPTBYCERT)|(DECRYPTBYKEY)|(DECRYPTBYKEYAUTOASYMKEY)|(DECRYPTBYKEYAUTOCERT)|(DECRYPTBYPASSPHRASE)|(DEGREES)|(DENSE_RANK)|(DIFFERENCE)|(ENCRYPTBYASYMKEY)|(ENCRYPTBYCERT)|(ENCRYPTBYKEY)|(ENCRYPTBYPASSPHRASE)|(ERROR_LINE)|(ERROR_MESSAGE)|(ERROR_NUMBER)|(ERROR_PROCEDURE)|(ERROR_SEVERITY)|(ERROR_STATE)|(EVENTDATA)|(EXP)|(FILE_ID)|(FILE_IDEX)|(FILE_NAME)|(FILEGROUP_ID)|(FILEGROUP_NAME)|(FILEGROUPPROPERTY)|(FILEPROPERTY)|(FLOOR)|(FORMATMESSAGE)|(FREETEXT)|(FREETEXTTABLE)|(FULLTEXTCATALOGPROPERTY)|(FULLTEXTSERVICEPROPERTY)|(GET_FILESTREAM_TRANSACTION_CONTEXT)|(GET_TRANSMISSION_STATUS)|(GETANSINULL)|(GETDATE)|(GETUTCDATE)|(GROUPING)|(GROUPING_ID)|(HAS_DBACCESS)|(HAS_PERMS_BY_NAME)|(HASHBYTES)|(HOST_ID)|(HOST_NAME)|(IDENT_CURRENT)|(IDENT_INCR)|(IDENT_SEED)|(INDEXKEY_PROPERTY)|(INDEXPROPERTY)|(INDEX_COL)|(IS_MEMBER)|(IS_OBJECTSIGNED)|(IS_SRVROLEMEMBER)|(ISDATE)|(ISNULL)|(ISNUMERIC)|(Key_GUID)|(Key_ID)|(KEY_NAME)|(LEFT)|(LEN)|(LOG)|(LOG10)|(LOGINPROPERTY)|(LOWER)|(LTRIM)|(MAX)|(MIN)|(MIN_ACTIVE_ROWVERSION)|(MONTH)|(NCHAR)|(NEWID)|(NEWSEQUENTIALID)|(NTILE)|(NULLIF)|(OBJECT_DEFINITION)|(OBJECT_ID)|(OBJECT_NAME)|(OBJECT_SCHEMA_NAME)|(OBJECTPROPERTY)|(OBJECTPROPERTYEX)|(OPENDATASOURCE)|(OPENQUERY)|(OPENROWSET)|(OPENXML)|(ORIGINAL_DB_NAME)|(ORIGINAL_LOGIN)|(PARSENAME)|(PathName)|(PATINDEX)|(PERMISSIONS)|(PI)|(POWER)|(PUBLISHINGSERVERNAME)|(PWDCOMPARE)|(PWDENCRYPT)|(QUOTENAME)|(RADIANS)|(RAISERROR)|(RAND)|(RANK)|(READTEXT)|(RECEIVE)|(RECONFIGURE)|(REPLACE)|(REPLICATE)|(REVERSE)|(RIGHT)|(ROUND)|(ROW_NUMBER)|(ROWCOUNT_BIG)|(RTRIM)|(SCHEMA_ID)|(SCHEMA_NAME)|(SCOPE_IDENTITY)|(SERVERPROPERTY)|(SESSION_USER)|(SESSIONPROPERTY)|(SETUSER)|(SIGN)|(SignByAsymKey)|(SignByCert)|(SIN)|(SOUNDEX)|(SPACE)|(SQL_VARIANT_PROPERTY)|(SQRT)|(SQUARE)|(STATS_DATE)|(STDEV)|(STDEVP)|(STR)|(STUFF)|(SUBSTRING)|(SUM)|(SUSER_ID)|(SUSER_NAME)|(SUSER_SID)|(SUSER_SNAME)|(SWITCHOFFSET)|(SYSDATETIME)|(SYSDATETIMEOFFSET)|(SYMKEYPROPERTY)|(SYSUTCDATETIME)|(SYSTEM_USER)|(TAN)|(TERTIARY_WEIGHTS)|(TEXTPTR)|(TEXTVALID)|(TODATETIMEOFFSET)|(TRIGGER_NESTLEVEL)|(TYPE_ID)|(TYPE_NAME)|(TYPEPROPERTY)|(UNICODE)|(UPDATE)|(UPPER)|(USER)|(USER_ID)|(USER_NAME)|(VARP)|(VerifySignedByCert)|(VerifySignedByAsymKey)|(xml)|(xml_schema_namespace)|(YEAR))(\s*\(|$)/gi, // collisions: IDENTITY
  oracle: /(\b)(ALTER\s+CLUSTER|(ALTER\s+DATABASE)|(ALTER\s+DIMENSION)|(ALTER\s+DISKGROUP)|(ALTER\s+FUNCTION)|(ALTER\s+INDEX)|(ALTER\s+INDEXTYPE)|(ALTER\s+JAVA)|(ALTER\s+MATERIALIZED\s+VIEW)|(ALTER\s+MATERIALIZED\s+VIEW\s+LOG)|(ALTER\s+OPERATOR)|(ALTER\s+OUTLINE)|(ALTER\s+PACKAGE)|(ALTER\s+PROCEDURE)|(ALTER\s+PROFILE)|(ALTER\s+RESOURCE\s+COST)|(ALTER\s+ROLE)|(ALTER\s+ROLLBACK\s+SEGMENT)|(ALTER\s+SEQUENCE)|(ALTER\s+SESSION)|(ALTER\s+SYSTEM)|(ALTER\s+TABLE)|(ALTER\s+TABLESPACE)|(ALTER\s+TRIGGER)|(ALTER\s+TYPE)|(ALTER\s+USER)|(ALTER\s+VIEW)|(ANALYZE)|(ASSOCIATE\s+STATISTICS)|(AUDIT)|(CALL)|(COMMENT)|(COMMIT)|(CREATE\s+CLUSTER)|(CREATE\s+CONTEXT)|(CREATE\s+CONTROLFILE)|(CREATE\s+DATABASE)|(CREATE\s+DATABASE\s+LINK)|(CREATE\s+DIMENSION)|(CREATE\s+DIRECTORY)|(CREATE\s+DISKGROUP)|(CREATE\s+FUNCTION)|(CREATE\s+INDEX)|(CREATE\s+INDEXTYPE)|(CREATE\s+JAVA)|(CREATE\s+LIBRARY)|(CREATE\s+MATERIALIZED\s+VIEW)|(CREATE\s+MATERIALIZED\s+VIEW\s+LOG)|(CREATE\s+OPERATOR)|(CREATE\s+OUTLINE)|(CREATE\s+PACKAGE)|(CREATE\s+PACKAGE\s+BODY)|(CREATE\s+PFILE)|(CREATE\s+PROCEDURE)|(CREATE\s+PROFILE)|(CREATE\s+RESTORE\s+POINT)|(CREATE\s+ROLE)|(CREATE\s+ROLLBACK\s+SEGMENT)|(CREATE\s+SCHEMA)|(CREATE\s+SEQUENCE)|(CREATE\s+SPFILE)|(CREATE\s+SYNONYM)|(CREATE\s+TABLE)|(CREATE\s+TABLESPACE)|(CREATE\s+TRIGGER)|(CREATE\s+TYPE)|(CREATE\s+TYPE\s+BODY)|(CREATE\s+USER)|(CREATE\s+VIEW)|(DELETE)|(DISASSOCIATE\s+STATISTICS)|(DROP\s+CLUSTER)|(DROP\s+CONTEXT)|(DROP\s+DATABASE)|(DROP\s+DATABASE\s+LINK)|(DROP\s+DIMENSION)|(DROP\s+DIRECTORY)|(DROP\s+DISKGROUP)|(DROP\s+FUNCTION)|(DROP\s+INDEX)|(DROP\s+INDEXTYPE)|(DROP\s+JAVA)|(DROP\s+LIBRARY)|(DROP\s+MATERIALIZED\s+VIEW)|(DROP\s+MATERIALIZED\s+VIEW\s+LOG)|(DROP\s+OPERATOR)|(DROP\s+OUTLINE)|(DROP\s+PACKAGE)|(DROP\s+PROCEDURE)|(DROP\s+PROFILE)|(DROP\s+RESTORE\s+POINT)|(DROP\s+ROLE)|(DROP\s+ROLLBACK\s+SEGMENT)|(DROP\s+SEQUENCE)|(DROP\s+SYNONYM)|(DROP\s+TABLE)|(DROP\s+TABLESPACE)|(DROP\s+TRIGGER)|(DROP\s+TYPE)|(DROP\s+TYPE\s+BODY)|(DROP\s+USER)|(DROP\s+VIEW)|(EXPLAIN\s+PLAN)|(FLASHBACK\s+DATABASE)|(FLASHBACK\s+TABLE)|(GRANT)|(INSERT)|(LOCK\s+TABLE)|(MERGE)|(NOAUDIT)|(PURGE)|(RENAME)|(REVOKE)|(ROLLBACK)|(SAVEPOINT)|(SELECT)|(SET\s+CONSTRAINTS?)|(SET\s+ROLE)|(SET\s+TRANSACTION)|(TRUNCATE)|(UPDATE)|(abs)|(acos)|(add_months)|(appendchildxml)|(asciistr)|(ascii)|(asin)|(atan)|(atan2)|(avg)|(bfilename)|(bin_to_num)|(bitand)|(cardinality)|(cast)|(ceil)|(chartorowid)|(chr)|(cluster_id)|(cluster_probability)|(cluster_set)|(coalesce)|(collect)|(compose)|(concat)|(convert)|(corr)|(corr_s)|(corr_k)|(cos)|(cosh)|(count)|(covar_pop)|(covar_samp)|(cume_dist)|(current_date)|(current_timestamp)|(cv)|(dbtimezone)|(decode)|(decompose)|(deletexml)|(dense_rank)|(depth)|(deref)|(dump)|(empty_[bc]lob)|(existsnode)|(exp)|(extract)|(extractvalue)|(feature_id)|(feature_set)|(feature_value)|(first)|(first_value)|(floor)|(from_tz)|(greatest)|(group_id)|(grouping)|(grouping_id)|(hextoraw)|(initcap)|(insertchildxml)|(insertxmlbefore)|(instr)|(iteration_number)|(lag)|(last)|(last_day)|(last_value)|(lead)|(least)|(length)|(ln)|(lnnvl)|(localtimestamp)|(log)|(lower)|(lpad)|(ltrim)|(make_ref)|(max)|(median)|(min)|(mod)|(months_between)|(nanvl)|(nchr)|(new_time)|(next_day)|(nls_charset_decl_len)|(nls_charset_id)|(nls_charset_name)|(nls_initcap)|(nls_lower)|(nlssort)|(nls_upper)|(ntile)|(nullif)|(numtodsinterval)|(numtoyminterval)|(nvl)|(nvl2)|(ora_hash)|(path)|(percent_rank)|(percentile_cont)|(percentile_disc)|(power)|(powermultiset)|(powermultiset_by_cardinality)|(prediction)|(prediction_cost)|(prediction_details)|(prediction_probability)|(prediction_set)|(presentnnv)|(presentv)|(previous)|(rank)|(ratio_to_report)|(rawtohex)|(rawtonhex)|(ref)|(reftohex)|(regexp_instr)|(regexp_replace)|(regexp_substr)|(regr_(?:slope|intercept|count|r2|avgx|avgy|sxx|syy|sxy))|(remainder)|(replace)|(round)|(row_number)|(rowidtochar)|(rowidtonchar)|(rpad)|(rtrim)|(scn_to_timestamp)|(sessiontimezone)|(set)|(sign)|(sin)|(sinh)|(soundex)|(sqrt)|(stats_binomial_test)|(stats_crosstab)|(stats_f_test)|(stats_ks_test)|(stats_mode)|(stats_mw_test)|(stats_one_way_anova)|(stats_t_test_one)|(stats_t_test_paired)|(stats_t_test_indepu?)|(stats_wsr_test)|(stddev)|(stddev_pop)|(stddev_samp)|(substr)|(sum)|(sys_connect_by_path)|(sys_context)|(sys_dburigen)|(sys_extract_utc)|(sys_guid)|(sys_typeid)|(sys_xmlagg)|(sys_xmlgen)|(sysdate)|(systimestamp)|(tan)|(tanh)|(timestamp_to_scn)|(to_binary_double)|(to_binary_float)|(to_char)|(to_clob)|(to_date)|(to_dsinterval)|(to_lob)|(to_multi_byte)|(to_nchar)|(to_nclob)|(to_number)|(to_single_byte)|(to_timestamp)|(to_timestamp_tz)|(to_yminterval)|(translate)|(treat)|(trim)|(trunc)|(tz_offset)|(uid)|(unistr)|(updatexml)|(upper)|(user)|(userenv)|(value)|(var_pop)|(var_samp)|(variance)|(vsize)|(width_bucket)|(xmlagg)|(xmlcdata)|(xmlcolattval)|(xmlcomment)|(xmlconcat)|(xmlelement)|(xmlforest)|(xmlparse)|(xmlpi)|(xmlquery)|(xmlroot)|(xmlsequence)|(xmlserialize)|(xmltable)|(xmltransform))(\b)/gi, // collisions: IDENTITY, extract, round, to_char, to_nchar, translate, trunc
  cnf: /((?:^|\n)\s*(?:&lt;)?)(MaxRequestsPerThread|(AcceptFilter|AcceptPathInfo|AccessFileName|AddDefaultCharset|AddOutputFilterByType|AllowEncodedSlashes|AllowOverride|AuthName|AuthType|CGIMapExtension|ContentDigest|DefaultType|Directory|DirectoryMatch|DocumentRoot|EnableMMAP|EnableSendfile|ErrorDocument|ErrorLog|FileETag|Files|FilesMatch|ForceType|HostnameLookups|IfDefine|IfModule|Include|KeepAlive|KeepAliveTimeout|Limit|LimitExcept|LimitInternalRecursion|LimitRequestBody|LimitRequestFields|LimitRequestFieldSize|LimitRequestLine|LimitXMLRequestBody|Location|LocationMatch|LogLevel|MaxKeepAliveRequests|NameVirtualHost|Options|Require|RLimitCPU|RLimitMEM|RLimitNPROC|Satisfy|ScriptInterpreterSource|ServerAdmin|ServerAlias|ServerName|ServerPath|ServerRoot|ServerSignature|ServerTokens|SetHandler|SetInputFilter|SetOutputFilter|TimeOut|TraceEnable|UseCanonicalName|UseCanonicalPhysicalPort|VirtualHost)|(Action|Script)|(Alias|AliasMatch|Redirect|RedirectMatch|RedirectPermanent|RedirectTemp|ScriptAlias|ScriptAliasMatch)|(AuthBasicAuthoritative|AuthBasicProvider)|(AuthDigestAlgorithm|AuthDigestDomain|AuthDigestNcCheck|AuthDigestNonceFormat|AuthDigestNonceLifetime|AuthDigestProvider|AuthDigestQop|AuthDigestShmemSize)|(AuthnProviderAlias)|(Anonymous|Anonymous_LogEmail|Anonymous_MustGiveEmail|Anonymous_NoUserID|Anonymous_VerifyEmail)|(AuthDBDUserPWQuery|AuthDBDUserRealmQuery)|(AuthDBMType|AuthDBMUserFile)|(AuthDefaultAuthoritative)|(AuthUserFile)|(AuthLDAPBindDN|AuthLDAPBindPassword|AuthLDAPCharsetConfig|AuthLDAPCompareDNOnServer|AuthLDAPDereferenceAliases|AuthLDAPGroupAttribute|AuthLDAPGroupAttributeIsDN|AuthLDAPRemoteUserAttribute|AuthLDAPRemoteUserIsDN|AuthLDAPUrl|AuthzLDAPAuthoritative)|(AuthDBMGroupFile|AuthzDBMAuthoritative|AuthzDBMType)|(AuthzDefaultAuthoritative)|(AuthGroupFile|AuthzGroupFileAuthoritative)|(Allow|Deny|Order)|(AuthzOwnerAuthoritative)|(AuthzUserAuthoritative)|(AddAlt|AddAltByEncoding|AddAltByType|AddDescription|AddIcon|AddIconByEncoding|AddIconByType|DefaultIcon|HeaderName|IndexHeadInsert|IndexIgnore|IndexOptions|IndexOrderDefault|IndexStyleSheet|ReadmeName)|(CacheDefaultExpire|CacheDisable|CacheEnable|CacheIgnoreCacheControl|CacheIgnoreNoLastMod|CacheIgnoreQueryString|CacheLastModifiedFactor|CacheMaxExpire|CacheStoreNoStore|CacheStorePrivate)|(MetaDir|MetaFiles|MetaSuffix)|(ScriptLog|ScriptLogBuffer|ScriptLogLength)|(ScriptSock)|(Dav|DavDepthInfinity|DavMinTimeout)|(DavLockDB)|(DavGenericLockDB)|(DBDExptime|DBDKeep|DBDMax|DBDMin|DBDParams|DBDPersist|DBDPrepareSQL|DBDriver)|(DeflateBufferSize|DeflateCompressionLevel|DeflateFilterNote|DeflateMemLevel|DeflateWindowSize)|(DirectoryIndex|DirectorySlash)|(CacheDirLength|CacheDirLevels|CacheMaxFileSize|CacheMinFileSize|CacheRoot)|(DumpIOInput|DumpIOLogLevel|DumpIOOutput)|(ProtocolEcho)|(PassEnv|SetEnv|UnsetEnv)|(Example)|(ExpiresActive|ExpiresByType|ExpiresDefault)|(ExtFilterDefine|ExtFilterOptions)|(CacheFile|MMapFile)|(FilterChain|FilterDeclare|FilterProtocol|FilterProvider|FilterTrace)|(CharsetDefault|CharsetOptions|CharsetSourceEnc)|(IdentityCheck|IdentityCheckTimeout)|(ImapBase|ImapDefault|ImapMenu)|(SSIEnableAccess|SSIEndTag|SSIErrorMsg|SSIStartTag|SSITimeFormat|SSIUndefinedEcho|XBitHack)|(AddModuleInfo)|(ISAPIAppendLogToErrors|ISAPIAppendLogToQuery|ISAPICacheFile|ISAPIFakeAsync|ISAPILogNotSupported|ISAPIReadAheadBuffer)|(LDAPCacheEntries|LDAPCacheTTL|LDAPConnectionTimeout|LDAPOpCacheEntries|LDAPOpCacheTTL|LDAPSharedCacheFile|LDAPSharedCacheSize|LDAPTrustedClientCert|LDAPTrustedGlobalCert|LDAPTrustedMode|LDAPVerifyServerCert)|(BufferedLogs|CookieLog|CustomLog|LogFormat|TransferLog)|(ForensicLog)|(MCacheMaxObjectCount|MCacheMaxObjectSize|MCacheMaxStreamingBuffer|MCacheMinObjectSize|MCacheRemovalAlgorithm|MCacheSize)|(AddCharset|AddEncoding|AddHandler|AddInputFilter|AddLanguage|AddOutputFilter|AddType|DefaultLanguage|ModMimeUsePathInfo|MultiviewsMatch|RemoveCharset|RemoveEncoding|RemoveHandler|RemoveInputFilter|RemoveLanguage|RemoveOutputFilter|RemoveType|TypesConfig)|(MimeMagicFile)|(CacheNegotiatedDocs|ForceLanguagePriority|LanguagePriority)|(NWSSLTrustedCerts|NWSSLUpgradeable|SecureListen)|(AllowCONNECT|BalancerMember|NoProxy|Proxy|ProxyBadHeader|ProxyBlock|ProxyDomain|ProxyErrorOverride|ProxyFtpDirCharset|ProxyIOBufferSize|ProxyMatch|ProxyMaxForwards|ProxyPass|ProxyPassInterpolateEnv|ProxyPassMatch|ProxyPassReverse|ProxyPassReverseCookieDomain|ProxyPassReverseCookiePath|ProxyPreserveHost|ProxyReceiveBufferSize|ProxyRemote|ProxyRemoteMatch|ProxyRequests|ProxySet|ProxyStatus|ProxyTimeout|ProxyVia)|(RewriteBase|RewriteCond|RewriteEngine|RewriteLock|RewriteLog|RewriteLogLevel|RewriteMap|RewriteOptions|RewriteRule)|(BrowserMatch|BrowserMatchNoCase|SetEnvIf|SetEnvIfNoCase)|(LoadFile|LoadModule)|(CheckCaseOnly|CheckSpelling)|(SSLCACertificateFile|SSLCACertificatePath|SSLCADNRequestFile|SSLCADNRequestPath|SSLCARevocationFile|SSLCARevocationPath|SSLCertificateChainFile|SSLCertificateFile|SSLCertificateKeyFile|SSLCipherSuite|SSLCryptoDevice|SSLEngine|SSLHonorCipherOrder|SSLMutex|SSLOptions|SSLPassPhraseDialog|SSLProtocol|SSLProxyCACertificateFile|SSLProxyCACertificatePath|SSLProxyCARevocationFile|SSLProxyCARevocationPath|SSLProxyCipherSuite|SSLProxyEngine|SSLProxyMachineCertificateFile|SSLProxyMachineCertificatePath|SSLProxyProtocol|SSLProxyVerify|SSLProxyVerifyDepth|SSLRandomSeed|SSLRequire|SSLRequireSSL|SSLSessionCache|SSLSessionCacheTimeout|SSLUserName|SSLVerifyClient|SSLVerifyDepth)|(ExtendedStatus|SeeRequestTail)|(Substitute)|(SuexecUserGroup)|(UserDir)|(CookieDomain|CookieExpires|CookieName|CookieStyle|CookieTracking)|(IfVersion)|(VirtualDocumentRoot|VirtualDocumentRootIP|VirtualScriptAlias|VirtualScriptAliasIP)|(AcceptMutex|ChrootDir|CoreDumpDirectory|EnableExceptionHook|GracefulShutdownTimeout|Group|Listen|ListenBackLog|LockFile|MaxClients|MaxMemFree|MaxRequestsPerChild|MaxSpareThreads|MinSpareThreads|PidFile|ReceiveBufferSize|ScoreBoardFile|SendBufferSize|ServerLimit|StartServers|StartThreads|ThreadLimit|ThreadsPerChild|ThreadStackSize|User)|(MaxThreads)|(Win32DisableAcceptEx)|(MaxSpareServers|MinSpareServers))(\b)/gi,
  js: /(\b)(String\.fromCharCode|Date\.(?:parse|UTC)|Math\.(?:E|LN2|LN10|LOG2E|LOG10E|PI|SQRT1_2|SQRT2|abs|acos|asin|atan|atan2|ceil|cos|exp|floor|log|max|min|pow|random|round|sin|sqrt|tan)|Array|Boolean|Date|Error|Function|JavaArray|JavaClass|JavaObject|JavaPackage|Math|Number|Object|Packages|RegExp|String|Infinity|JSON|NaN|undefined|Error|EvalError|RangeError|ReferenceError|SyntaxError|TypeError|URIError|decodeURI|decodeURIComponent|encodeURI|encodeURIComponent|eval|isFinite|isNaN|parseFloat|parseInt|(break|continue|for|function|return|switch|throw|var|while|with)|(do)|(if|else)|(try|catch|finally)|(delete|in|instanceof|new|this|typeof|void)|(alinkColor|anchors|applets|bgColor|body|characterSet|compatMode|contentType|cookie|defaultView|designMode|doctype|documentElement|domain|embeds|fgColor|forms|height|images|implementation|lastModified|linkColor|links|plugins|popupNode|referrer|styleSheets|title|tooltipNode|URL|vlinkColor|width|clear|createAttribute|createDocumentFragment|createElement|createElementNS|createEvent|createNSResolver|createRange|createTextNode|createTreeWalker|evaluate|execCommand|getElementById|getElementsByName|importNode|loadOverlay|queryCommandEnabled|queryCommandIndeterm|queryCommandState|queryCommandValue|write|writeln)|(attributes|childNodes|className|clientHeight|clientLeft|clientTop|clientWidth|dir|firstChild|id|innerHTML|lang|lastChild|length|localName|name|namespaceURI|nextSibling|nodeName|nodeType|nodeValue|offsetHeight|offsetLeft|offsetParent|offsetTop|offsetWidth|ownerDocument|parentNode|prefix|previousSibling|scrollHeight|scrollLeft|scrollTop|scrollWidth|style|tabIndex|tagName|textContent|addEventListener|appendChild|blur|click|cloneNode|dispatchEvent|focus|getAttribute|getAttributeNS|getAttributeNode|getAttributeNodeNS|getElementsByTagName|getElementsByTagNameNS|hasAttribute|hasAttributeNS|hasAttributes|hasChildNodes|insertBefore|item|normalize|removeAttribute|removeAttributeNS|removeAttributeNode|removeChild|removeEventListener|replaceChild|scrollIntoView|setAttribute|setAttributeNS|setAttributeNode|setAttributeNodeNS|supports|onblur|onchange|onclick|ondblclick|onfocus|onkeydown|onkeypress|onkeyup|onmousedown|onmousemove|onmouseout|onmouseover|onmouseup|onresize)|(altKey|bubbles|button|cancelBubble|cancelable|clientX|clientY|ctrlKey|currentTarget|detail|eventPhase|explicitOriginalTarget|isChar|layerX|layerY|metaKey|originalTarget|pageX|pageY|relatedTarget|screenX|screenY|shiftKey|target|timeStamp|type|view|which|initEvent|initKeyEvent|initMouseEvent|initUIEvent|stopPropagation|preventDefault)|(elements|length|name|acceptCharset|action|enctype|encoding|method|submit|reset)|(caption|tHead|tFoot|rows|tBodies|align|bgColor|border|cellPadding|cellSpacing|frame|rules|summary|width|createTHead|deleteTHead|createTFoot|deleteTFoot|createCaption|deleteCaption|insertRow|deleteRow)|(content|closed|controllers|crypto|defaultStatus|directories|document|frameElement|frames|history|innerHeight|innerWidth|length|location|locationbar|menubar|name|navigator|opener|outerHeight|outerWidth|pageXOffset|pageYOffset|parent|personalbar|pkcs11|screen|availTop|availLeft|availHeight|availWidth|colorDepth|height|left|pixelDepth|top|width|scrollbars|scrollMaxX|scrollMaxY|scrollX|scrollY|self|sidebar|status|statusbar|toolbar|window|alert|atob|back|btoa|captureEvents|clearInterval|clearTimeout|close|confirm|dump|escape|find|forward|getAttention|getComputedStyle|getSelection|home|moveBy|moveTo|open|openDialog|print|prompt|releaseEvents|resizeBy|resizeTo|scroll|scrollBy|scrollByLines|scrollByPages|scrollTo|setInterval|setTimeout|sizeToContent|stop|unescape|updateCommands|onabort|onclose|ondragdrop|onerror|onload|onpaint|onreset|onscroll|onselect|onsubmit|onunload)|(XMLHttpRequest))\b|\b(pop|push|reverse|shift|sort|splice|unshift|concat|join|slice|(getDate|getDay|getFullYear|getHours|getMilliseconds|getMinutes|getMonth|getSeconds|getTime|getTimezoneOffset|getUTCDate|getUTCDay|getUTCFullYear|getUTCHours|getUTCMilliseconds|getUTCMinutes|getUTCMonth|getUTCSeconds|setDate|setFullYear|setHours|setMilliseconds|setMinutes|setMonth|setSeconds|setTime|setUTCDate|setUTCFullYear|setUTCHours|setUTCMilliseconds|setUTCMinutes|setUTCMonth|setUTCSeconds|toDateString|toLocaleDateString|toLocaleTimeString|toTimeString|toUTCString)|(apply|call)|(toExponential|toFixed|toPrecision)|(exec|test)|(charAt|charCodeAt|concat|indexOf|lastIndexOf|localeCompare|match|replace|search|slice|split|substr|substring|toLocaleLowerCase|toLocaleUpperCase|toLowerCase|toUpperCase))(\s*\(|$)/g // collisions: bgColor, height, width, length, name
};
