import {  evalL3program } from '../L3/L3-eval-env';
import { SExpValue, Value, valueToString } from "../L3/L3-value";
import { Result, bind, isOk, makeOk, makeFailure } from "../shared/result";
import { parseL3} from "../L3/L3-ast";


const evalP = (x: string): Result<Value> =>
    bind(parseL3(x), evalL3program);

const evalP2String = (x: string): string => {
    const res : Result<SExpValue> = bind(parseL3(x), evalL3program);
    return isOk(res) ? valueToString(res.value) : res.message;
}

describe('Q2B Tests for environment model', () => {
    
    it("Test class definition", () => {
        expect(evalP2String(`
        (L3
         (define pair 
            (class (a b) 
               ((first (lambda () a)) 
                (second (lambda () b))
                (sum (lambda () (+ a b)))
                (f (lambda (k) (/ (* k a) (* k b))))
               )
             )
         )
         pair
        )`)).toStrictEqual("Class");
    });

    it("Test object definition", () => {
        expect(evalP2String(`
        (L3
            (define pair 
               (class (a b) 
                  ((first (lambda () a)) 
                   (second (lambda () b))
                   (sum (lambda () (+ a b)))
                   (f (lambda (k) (/ (* k a) (* k b))))
                  )
                )
            )
            (define p34 (pair 3 4))
            p34
        )
        `)).toStrictEqual("Object");
    });    
    
    it("Test object methods application", () => {

        expect(evalP(`
        (L3
            (define pair 
               (class (a b) 
                  ((first (lambda () a)) 
                   (second (lambda () b))
                   (sum (lambda () (+ a b)))
                   (f (lambda (k) (/ (* k a) (* k b))))
                  )
                )
            )
            (define p34 (pair 3 4))
            (p34 'first)
        )
        `)).toStrictEqual(makeOk(3));

        expect(evalP(`
        (L3
            (define pair 
               (class (a b) 
                  ((first (lambda () a)) 
                   (second (lambda () b))
                   (sum (lambda () (+ a b)))
                   (f (lambda (k) (/ (* k a) (* k b))))
                  )
                )
            )
            (define p34 (pair 3 4))
            (p34 'second)
        )
        `)).toStrictEqual(makeOk(4));

        expect(evalP(`
        (L3
            (define pair 
               (class (a b) 
                  ((first (lambda () a)) 
                   (second (lambda () b))
                   (sum (lambda () (+ a b)))
                   (f (lambda (k) (/ (* k a) (* k b))))
                  )
                )
            )
            (define p34 (pair 3 4))
            (p34 'sum)
        )
        `)).toStrictEqual(makeOk(7));

    });    

    it("Test object methods application with parameters", () => {

    expect(evalP(`
    (L3
        (define pair 
           (class (a b) 
              ((first (lambda () a)) 
               (second (lambda () b))
               (sum (lambda () (+ a b)))
               (f (lambda (k) (/ (* k a) (* k b))))
              )
            )
        )
        (define p34 (pair 3 4))
        (p34 'f 2)
    )
    `)).toStrictEqual(makeOk(0.75));
});


it("Test unknown methods application for environment model", () => {

    expect(evalP(`
    (L3
        (define pair 
          (class (a b) 
           ((first (lambda () a)) 
            (second (lambda () b))
            (sum (lambda () (+ a b)))
            (f (lambda (k) (/ (* k a) (* k b))))
           )
          )
        )
        (define p34 (pair 3 4))
        (p34 'power)
    )
`)).toStrictEqual(makeFailure("Unrecognized method: power"));

});

it("Test unknown field in methods application", () => {

    expect(evalP(`
    (L3
      (define pair 
        (class (a b) 
           ((first (lambda () a)) 
            (second (lambda () b))
            (sum (lambda () (+ a c)))
            (f (lambda (k) (/ (* k a) (* k b))))
           )
        )
      )
      (define p34 (pair 3 4))
      (p34 'sum)
    )
`)).toStrictEqual(makeFailure("var not found: c"));

});

it("Test nested object methods application", () => {

    expect(evalP(`
    (L3
        (
         (lambda (obj) (obj 'first))
         (
           (class (a b) 
              ((first (lambda () a)) 
               (second (lambda () b))
               (sum (lambda () (+ a b)))
               (f (lambda (k) (/ (* k a) (* k b))))
              )
            )
            3 4
         )
       )
    )
    `)).toStrictEqual(makeOk(3));


 
});


});
