// using literal strings instead of numbers so that it's easier to inspect
// debugger events

export const enum TrackOpTypes {
  GET = 'get',
  HAS = 'has',
  ITERATE = 'iterate'
}

export const enum TriggerOpTypes {
  SET = 'set', // Map, WeakMap
  ADD = 'add', // Set, WeakSet
  DELETE = 'delete',
  CLEAR = 'clear'
}
