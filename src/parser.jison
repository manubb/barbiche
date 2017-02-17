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
("-")?[0-9]+("."[0-9]+)?\b  return 'NUMBER'
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
%left '==' '!='
%left '<=' '>=' '<' '>'
%left '+'
%right '!'
%left '('
%left '.' '['
%nonassoc GROUP

%start Main

%% /* language grammar */

Main
	: SimpleExpression EOF
		{return $1;}
	| SimpleExpression Order EOF
		{return order.bind(null, $1, $2);}
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
	: '[' ']'
		{$$ = emptyArray;}
	| '[' ArrayItemList ']'
		{$$ = $2;}
	;

SimpleExpression
	: SimpleExpression ':' SimpleExpression
		{$$ = bbObj.bind(yy, $1, $3);}
	| SimpleExpression '||' SimpleExpression
		{$$ = OR.bind(null, $1, $3);}
	| SimpleExpression '&&' SimpleExpression
		{$$ = AND.bind(null, $1, $3);}
	| SimpleExpression '==' SimpleExpression
		{$$ = EQUAL.bind(null, $1, $3);}
	| SimpleExpression '!=' SimpleExpression
		{$$ = NOT_EQ.bind(null, $1, $3);}
	| SimpleExpression '<=' SimpleExpression
		{$$ = LEQ.bind(null, $1, $3);}
	| SimpleExpression '>=' SimpleExpression
		{$$ = GEQ.bind(null, $1, $3);}
	| SimpleExpression '<' SimpleExpression
		{$$ = LESS.bind(null, $1, $3);}
	| SimpleExpression '>' SimpleExpression
		{$$ = GREATER.bind(null, $1, $3);}
	| SimpleExpression '+' SimpleExpression
		{$$ = plus.bind(null, $1, $3);}
	| '!' SimpleExpression
		{$$ = NOT.bind(null, $2);}
	| '(' SimpleExpression ')' %prec GROUP
		{$$ = $2;}
	| NUMBER
		{$$ = Number.bind(null, yytext);}
	| STRING
		{$$ = quoteUnescape.bind(null, yytext);}
	| TRUE
		{$$ = TRUE;}
	| FALSE
		{$$ = FALSE;}
	| SimpleExpression Arguments
		{$$ = call.bind(null, $1, $2);}
	| SimpleExpression "[" SimpleExpression "]"
		{$$ = getProperty.bind(null, $1, $3);}
	| SimpleExpression"." PropertyName
		{$$ = getProperty.bind(null, $1, $3);}
	| Array
		{$$ = $1;}
	| VAR
		{$$ = yy.context.resolve.bind(yy.context, yytext);}
	;

Arguments
	: "(" ")"
		{$$ = emptyArray;}
	| "(" ArgumentList ")"
		{$$ = $2;}
	;

ArgumentList
	: SimpleExpression
		{$$ = singleton.bind(null, $1);}
	| ArgumentList "," SimpleExpression
		{$$ = push.bind(null, $1, $3);}
	;

PropertyName
	: VAR
		{$$ = String.bind(null, yytext);}
	;

%%
function quoteUnescape(str) {
	return str.replace(/(\\('|"|\n|\t|\r))/g, function() {return arguments[2];});
}

function OR(a, b) {
	return a() || b();
}

function AND(a, b) {
	return a() && b();
}

function EQUAL(a, b) {
	return a() == b();
}

function NOT_EQ(a, b) {
	return a() != b();
}

function LEQ(a, b) {
	return a() <= b();
}

function LESS(a, b) {
	return a() < b();
}

function GEQ(a, b) {
	return a() >= b();
}

function GREATER(a, b) {
	return a() > b();
}

function NOT(a) {
	return !(a());
}

function emptyArray() {return [];}

function singleton(a) {return [a()];}

function push(a, b) {
	var ret = a();
	ret.push(b());
	return ret;
}

function getProperty(a, b) {
	var val = a();
	if (val == null) return;
	else {
		var ret = val[b()];
		if (typeof(ret) == 'function') {
			return ret.bind(val);
		} else return ret;
	}
}

function call(a, b) {
	return (a()).apply(null, b());
}

function bbObj(a, b) {
	return new this.bbObj(a(), b());
}

function plus(a, b) {
	return a() + b();
}

function order(a, b) {
	var ret = a();
	ret._order = b;
	return ret;
}

function TRUE() {return true;}
function FALSE() {return false;}
