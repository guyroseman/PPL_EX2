import { parseL3, parseL3Exp } from '../L3/L3-ast';
import { l2ToPython } from '../q3';
import { bind, Result, makeOk } from '../shared/result';
import { parse as p } from "../shared/parser";

const l2ToPythonResult = (x: string): Result<string> =>
    bind(bind(p(x),parseL3Exp),l2ToPython);


describe('Q4 Tests', () => {

     it('parse primitive ops', () => {
         expect(l2ToPythonResult(`(+ 3 5 7)`)).toStrictEqual(makeOk(`(3 + 5 + 7)`));
         expect(l2ToPythonResult(`(= 3 (+ 1 2))`)).toStrictEqual(makeOk(`(3 == (1 + 2))`));
     });

     it('parse "if" expressions', () => {
         expect(l2ToPythonResult(`(if (> x 3) 4 5)`)).toStrictEqual(makeOk(`(4 if (x > 3) else 5)`));
     });

     it('parse "lambda" expressions', () => {
         expect(l2ToPythonResult(`(lambda (x y) (* x y))`)).toStrictEqual(makeOk(`(lambda x,y : (x * y))`));
         expect(l2ToPythonResult(`((lambda (x y) (* x y)) 3 4)`)).toStrictEqual(makeOk(`(lambda x,y : (x * y))(3,4)`));
     });
    
    it("define constants", () => {
         expect(l2ToPythonResult(`(define pi 3.14)`)).toStrictEqual(makeOk(`pi = 3.14`));
    });

    it("define functions", () => {
        expect(l2ToPythonResult(`(define f (lambda (x y) (* x y)))`)).toStrictEqual(makeOk(`f = (lambda x,y : (x * y))`));
    });

    it("apply user-defined functions", () => {
        expect(l2ToPythonResult(`(f 3 4)`)).toStrictEqual(makeOk(`f(3,4)`));
    });

   it('program', () => {
        expect(bind(parseL3(`(L3 (define b (> 3 4)) (define x 5) (define f (lambda (y) (+ x y))) (define g (lambda (y) (* x y))) (if (not b) (f 3) (g 4)) (if (= a b) (f 3) (g 4)) (if (> a b) (f 3) (g 4)) ((lambda (x) (* x x)) 7))`), l2ToPython)).toStrictEqual(makeOk(`b = (3 > 4)\nx = 5\nf = (lambda y : (x + y))\ng = (lambda y : (x * y))\n(f(3) if (not b) else g(4))\n(f(3) if (a == b) else g(4))\n(f(3) if (a > b) else g(4))\n(lambda x : (x * x))(7)`));
    });
});