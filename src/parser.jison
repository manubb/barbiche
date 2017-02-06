/* description: Parses end executes mathematical expressions. */

/* lexical grammar */
%lex

IdentifierStart [$_a-zA-Z]
IdentifierPart {IdentifierStart}|[0-9]
Identifier {IdentifierStart}{IdentifierPart}*
LineContinuation \\(\r\n|\r|\n)
OctalEscapeSequence (?:[1-7][0-7]{0,2}|[0-7]{2,3})
HexEscapeSequence [x]{HexDigit}{2}
UnicodeEscapeSequence [u]{HexDigit}{4}
SingleEscapeCharacter [\'\"\\bfnrtv]
NonEscapeCharacter [^\'\"\\bfnrtv0-9xu]
CharacterEscapeSequence {SingleEscapeCharacter}|{NonEscapeCharacter}
EscapeSequence {CharacterEscapeSequence}|{OctalEscapeSequence}|{HexEscapeSequence}|{UnicodeEscapeSequence}
DoubleStringCharacter ([^\"\\\n\r]+)|(\\{EscapeSequence})|{LineContinuation}
SingleStringCharacter ([^\'\\\n\r]+)|(\\{EscapeSequence})|{LineContinuation}
StringLiteral (\"{DoubleStringCharacter}*\")|(\'{SingleStringCharacter}*\')

%%

\s+                   /* skip whitespace */
[0-9]+("."[0-9]+)?\b  return 'NUMBER'
"||"                  return '||'
"&&"                  return '&&'
"=="                  return '=='
"!="                  return '!='
"<="                  return '<='
">="                  return '>='
"<"                   return '<'
">"                   return '>'
"+"                   return '+'
"!"                   return '!'
"("                   return '('
")"                   return ')'
"true"                return 'TRUE'
"false"               return 'FALSE'
","                   return ','
"."                   return '.'
"["                   return '['
"]"                   return ']'
";"                   return ';'
":"                   return ':'
{StringLiteral}       yytext = yytext.substr(1, yyleng - 2); return 'STRING'
{Identifier}          return 'VAR'
<<EOF>>               return 'EOF'
.                     return 'INVALID'

/lex

/* operator associations and precedence */

%left ',' ';'
%left '||' '&&'
%left '==' '!=' '<=' '>=' '<' '>'
%left '+'
%left '*' '/'
%left '^'
%left UMINUS

%start expression

%% /* language grammar */

expression
    : Statements EOF
        {return $1;}
    ;

Statements
    : Statement
        {$$ = (function(a) {
                return [a()];
            }).bind(null, $1);}
    | Statements ';' Statement
        {$$ = (function(a, b) {
                var ret = a();
                ret.push(b());
                return ret;
            }).bind(null, $1, $3);}
    ;

Statement
    : e ':' e
        {$$ = (function(a, b) {
            return {val: a(), name: b()};
         }).bind(null, $1, $3);}
    | e
        {$$ = (function(a) {
            return {val: a()};
        }).bind(null, $1);}
    ;

e
    : e '||' e
        {$$ = (function(a, b) {
            return a() || b();
        }).bind(null, $1, $3);}
    | e '&&' e
        {$$ = (function(a, b) {
            return a() && b();
        }).bind(null, $1, $3);}
    | e '==' e
        {$$ = (function(a, b) {
            return a() == b();
        }).bind(null, $1, $3);}
    | e '!=' e
        {$$ = (function(a, b) {
            return a() != b();
        }).bind(null, $1, $3);}
    | e '<=' e
        {$$ = (function(a, b) {
            return a() <= b();
        }).bind(null, $1, $3);}
    | e '>=' e
        {$$ = (function(a, b) {
            return a() >= b();
        }).bind(null, $1, $3);}
    | e '<' e
        {$$ = (function(a, b) {
            return a() < b();
        }).bind(null, $1, $3);}
    | e '>' e
        {$$ = (function(a, b) {
            return a() > b();
        }).bind(null, $1, $3);}
    | e '+' e
        {$$ = (function(a, b) {
            return a() + b();
        }).bind(null, $1, $3);}
    | '!' e %prec UMINUS
        {$$ = (function(a) {
            return !(a());
        }).bind(null, $2);}
    | '(' e ')'
        {$$ = $2;}
    | NUMBER
        {$$ = Number.bind(null, yytext);}
    | STRING
        {$$ = String.bind(null, yytext);}
    | TRUE
        {$$ = function() {return true;}}
    | FALSE
        {$$ = function() {return false;}}
    | CallExpression
        {$$ = $1;}
    | MemberExpression
        {$$ = $1;}
    ;

Arguments
    : "(" ")"
        {$$ = function() {
            return [];
        }}
    | "(" ArgumentList ")"
        {$$ = $2;}
    ;

ArgumentList
    : e
        {
            $$ = (function(a) {
                return [a()];
            }).bind(null, $1);
        }
    | ArgumentList "," e
        {   $$ = (function(a, b) {
                var ret = a();
                ret.push(b());
                return ret;
            }).bind(null, $1, $3);
        }
    ;


CallExpression
    : MemberExpression Arguments
        {
            $$ = (function(a, b) {
                return (a()).apply(null, b());
            }).bind(null, $1, $2);
        }
    | CallExpression Arguments
        {
            $$ = (function(a, b) {
                return (a()).apply(null, b());
            }).bind(null, $1, $2);
        }
    | CallExpression "[" e "]"
        {
            $$ = (function(a, b) {
                var val = a();
                var ret = val && val[b()];
                if (typeof(ret) == 'function') {
                    return ret.bind(val);
                } else return ret;
            }).bind(null, $1, $3);
        }
    | CallExpression "." PropertyName
        {
            $$ = (function(a, b) {
                var val = a();
                var ret = val && val[b()];
                if (typeof(ret) == 'function') {
                    return ret.bind(val);
                } else return ret;
            }).bind(null, $1, $3);
        }
    ;
MemberExpression
    : IdentifierName
        {
            $$ = $1;
        }
    | MemberExpression "[" e "]"
        {
            $$ = (function(a, b) {
                var val = a();
                var ret = val && val[b()];
                if (typeof(ret) == 'function') {
                    return ret.bind(val);
                } else return ret;
            }).bind(null, $1, $3);
        }
    | MemberExpression "." PropertyName
        {
            $$ = (function(a, b) {
                var val = a();
                var ret = val && val[b()];
                if (typeof(ret) == 'function') {
                    return ret.bind(val);
                } else return ret;
            }).bind(null, $1, $3);
        }
    ;

PropertyName
    : VAR
        {$$ = String.bind(null, yytext);}
    ;

IdentifierName
    : VAR
        {$$ = yy.context.resolve.bind(yy.context, yytext);}
    ;
