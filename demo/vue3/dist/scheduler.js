"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.queuePostFlushCb = exports.queuePreFlushCb = exports.invalidateJob = exports.queueJob = exports.nextTick = void 0;
const resolvedPromise = Promise.resolve();
let currentFlushPromise = null;
const queue = [];
let isPending = false, isFlushing = false;
exports.nextTick = (fn) => {
    const p = currentFlushPromise || resolvedPromise;
    return fn ? p.then(fn) : p;
};
function queueJob(job) {
    queue.push(job);
    queueFlush();
}
exports.queueJob = queueJob;
function queueFlush() {
    if (!isPending && !isFlushing) {
        isPending = true;
        currentFlushPromise = resolvedPromise.then(flushJobs);
    }
}
function invalidateJob(job) {
    const i = queue.indexOf(job);
    if (~i) {
        queue[i] = null;
    }
}
exports.invalidateJob = invalidateJob;
const pendingPreFlushCbs = [];
const activePreFlushCbs = [];
const pendingPostFlushCbs = [];
const activePostFlushCbs = [];
function queuePreFlushCb(cb) {
    queueCb(cb, pendingPreFlushCbs, activePreFlushCbs);
}
exports.queuePreFlushCb = queuePreFlushCb;
function queuePostFlushCb(cb) {
    queueCb(cb, pendingPostFlushCbs, activePostFlushCbs);
}
exports.queuePostFlushCb = queuePostFlushCb;
function queueCb(cb, activeFlushCbs, pendingFlushCbs) {
    if (!Array.isArray(cb)) {
        if (!activeFlushCbs || !activeFlushCbs.includes(cb)) {
            pendingPreFlushCbs.push(cb);
        }
    }
    else {
        pendingPreFlushCbs.push(...cb);
    }
    queueFlush();
}
function flushJobs() {
    isFlushing = true;
    isPending = false;
    // flushPreFlushCbs()
    try {
        // queue()
    }
    finally {
        queue.length = 0;
        isFlushing = false;
        currentFlushPromise = null;
        // flushPostFlushCbs()
    }
}
