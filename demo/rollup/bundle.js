// export const a = /*#__PURE__*/(function() {
//   console.log('a')
// }())

const a = /*#__PURE__*/(function() {
  console.log('a');
}());

const b = function() {
  console.log('b');
};

console.log('index');
b();
