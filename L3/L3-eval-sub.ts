// L3-eval.ts
import { map } from "ramda";
import { isCExp, isLetExp, isClassExp } from "./L3-ast"; // Added isClassExp
import { BoolExp, CExp, Exp, IfExp, LitExp, NumExp,
         PrimOp, ProcExp, Program, StrExp, VarDecl } from "./L3-ast";
import { isAppExp, isBoolExp, isDefineExp, isIfExp, isLitExp, isNumExp,
             isPrimOp, isProcExp, isStrExp, isVarRef } from "./L3-ast";
import { makeBoolExp, makeLitExp, makeNumExp, makeProcExp, makeStrExp } from "./L3-ast";
import { parseL3Exp } from "./L3-ast";
import { applyEnv, makeEmptyEnv, makeEnv, Env } from "./L3-env-sub";
import { makeEmptyEnv as makeEmptyEnvEnv } from "./L3-env-env";
// Added Class and Object imports:
import { isClosure, makeClosure, Closure, Value, ClassValue, ObjectValue, isClassValue, isObjectValue, makeClassValue, makeObjectValue, isSymbolSExp } from "./L3-value";
import { first, rest, isEmpty, List, isNonEmptyList } from '../shared/list';
import { isBoolean, isNumber, isString } from "../shared/type-predicates";
import { Result, makeOk, makeFailure, bind, mapResult, mapv } from "../shared/result";
import { renameExps, substitute } from "./substitute";
import { applyPrimitive } from "./evalPrimitive";
import { parse as p } from "../shared/parser";
import { Sexp } from "s-expression";
import { format } from "../shared/format";

// ========================================================
// Eval functions

const L3applicativeEval = (exp: CExp, env: Env): Result<Value> =>
    isNumExp(exp) ? makeOk(exp.val) : 
    isBoolExp(exp) ? makeOk(exp.val) :
    isStrExp(exp) ? makeOk(exp.val) :
    isPrimOp(exp) ? makeOk(exp) :
    isVarRef(exp) ? applyEnv(env, exp.var) :
    isLitExp(exp) ? makeOk(exp.val) :
    isIfExp(exp) ? evalIf(exp, env) :
    isProcExp(exp) ? evalProc(exp, env) :
    isClassExp(exp) ? makeOk(makeClassValue(exp.fields, exp.methods, makeEmptyEnvEnv())) : // <-- Evaluates Class definition (env unused in sub model)
    isAppExp(exp) ? bind(L3applicativeEval(exp.rator, env), (rator: Value) =>
                        bind(mapResult(param => 
                            L3applicativeEval(param, env), 
                              exp.rands), 
                            (rands: Value[]) =>
                                L3applyProcedure(rator, rands, env))) :
    isLetExp(exp) ? makeFailure('"let" not supported (yet)') :
    makeFailure('Never');

export const isTrueValue = (x: Value): boolean =>
    ! (x === false);

const evalIf = (exp: IfExp, env: Env): Result<Value> =>
    bind(L3applicativeEval(exp.test, env), (test: Value) => 
        isTrueValue(test) ? L3applicativeEval(exp.then, env) : 
        L3applicativeEval(exp.alt, env));

const evalProc = (exp: ProcExp, env: Env): Result<Closure> =>
    makeOk(makeClosure(exp.args, exp.body));

const L3applyProcedure = (proc: Value, args: Value[], env: Env): Result<Value> =>
    isPrimOp(proc) ? applyPrimitive(proc, args) :
    isClosure(proc) ? applyClosure(proc, args, env) :
    isClassValue(proc) ? applyClass(proc, args) : // <-- Handles object instantiation
    isObjectValue(proc) ? applyObject(proc, args, env) : // <-- Handles method calls
    makeFailure(`Bad procedure ${format(proc)}`);

// Applications are computed by substituting computed
// values into the body of the closure.
// To make the types fit - computed values of params must be
// turned back in Literal Expressions that eval to the computed value.
const valueToLitExp = (v: Value): NumExp | BoolExp | StrExp | LitExp | PrimOp | ProcExp =>
    isNumber(v) ? makeNumExp(v) :
    isBoolean(v) ? makeBoolExp(v) :
    isString(v) ? makeStrExp(v) :
    isPrimOp(v) ? v :
    isClosure(v) ? makeProcExp(v.params, v.body) :
    makeLitExp(v as any); // <-- Added 'as any' so TS doesn't complain about Objects

const applyClosure = (proc: Closure, args: Value[], env: Env): Result<Value> => {
    const vars = map((v: VarDecl) => v.var, proc.params);
    const body = renameExps(proc.body);
    const litArgs : CExp[] = map(valueToLitExp, args);
    return evalSequence(substitute(body, vars, litArgs), env);
}

// --------------------------------------------------------
// Q2.b: Class and Object Application Helpers

const applyClass = (proc: ClassValue, args: Value[]): Result<Value> => {
    // Validate number of arguments matches the number of fields
    if (proc.fields.length !== args.length) {
        return makeFailure(`Class expected ${proc.fields.length} arguments, got ${args.length}`);
    }
    // Return a new object with the class and the evaluated arguments as state
    return makeOk(makeObjectValue(proc, args));
}

const applyObject = (proc: ObjectValue, args: Value[], env: Env): Result<Value> => {
    // Methods are invoked by applying a symbol to the object
    if (args.length === 0) {
        return makeFailure("Method invocation requires a method name");
    }
    
    // The first argument is the method name
    const methodName = args[0];
    if (!isSymbolSExp(methodName)) {
        return makeFailure("Method name must be a symbol");
    }

    // Safely cast or alias after confirming it's a SymbolSExp to satisfy the compiler
    const symbolMethod = methodName;

    // Look up the method in the class definition using symbolMethod.val
    const method = proc.class.methods.find(m => m.var.var === symbolMethod.val);
    if (!method) {
        return makeFailure(`Unrecognized method: ${symbolMethod.val}`);
    }

    // Extract the field names and map the object's current state into literals
    const vars = map((v: VarDecl) => v.var, proc.class.fields);
    const litArgs = map(valueToLitExp, proc.fieldsState);

    // Substitute the field names in the method's body with the object's literal state values
    const methodCode = substitute([method.val], vars, litArgs as CExp[]);

    // Evaluate the substituted method code (this results in a closure)
    return bind(L3applicativeEval(methodCode[0], env), (methodClosure: Value) =>
        // Apply the newly evaluated method closure to any remaining arguments
        L3applyProcedure(methodClosure, args.slice(1), env)
    );
}
// --------------------------------------------------------

// Evaluate a sequence of expressions (in a program)
export const evalSequence = (seq: List<Exp>, env: Env): Result<Value> =>
    isNonEmptyList<Exp>(seq) ? 
        isDefineExp(first(seq)) ? evalDefineExps(first(seq), rest(seq), env) :
        evalCExps(first(seq), rest(seq), env) :
    makeFailure("Empty sequence");

const evalCExps = (first: Exp, rest: Exp[], env: Env): Result<Value> =>
    isCExp(first) && isEmpty(rest) ? L3applicativeEval(first, env) :
    isCExp(first) ? bind(L3applicativeEval(first, env), _ => 
                            evalSequence(rest, env)) :
    makeFailure("Never");

// Eval a sequence of expressions when the first exp is a Define.
// Compute the rhs of the define, extend the env with the new binding
// then compute the rest of the exps in the new env.
const evalDefineExps = (def: Exp, exps: Exp[], env: Env): Result<Value> =>
    isDefineExp(def) ? bind(L3applicativeEval(def.val, env), 
                            (rhs: Value) => 
                                evalSequence(exps, 
                                    makeEnv(def.var.var, rhs, env))) :
    makeFailure(`Unexpected in evalDefine: ${format(def)}`);

// Main program
export const evalL3program = (program: Program): Result<Value> =>
    evalSequence(program.exps, makeEmptyEnv());

export const evalParse = (s: string): Result<Value> =>
    bind(p(s), (sexp: Sexp) => 
        bind(parseL3Exp(sexp), (exp: Exp) =>
            evalSequence([exp], makeEmptyEnv())));