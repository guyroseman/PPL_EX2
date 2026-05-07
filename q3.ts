import { Exp, Program, isProgram, isNumExp, isBoolExp, isStrExp, 
         isVarRef, isDefineExp, isIfExp, isProcExp, isAppExp, 
         isPrimOp, PrimOp } from './L3/L3-ast';
import { Result, makeFailure, makeOk, bind, mapResult } from './shared/result';

/*
Purpose: Transform L2 AST to Python program string
Signature: l2ToPython(l2AST)
Type: [Exp | Program] => Result<string>
*/

const primOpToPython = (op: string): string =>
    op === "="        ? "==" :
    op === "eq?"      ? "==" :
    op === "and"      ? "and" :
    op === "or"       ? "or" :
    op === "number?"  ? "(lambda x : (type(x) == int or type(x) == float))" :
    op === "boolean?" ? "(lambda x : (type(x) == bool))" :
    op;

export const l2ToPython = (exp: Exp | Program): Result<string> =>
    isProgram(exp) ?
        bind(mapResult(l2ToPython, exp.exps), (exps: string[]) =>
            makeOk(exps.join("\n"))) :
    isNumExp(exp) ?
        makeOk(exp.val.toString()) :
    isBoolExp(exp) ?
        makeOk(exp.val ? "True" : "False") :
    isStrExp(exp) ?
        makeOk(`"${exp.val}"`) :
    isVarRef(exp) ?
        makeOk(exp.var) :
    isPrimOp(exp) ?
        makeOk(primOpToPython(exp.op)) :
    isDefineExp(exp) ?
        bind(l2ToPython(exp.val), (val: string) =>
            makeOk(`${exp.var.var} = ${val}`)) :
    isIfExp(exp) ?
        bind(l2ToPython(exp.test), (test: string) =>
        bind(l2ToPython(exp.then), (then: string) =>
        bind(l2ToPython(exp.alt),  (alt: string)  =>
            makeOk(`(${then} if ${test} else ${alt})`)))) :
    isProcExp(exp) ?
        bind(l2ToPython(exp.body[0]), (body: string) =>
            makeOk(`(lambda ${exp.args.map(a => a.var).join(",")} : ${body})`)) :
    isAppExp(exp) ?
        isPrimOp(exp.rator) ?
            bind(mapResult(l2ToPython, exp.rands), (rands: string[]) => {
                const op = (exp.rator as PrimOp).op;
                return op === "not" ?
                    makeOk(`(not ${rands[0]})`) :
                    makeOk(`(${rands.join(` ${primOpToPython(op)} `)})`);
            }) :
            bind(l2ToPython(exp.rator), (rator: string) =>
            bind(mapResult(l2ToPython, exp.rands), (rands: string[]) =>
                makeOk(`${rator}(${rands.join(",")})`))) :
    makeFailure(`Unknown expression: ${exp}`);