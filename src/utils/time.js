/**
 * start an interval callback at the given rate. Unlike the native window.setInterval
 * this will call on the leading edge of the interval. Returns a function that be used
 * to cancel the interval
 * @param milliseconds
 */
export const interval = (callback, milliseconds) => {
  // setup system interval
  let timer = setInterval(callback, milliseconds);

  // make the initial callback soon but not before returning from this call.
  requestAnimationFrame(() => {
    // make sure we were not cancelled
    if (timer) {
      callback();
    }
  });

  // return cancel function
  return () => {
    clearInterval(timer);
    timer = 0;
  };
};
