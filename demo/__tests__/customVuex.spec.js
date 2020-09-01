import { Vuex } from '../customVuex';

// jest babel-jest @babel/core @babel/preset-env
describe('custom vuex', () => {
  test('reactive state', () => {
    const store = new Vuex.Store({
      state: {
        count: 0
      }
    });
    
    expect(store.state.count).toBe(0);
    store.state.count++;
    expect(store.state.count).toBe(1);
  })

  test('commits a mutation', () => {
    const store = new Vuex.Store({
      state: {
        count: 0
      },
      mutations: {
        INCREMENT(state, payload) {
          state.count += payload
        }
      }
    });
    store.commit('INCREMENT', 1);
    expect(store.state.count).toBe(1)
  })

  test('throws an error for a missing mutation', () => {
    const store = new Vuex.Store({ state: {}, mutations: {} })
    expect(() => store.commit('INCREMENT', 1)).toThrow('[Hackex]: INCREMENT is not defined')
  })

  test('dispatches an action', async () => {
    const store = new Vuex.Store({
      state: {
        count: 0
      },
      mutations: {
        INCREMENT(state, payload) {
          state.count += payload;
        }
      },
      actions: {
        increment(context, payload) {
          context.commit('INCREMENT', payload)
        }
      }
    })
    return store.dispatch('increment', 1).then(()=> {
      expect(store.state).toEqual({count: 1})
    })
  })

  test('getters', () => {
    const store = new Vuex.Store({
      state: {
        count: 5
      },
      getters: {
        triple(state) {
          return state.count * 3
        }
      }
    })
    expect(store.getters['triple']).toBe(15)
    store.state.count += 5
    expect(store.getters['triple']).toBe(30)
  })
})