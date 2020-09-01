import { debounce, throttle } from '../debounceAndThrottle/debounce'

// nodejs从11开始，nextTick，setTimeout有调整，https://blog.insiderattack.net/new-changes-to-timers-and-microtasks-from-node-v11-0-0-and-above-68d112743eb3
// first time resolve, wait for macro task since there are multiple
// microtasks / .then() calls
const timeout = (n = 0) => new Promise(r => setTimeout(r, n));

describe('test debounce and throttle', () => {
  test('debounce', async () => {
    const spy = jest.fn()
    const callback = debounce(spy, 500)
    callback()
    expect(spy).toHaveBeenCalledTimes(0)
    callback()
    await timeout(1000)
    expect(spy).toHaveBeenCalledTimes(1)
  })

  test('throttle', async () => {
    const spy = jest.fn()
    const callback = throttle(spy, 500)
    callback()
    expect(spy).toHaveBeenCalledTimes(0)
    callback()
    await timeout(1000)
    expect(spy).toHaveBeenCalledTimes(1)
  })
})