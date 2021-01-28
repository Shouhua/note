declare const RefSymbol: unique symbol
// const RefSymbol = Symbol()

export interface Ref<T = any> {
  value: T
  /**
   * Type differentiator only.
   * We need this to be in public d.ts but don't want it to show up in IDE
   * autocomplete, so we use a private Symbol instead.
   */
  [RefSymbol]: true
  /**
   * @internal
   */
  _shallow?: boolean
}

// export function ref<T>(value: T): Ref<T>
export function ref(value: any): Ref {
  return new RefImpl('hello')
}

class RefImpl<T> {
  private _value: T

  public readonly __v_isRef = true

  constructor(private _rawValue: T, public readonly _shallow = false) {
    this._value = _rawValue
  }

  get value() {
    return ''
  }

  set value(newVal) {
  }
}