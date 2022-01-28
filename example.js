/* globals bench:false, set:false */

'use strict';

set('maxTime', 1);

const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
let sum = 0; // eslint-disable-line no-unused-vars

bench('forEach', () => {
  arr.forEach((v) => {
    sum ^= v;
  });
});

bench('for-of loop', () => {
  for (const v of arr) {
    sum ^= v;
  }
});

bench('for loop (post)', () => {
  for (let i = 0; i < arr.length; i++) {
    sum ^= arr[i];
  }
});

bench('for loop (pre)', () => {
  for (let i = 0; i < arr.length; ++i) {
    sum ^= arr[i];
  }
});

bench('for loop (cached length)', () => {
  for (let i = 0, len = arr.length; i < len; i++) {
    sum ^= arr[i];
  }
});
