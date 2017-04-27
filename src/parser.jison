/* Barbiche parser */

/* Lexical grammar */
%lex

HexDigit [0-9a-fA-F]
IdentifierStart [$_a-zA-Z]|(\\{EscapeSequence})
IdentifierPart {IdentifierStart}|[0-9]
Identifier {IdentifierStart}{IdentifierPart}*
HexEscapeSequence [x]{HexDigit}{2}
UnicodeEscapeSequence [u]{HexDigit}{4}
SingleEscapeCharacter [\'\"\\bfnrtv]
NonEscapeCharacter [^\'\"\\bfnrtv0-9xu]
CharacterEscapeSequence {SingleEscapeCharacter}|{NonEscapeCharacter}
EscapeSequence {CharacterEscapeSequence}|{HexEscapeSequence}|{UnicodeEscapeSequence}
DoubleStringCharacter ([^\"\\\n\r]+)|(\\{EscapeSequence})
SingleStringCharacter ([^\'\\\n\r]+)|(\\{EscapeSequence})
BackTickStringCharacter ([^`\\\n\r]+)|(\\{EscapeSequence})
StringLiteral (\"{DoubleStringCharacter}*\")|(\'{SingleStringCharacter}*\')
BackTickIdentifier (`{BackTickStringCharacter}*`)
%%

\s+                         /* skip whitespace */
("-")?[0-9]+("."[0-9]+)?\b  return 'NUMBER'
"||"                        return '||'
"&&"                        return '&&'
"==="                       return '==='
"!=="                       return '!=='
"=="                        return '=='
"!="                        return '!='
"<="                        return '<='
">="                        return '>='
"<"                         return '<'
">"                         return '>'
"++"                        return '++';
"--"                        return '--';
"+"                         return '+'
"!"                         return '!'
"("                         return '('
")"                         return ')'
"true"                      return 'TRUE'
"false"                     return 'FALSE'
"undefined"                 return 'UNDEFINED'
"null"                      return 'NULL'
","                         return ','
"."                         return '.'
"["                         return '['
"]"                         return ']'
":"                         return ':'
{StringLiteral}             yytext = stringUnescape(yytext.substr(1, yyleng - 2)); return 'STRING'
{BackTickIdentifier}        yytext = stringUnescape(yytext.substr(1, yyleng - 2)); return 'IDENTIFIER'
{Identifier}                yytext = stringUnescape(yytext); return 'IDENTIFIER'
<<EOF>>                     return 'EOF'
.                           return 'INVALID'

/lex

/* Operator associations and precedences */

%left ','
%left ':'
%left '||'
%left '&&'
%left '==' '!=' '===' '!=='
%left '<=' '>=' '<' '>'
%left '+'
%right '!'
%left '('
%left '.' '['
%nonassoc GROUP

%start Main

%% /* Language grammar */

Main
	: SimpleExpression EOF
		{return $1;}
	| SimpleExpression Order EOF
		{return ORDER.bind(null, $1, $2);}
	;

List
	: SimpleExpression
		{$$ = SINGLETON.bind(null, $1);}
	| List ',' SimpleExpression
		{$$ = PUSH.bind(null, $1, $3);}
	;

Order
	: '--'
		{$$ = 'after';}
	| '++'
		{$$ = 'before';}
	;

Array
	: '[' ']'
		{$$ = EMPTY_ARRAY;}
	| '[' List ']'
		{$$ = $2;}
	;

SimpleExpression
	: SimpleExpression ':' SimpleExpression
		{$$ = BB_OBJ.bind(yy, $1, $3);}
	| SimpleExpression '||' SimpleExpression
		{$$ = OR.bind(null, $1, $3);}
	| SimpleExpression '&&' SimpleExpression
		{$$ = AND.bind(null, $1, $3);}
	| SimpleExpression '==' SimpleExpression
		{$$ = EQUAL.bind(null, $1, $3);}
	| SimpleExpression '!=' SimpleExpression
		{$$ = NOT_EQ.bind(null, $1, $3);}
	| SimpleExpression '===' SimpleExpression
		{$$ = STRICT_EQUAL.bind(null, $1, $3);}
	| SimpleExpression '!==' SimpleExpression
		{$$ = STRICT_NOT_EQ.bind(null, $1, $3);}
	| SimpleExpression '<=' SimpleExpression
		{$$ = LEQ.bind(null, $1, $3);}
	| SimpleExpression '>=' SimpleExpression
		{$$ = GEQ.bind(null, $1, $3);}
	| SimpleExpression '<' SimpleExpression
		{$$ = LESS.bind(null, $1, $3);}
	| SimpleExpression '>' SimpleExpression
		{$$ = GREATER.bind(null, $1, $3);}
	| SimpleExpression '+' SimpleExpression
		{$$ = PLUS.bind(null, $1, $3);}
	| '!' SimpleExpression
		{$$ = NOT.bind(null, $2);}
	| '(' SimpleExpression ')' %prec GROUP
		{$$ = $2;}
	| SimpleExpression Arguments
		{$$ = CALL.bind(null, $1, $2);}
	| SimpleExpression "[" SimpleExpression "]"
		{$$ = GET_PROPERTY.bind(null, $1, $3);}
	| SimpleExpression"." PropertyName
		{$$ = GET_PROPERTY.bind(null, $1, $3);}
	| Array
		{$$ = $1;}
	| NUMBER
		{var number = Number(yytext); $$ = function() {return number;};}
	| STRING
		{$$ = function() {return yytext;};}
	| IDENTIFIER
		{$$ = yy.context.resolve.bind(yy.context, yytext);}
	| TRUE
		{$$ = TRUE;}
	| FALSE
		{$$ = FALSE;}
	| UNDEFINED
		{$$ = UNDEFINED;}
	| NULL
		{$$ = NULL;}
	;

Arguments
	: "(" ")"
		{$$ = EMPTY_ARRAY;}
	| "(" List ")"
		{$$ = $2;}
	;

PropertyName
	: IDENTIFIER
		{$$ = function() {return yytext;};}
	;

%% /* Helpers */
var table = {
	"n": "\n",
	"'": "'",
	"\"": "\"",
	"t": "\t",
	"r": "\r",
	"\\": "\\",
	"`": "`",
	"b": "\b"
};
var stringUnescapeRegExp = /\\(?:(\\|'|"|r|n|t|b|`)|u(.{4})|x(.{2}))/g;
function charCodeToChar(str) {
	return String.fromCharCode(parseInt(str, 16));
}
function stringUnescapeReplace() {
	if (arguments[1]) return table[arguments[1]];
	else return charCodeToChar(arguments[2] || arguments[3]);
}
function stringUnescape(str) {
	return str.replace(stringUnescapeRegExp, stringUnescapeReplace);
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

function STRICT_EQUAL(a, b) {
	return a() === b();
}

function STRICT_NOT_EQ(a, b) {
	return a() !== b();
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

function EMPTY_ARRAY() {return [];}

function SINGLETON(a) {return [a()];}

function PUSH(a, b) {
	var ret = a();
	ret.push(b());
	return ret;
}

function GET_PROPERTY(a, b) {
	var val = a();
	if (val != null) {
		var ret = val[b()];
		if (typeof(ret) === 'function') {
			return ret.bind(val);
		} else return ret;
	}
}

function CALL(a, b) {
	var fun = a();
	if (typeof(fun) === 'function') {
		return fun.apply(null, b());
	}
}

function BB_OBJ(a, b) {
	return new this.BBObj(a(), b());
}

function PLUS(a, b) {
	return a() + b();
}

function ORDER(a, b) {
	var ret = a();
	ret._order = b;
	return ret;
}

function TRUE() {return true;}
function FALSE() {return false;}
function NULL() {return null;}
function UNDEFINED() {}
