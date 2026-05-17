import { map } from "ramda";
import { ClassExp, ProcExp, Exp, Program, CExp, Binding,
         makeProcExp, makeVarDecl, makeIfExp, makeAppExp, makePrimOp,
         makeVarRef, makeLitExp, makeBinding, makeLetExp, makeDefineExp,
         makeProgram,
         isAppExp, isIfExp, isProcExp, isLetExp, isClassExp, isLitExp,
         isNumExp, isBoolExp, isStrExp, isPrimOp, isVarRef,
         isDefineExp, isProgram, isCExp } from "./L3-ast";
import { makeSymbolSExp } from "./L3-value";
import { Result, makeOk, makeFailure } from "../shared/result";

/*
Purpose: Transform ClassExp to ProcExp
Signature: class2proc(classExp)
Type: ClassExp => ProcExp
*/
export const class2proc = (exp: ClassExp): ProcExp => {
    const methods = map((b: Binding) => makeBinding(b.var.var, rewriteCExp(b.val)), exp.methods);
    const buildDispatch = (ms: Binding[]): CExp =>
        ms.length === 0 ? makeLitExp(makeSymbolSExp("error")) :
        makeIfExp(
            makeAppExp(makePrimOp("eq?"),
                       [makeVarRef("msg"), makeLitExp(makeSymbolSExp(ms[0].var.var))]),
            methodBody(ms[0].val),
            buildDispatch(ms.slice(1))
        );
    return makeProcExp(exp.fields,
        [makeProcExp([makeVarDecl("msg")], [buildDispatch(methods)])]);
};

// Methods are no-arg lambdas under the simplification of section 2c -
// the dispatch returns the method's body expression directly.
const methodBody = (v: CExp): CExp =>
    isProcExp(v) && v.body.length > 0 ? v.body[0] : v;

const rewriteCExp = (e: CExp): CExp =>
    isNumExp(e) || isBoolExp(e) || isStrExp(e) || isPrimOp(e) || isVarRef(e) || isLitExp(e) ? e :
    isAppExp(e) ? makeAppExp(rewriteCExp(e.rator), map(rewriteCExp, e.rands)) :
    isIfExp(e) ? makeIfExp(rewriteCExp(e.test), rewriteCExp(e.then), rewriteCExp(e.alt)) :
    isProcExp(e) ? makeProcExp(e.args, map(rewriteCExp, e.body)) :
    isLetExp(e) ? makeLetExp(
        map((b: Binding) => makeBinding(b.var.var, rewriteCExp(b.val)), e.bindings),
        map(rewriteCExp, e.body)) :
    isClassExp(e) ? class2proc(e) :
    e;

const rewriteExp = (e: Exp): Exp =>
    isDefineExp(e) ? makeDefineExp(e.var, rewriteCExp(e.val)) :
    isCExp(e) ? rewriteCExp(e) :
    e;

/*
Purpose: Transform all class forms in the given AST to procs
Signature: transform(AST)
Type: [Exp | Program] => Result<Exp | Program>
*/

export const transform = (exp: Exp | Program): Result<Exp | Program> =>
    isProgram(exp) ? makeOk(makeProgram(map(rewriteExp, exp.exps))) :
    isDefineExp(exp) ? makeOk(rewriteExp(exp)) :
    isCExp(exp) ? makeOk(rewriteCExp(exp)) :
    makeFailure("transform: unrecognized expression");
