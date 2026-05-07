import { Exp, Program, isProgram, isNumExp, isBoolExp, isStrExp, 
         isVarRef, isDefineExp, isIfExp, isProcExp, isAppExp, 
         isPrimOp, PrimOp } from './L3/L3-ast';
import { Result, makeFailure, makeOk, bind, mapResult } from './shared/result';

/*
Purpose: Transform L2 AST to Python program string
Signature: l2ToPython(l2AST)
Type: [Exp | Program] => Result<string>
*/

// Maps L2 primitive operators to their Python equivalents
// handles special cases like = -> == and number?/boolean? -> lambda type checks
const primOpToPython = (op: string): string =>
    op === "="        ? "==" :
    op === "eq?"      ? "==" :
    op === "and"      ? "and" :
    op === "or"       ? "or" :
    op === "number?"  ? "(lambda x : (type(x) == int or type(x) == float))" :
    op === "boolean?" ? "(lambda x : (type(x) == bool))" :
    op;

export const l2ToPython = (exp: Exp | Program): Result<string> =>
    // program: translate each expression and join with newlines
    isProgram(exp) ? 
        bind(mapResult(l2ToPython, exp.exps), (exps: string[]) => 
            makeOk(exps.join("\n"))) :

    // atomic expressions: just convert directly to string
    isNumExp(exp)  ? makeOk(exp.val.toString()) :
    isBoolExp(exp) ? makeOk(exp.val ? "True" : "False") :
    isStrExp(exp)  ? makeOk(`"${exp.val}"`) :
    isVarRef(exp)  ? makeOk(exp.var) :
    isPrimOp(exp)  ? makeOk(primOpToPython(exp.op)) :

    // define: (define x val) -> x = val
    isDefineExp(exp) ? 
        bind(l2ToPython(exp.val), (val: string) => 
            makeOk(`${exp.var.var} = ${val}`)) :

    // if: (if test then else) -> (then if test else alt)
    isIfExp(exp) ?
        bind(l2ToPython(exp.test), (test: string) =>
        bind(l2ToPython(exp.then), (then: string) =>
        bind(l2ToPython(exp.alt),  (alt: string)  =>
            makeOk(`(${then} if ${test} else ${alt})`)))) :

    // lambda: (lambda (x y) body) -> (lambda x, y : body)
    isProcExp(exp) ?
        bind(l2ToPython(exp.body[0]), (body: string) =>
            makeOk(`(lambda ${exp.args.map(a => a.var).join(",")} : ${body})`)) :

    // application: two cases
    isAppExp(exp) ?
        isPrimOp(exp.rator) ?
            // case 1: primitive operator -> infix (x + y) or unary (not x)
            bind(mapResult(l2ToPython, exp.rands), (rands: string[]) => {
                const op = (exp.rator as PrimOp).op;
                return op === "not" ?
                    makeOk(`(not ${rands[0]})`) :
                    makeOk(`(${rands.join(` ${primOpToPython(op)} `)})`);
            }) :
            // case 2: function call -> f(x,y)
            bind(l2ToPython(exp.rator), (rator: string) =>
            bind(mapResult(l2ToPython, exp.rands), (rands: string[]) =>
                makeOk(`${rator}(${rands.join(",")})`))) :

    makeFailure(`Unknown expression: ${exp}`);