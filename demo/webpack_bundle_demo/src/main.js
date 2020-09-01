const err = require('./print');

err('just error');
import('./add').then(add => {
  console.log(add.default(1, 2));
})
