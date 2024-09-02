#include <stdio.h>
#include <stdlib.h>

/**
 * expression ::= term | expreesion + term | expreesion - term
 * term ::= factor | term * factor | term \/ factor
 * factor ::= NUMBER | ( expression )
 */

typedef enum
{
	TK_NONE = -1,
	TK_NUM,
	TK_ADD,
	TK_MINUS,
	TK_MULTIPLY,
	TK_DIVISION,
	TK_LEFT_BRACE,
	TK_RIGHT_BRACE,
} TokenType;

typedef struct
{
	char *source;
	TokenType tk_type;
	int num;
} Ctx;

int parse_expression(Ctx *ctx);
int parse_term(Ctx *ctx);
int parse_factor(Ctx *ctx);
int lex(Ctx *ctx);

int parse_expression(Ctx *ctx)
{
	int v1, v2, op;
	v1 = parse_term(ctx);
	for (;;)
	{
		if (lex(ctx) == -1)
		{
			break;
		}

		op = ctx->tk_type;
		if (op != TK_ADD && op != TK_MINUS)
		{
			ctx->source--;
			break;
		}
		v2 = parse_term(ctx);
		if (op == TK_ADD)
			v1 += v2;
		else
			v1 -= v2;
	}
	return v1;
}

int parse_term(Ctx *ctx)
{
	int v1, v2, op;
	v1 = parse_factor(ctx);
	for (;;)
	{
		if (lex(ctx) == -1)
		{
			break;
		}
		op = ctx->tk_type;
		if (op != TK_MULTIPLY && op != TK_DIVISION)
		{
			ctx->source--;
			break;
		}
		v2 = parse_factor(ctx);
		if (op == TK_MULTIPLY)
			v1 *= v2;
		else
			v1 /= v2;
	}
	return v1;
}

int parse_factor(Ctx *ctx)
{
	int result;
	if (lex(ctx) == -1)
	{
		printf("parse_factor lex() return -1\n");
		exit(-1);
	}
	if (ctx->tk_type == TK_NUM)
		return ctx->num;

	if (ctx->tk_type == TK_LEFT_BRACE)
	{
		result = parse_expression(ctx);
		if (ctx->tk_type == TK_RIGHT_BRACE)
		{
			ctx->source++;
			return result;
		}
		else
		{
			printf("没有)\n");
			exit(-1);
		}
	}
	return 0;
}

#define isSpace(c) (c == ' ')
#define isDigit(c) (c - '0' >= 0 && c - '0' <= 9)

int lex(Ctx *ctx)
{
	int result = 0;
	ctx->tk_type = TK_NONE;
	while (isSpace(*ctx->source))
		ctx->source++;
	if (isDigit(*ctx->source))
	{
		while (isDigit(*ctx->source))
		{
			result = result * 10 + (*ctx->source - '0');
			ctx->source++;
		}
		ctx->tk_type = TK_NUM;
		ctx->num = result;
		return 0;
	}
	else if (*ctx->source == '(')
		ctx->tk_type = TK_LEFT_BRACE;
	else if (*ctx->source == ')')
		ctx->tk_type = TK_RIGHT_BRACE;
	else if (*ctx->source == '+')
		ctx->tk_type = TK_ADD;
	else if (*ctx->source == '-')
		ctx->tk_type = TK_MINUS;
	else if (*ctx->source == '*')
		ctx->tk_type = TK_MULTIPLY;
	else if (*ctx->source == '/')
		ctx->tk_type = TK_DIVISION;
	else
		return -1;
	ctx->source++;
	return 0;
}

int main(int argc, char *argv[])
{
	char *source = argv[1];
	// char *source = "1+2*3";
	Ctx ctx;
	ctx.source = source;
	int result = parse_expression(&ctx);
	printf("The result of \"%s\" is: %d\n", source, result);
	return 0;
}
