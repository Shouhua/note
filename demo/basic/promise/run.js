setTimeout(() => {
    console.log('set timeout1')
    process.nextTick(() => console.log('next tick inside timmer handler'));
}, 0);
Promise.resolve().then(() => console.log('promise1 resolved'));
Promise.resolve().then(() => {
    console.log('promise2 resolved');
    process.nextTick(() => console.log('next tick inside promise resolve handler'));
});
Promise.resolve().then(() => console.log('promise3 resolved'));
setImmediate(() => console.log('set immediate1'));
process.nextTick(() => console.log('next tick1'));
setImmediate(() => console.log('set immediate2'));
process.nextTick(() => console.log('next tick2'));
Promise.resolve().then(() => console.log('promise4 resolved'));
setTimeout(() => {
    console.log('set timeout2');
}, 0);