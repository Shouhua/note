import { reactive, computed } from 'vue';

const isFunction = (val) => typeof fn === 'function';
const isPromise = (val) => typeof val === 'object' && isFunction(val.then) && isFunction(val.catch);

class Store {
  constructor(options) {
    this.state = reactive(options.state);
    this.mutations = options.mutations; // commit mutations
    this.actions = options.actions; // dispatch actions
    if(options.getters) {
      this.getters = [];
      for(const [key, fn] of Object.entries(options.getters)) {
        // this.getters[key] = computed(() => fn(this.state)).value;
        Object.defineProperty(this.getters, key, {
          enumerable: true,
          get: () => computed(() => fn(this.state)).value
        })
      }
    }
  }

  commit(handle, payload) { // commit mutations
    const fn = this.mutations[handle];
    if(!fn) {
      throw new Error(`[Hackex]: ${handle} is not defined`)
    }
    fn(this.state, payload);
  }

  dispatch(handle, payload) { // dispatch actions
    const fn = this.actions[handle];
    if(!fn) {
      throw new Error(`[Hackex]: ${handle} is not defined`)
    }
    const result = fn(this, payload);
    if(!isPromise(result)) return Promise.resolve(result);
    return result;
  }
}

export const Vuex = {
  Store
}