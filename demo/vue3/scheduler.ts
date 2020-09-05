export interface SchedulerJob {
  (): void
  id?: number,
  allowRecurse?: boolean
}
export type SchedulerCb = Function & { id?: number}
export type SchedulerCbs = SchedulerCb | SchedulerCb[]

const resolvedPromise = Promise.resolve()
let currentFlushPromise = null
const queue = []
let isPending = false, isFlushing = false
export const nextTick = (fn?: () => void) => {
  const p = currentFlushPromise || resolvedPromise
  return fn ? p.then(fn) : p
}

export function queueJob(job: Job) {
  queue.push(job)
  queueFlush()
}
function queueFlush() {
  if(!isPending && !isFlushing) {
    isPending = true
    currentFlushPromise = resolvedPromise.then(flushJobs)
  }
}
export function invalidateJob(job: Job) {
  const i = queue.indexOf(job)
  if(~i) {
    queue[i] = null
  }
}

const pendingPreFlushCbs = []
const activePreFlushCbs = []
const pendingPostFlushCbs = []
const activePostFlushCbs = []
export function queuePreFlushCb(cb: SchedulerCbs) {
  queueCb(cb, pendingPreFlushCbs, activePreFlushCbs)
}
export function queuePostFlushCb(cb: SchedulerCbs) {
  queueCb(cb, pendingPostFlushCbs, activePostFlushCbs)
}
function queueCb(cb: SchedulerCbs, activeFlushCbs: SchedulerCb[], pendingFlushCbs: SchedulerCb[]) {
  if(!Array.isArray(cb)) {
    if(!activeFlushCbs || !activeFlushCbs.includes(cb)) {
      pendingPreFlushCbs.push(cb)
    }
  } else {
    pendingPreFlushCbs.push(...cb)
  }
  queueFlush()
}

function flushJobs() {
  isFlushing = true
  isPending = false
  // flushPreFlushCbs()
  try {
    // queue()
  } finally {
    queue.length = 0
    isFlushing = false
    currentFlushPromise = null
    // flushPostFlushCbs()
  }
}