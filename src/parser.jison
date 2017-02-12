/* description: Barbiche parser. */

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
"++"                  return '++';
"--"                  return '--';
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
":"                   return ':'
{StringLiteral}       yytext = yytext.substr(1, yyleng - 2); return 'STRING'
{Identifier}          return 'VAR'
<<EOF>>               return 'EOF'
.                     return 'INVALID'

/lex

/* operator associations and precedence */

%left ','
%left ':'
%left '||'
%left '&&'
%left '==' '!=' '<=' '>=' '<' '>'
%left '+'
%left '*' '/'
%left UMINUS

%start Main

%% /* language grammar */

Main
    : Expression EOF
        {return $1;}
    | Array EOF
        {return $1;}
    ;

Expression
    : SimpleExpression
        {return $1;}
    | SimpleExpression Order
        {$$ = (function(a, b) {
            var ret = [a()];
            ret.order = b;
            return ret;
        }).bind(null, $1, $2);}
    ;

ArrayItemList
    : SimpleExpression
        {$$ = singleton.bind(null, $1);}
    | ArrayItemList ',' SimpleExpression
        {$$ = push.bind(null, $1, $3);}
    ;

Order
    : '--'
        {$$ = 'after';}
    | '++'
        {$$ = 'before';}
    ;

Array
    : '[' ArrayItemList ']'
        {$$ = $2;}
    | '[' ArrayItemList ']' Order
        {$$ = (function(a, b) {
            var ret = a();
            ret.order = b;
            return ret;
        }).bind(null, $2, $4);}
    ;

SimpleExpression
    : SimpleExpression ':' SimpleExpression
        {$$ = (function(a, b) {
            return new yy.bbObj(a(), b());
         }).bind(null, $1, $3);}
    | SimpleExpression '||' SimpleExpression
        {$$ = (function(a, b) {
            return a() || b();
        }).bind(null, $1, $3);}
    | SimpleExpression '&&' SimpleExpression
        {$$ = (function(a, b) {
            return a() && b();
        }).bind(null, $1, $3);}
    | SimpleExpression '==' SimpleExpression
        {$$ = (function(a, b) {
            return a() == b();
        }).bind(null, $1, $3);}
    | SimpleExpression '!=' SimpleExpression
        {$$ = (function(a, b) {
            return a() != b();
        }).bind(null, $1, $3);}
    | SimpleExpression '<=' SimpleExpression
        {$$ = (function(a, b) {
            return a() <= b();
        }).bind(null, $1, $3);}
    | SimpleExpression '>=' SimpleExpression
        {$$ = (function(a, b) {
            return a() >= b();
        }).bind(null, $1, $3);}
    | SimpleExpression '<' SimpleExpression
        {$$ = (function(a, b) {
            return a() < b();
        }).bind(null, $1, $3);}
    | SimpleExpression '>' SimpleExpression
        {$$ = (function(a, b) {
            return a() > b();
        }).bind(null, $1, $3);}
    | SimpleExpression '+' SimpleExpression
        {$$ = (function(a, b) {
            return a() + b();
        }).bind(null, $1, $3);}
    | '!' SimpleExpression %prec UMINUS
        {$$ = (function(a) {
            return !(a());
        }).bind(null, $2);}
    | '(' SimpleExpression ')'
        {$$ = $2;}
    | NUMBER
        {$$ = Number.bind(null, yytext);}
    | STRING
        {$$ = function() {return quoteUnescape(String(yytext));}}
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
    : SimpleExpression
        {$$ = singleton.bind(null, $1);}
    | ArgumentList "," SimpleExpression
        {$$ = push.bind(null, $1, $3);}
    ;

CallExpression
    : MemberExpression Arguments
        {$$ = call.bind(null, $1, $2);}
    | CallExpression Arguments
        {$$ = call.bind(null, $1, $2);}
    | CallExpression "[" SimpleExpression "]"
        {$$ = getProperty.bind(null, $1, $3);}
    | CallExpression "." PropertyName
        {$$ = getProperty.bind(null, $1, $3);}
    ;

MemberExpression
    : IdentifierName
        {$$ = $1;}
    | MemberExpression "[" SimpleExpression "]"
        {$$ = getProperty.bind(null, $1, $3);}
    | MemberExpression "." PropertyName
        {$$ = getProperty.bind(null, $1, $3);}
    ;

PropertyName
    : VAR
        {$$ = String.bind(null, yytext);}
    ;

IdentifierName
    : VAR
        {$$ = yy.context.resolve.bind(yy.context, yytext);}
    ;

%%
function quoteUnescape(str) {
    return str.replace(/(\\('|"|\n|\t|\r))/g, function() {return arguments[2];});
}

function singleton(a) {
    return [a()];
}

function push(a, b) {
    var ret = a();
    ret.push(b());
    return ret;
}

function getProperty(a, b) {
    var val = a();
    var ret = val && val[b()];
    if (typeof(ret) == 'function') {
        return ret.bind(val);
    } else return ret;
}

function call(a, b) {
    return (a()).apply(null, b());
}
