import { expect } from 'chai';
import { unparseL3, parseL3, parseL3Exp } from '../L3/L3-ast';
import { transform } from '../L3/SyntacticTransformation';
import { makeOk, bind } from '../shared/result';
import { parse as p } from "../shared/parser";

describe('Q2C Tests', () => {

     
    it('trnasform class-exp to app-exp', () => {
          expect(bind(bind(bind(p(`(class (a b) ((first (lambda () a)) (second (lambda () b)) (sum (lambda () (+ a b)))))`), parseL3Exp), transform),  x=>makeOk(unparseL3(x)))).to.deep.equal(makeOk(`(lambda (a b) (lambda (msg) (if (eq? msg 'first) a (if (eq? msg 'second) b (if (eq? msg 'sum) (+ a b) 'error)))))`));
     });

     it('trnasform class-exp program to proc-exp', () => {
          expect(bind(bind(parseL3(`(L3 (define pair (class (a b) ((first (lambda () a)) (second (lambda () b)) (sum (lambda () (+ a b)))))) (let ((p12 (pair 1 2)) (p34 (pair 3 4))) (if (> (p12 'first) (p34 'second)) #t #f)))`), transform),  x=>makeOk(unparseL3(x)))).to.deep.equal(makeOk(`(L3 (define pair (lambda (a b) (lambda (msg) (if (eq? msg 'first) a (if (eq? msg 'second) b (if (eq? msg 'sum) (+ a b) 'error)))))) (let ((p12 (pair 1 2)) (p34 (pair 3 4))) (if (> (p12 'first) (p34 'second)) #t #f)))`));
     });

});