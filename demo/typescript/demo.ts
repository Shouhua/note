type StrHex = '1' | '2' | '3' | '4' | '6' | '7' | '8' | '9' | '0' | 'A' | 'B' | 'C' | 'D' | 'E' | 'F'
type Char4 = `${StrHex}${StrHex}${StrHex}${StrHex}`
type IsUUID<T extends string> =
  Uppercase<T> extends `${Char4}${infer A}-${infer B}-${infer C}-${infer D}` ?
  A extends Char4 ?
  B extends Char4 ? true : false
  : false
  : false

declare function isUUID<T extends string>(x: `${T}`): IsUUID<T>
const a = isUUID('1234')
console.log(a);

interface Process {
  [key: string]: number | string;
}

interface ProcessChild extends Process {
  "hello": 22;
}

enum Weekday {
  Monday,
  Tuesday,
  Wednesday,
  Thursday,
  Friday,
  Saturday,
  Sunday
}

namespace Weekday {
  export function isBusinessDay(day: Weekday) {
    switch (day) {
      case Weekday.Saturday:
      case Weekday.Sunday:
        return false;
      default:
        return true;
    }
  }
}

function strEnum<T extends string>(o: Array<T>): { [K in T]: K} {
  return o.reduce((res, key) => {
    res[key] = key;
    return res;
  }, Object.create(null));
}

const Direction = strEnum(['North', 'South'])
type Direction = keyof typeof Direction 

let sample: Direction
sample = Direction.North
sample = 'South'
