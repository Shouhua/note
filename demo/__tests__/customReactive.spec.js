import { reactive, ref, effect, computed } from '../customReactive';

describe('reactive', () => {
  test('reactive', () => {
    const raw = {
      count: 1
    }
    const o = reactive(raw)
    o.count++
    expect(raw.count).toBe(2)
  })

  test('effect', () => {
    const raw = {
      count: 1
    }
    const o = reactive(raw)
    let c;
    const effectSpy = jest.fn(() => { c = o.count})
    effect(effectSpy)

    expect(effectSpy).toHaveBeenCalledTimes(1)
    expect(c).toBe(1)
    
    o.count++;

    expect(effectSpy).toHaveBeenCalledTimes(2)
    expect(c).toBe(2)
  })

  test('computed', () => {
    const raw = {
      count: 1
    }
    const o = reactive(raw)

    const c = computed(() => o.count + 3)
    expect(c.value).toBe(4)
    o.count++;
    expect(c.value).toBe(5)
  })
})