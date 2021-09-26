<<<<<<< Updated upstream
type StrHex = '1' | '2' | '3' | 'A' | 'B' | 'C'
type Char4 = `${StrHex}`
=======
type StrHex = '1' | '2' | '3' | '4' |'6' | '7' | '8' | '9' | '0' | 'A' | 'B' | 'C' | 'D' | 'E' | 'F'
type Char4 = `${StrHex}${StrHex}${StrHex}${StrHex}`
type IsUUID<T extends string> = 
  Uppercase<T> extends `${Char4}${infer A}-${infer B}-${infer C}-${infer D}` ?
    A extends Char4 ?
      B extends Char4 ? true : false
    : false
  : false

declare function isUUID<T extends string>(x: `${T}`) : IsUUID<T>
const a = isUUID('1234')
console.log(a);
>>>>>>> Stashed changes
