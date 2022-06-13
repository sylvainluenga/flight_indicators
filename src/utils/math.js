/**
 * round a real to given number of decimal places. This is much better than toFixed for the following reasons:
 *
 * round(1.005, 2) = 1.01 ( toFixed would give 1.00 )
 * round(2.00, 2 ) = 2 ( toFixed would give 2.00 )
 * @param value
 * @param decimals
 * @returns {number}
 */
export const round = (value, decimals) => {
  return Number(Math.round(value + "e" + decimals) + "e-" + decimals);
};

// map an input value ( 0..1 ) to a non linear scale ( 0..maxValue ) where midvalue is the value
// at the midpoint of the non linear scale. NOTE: Specifying a linear scale will produce an error.
/**
 * map an input value 0..1 to a non linear scale 0..maxValue with a specified mid point
 *
 * @param inputValue
 * @param midValue
 * @param maxValue
 * @returns {number}
 */
export const nonLinearScale = (inputValue, midValue, maxValue) => {
  let returnValue;
  console.assert(
    inputValue >= 0 && inputValue <= 1,
    "input value out of range"
  );
  console.assert(
    midValue > 0 || midValue < maxValue,
    "MidValue must be greater than 0 and less than MaxValue"
  );

  // returnValue = A + B * Math.Exp(C * inputValue);
  const M = maxValue / midValue;
  const C = Math.log(Math.pow(M - 1, 2));
  const B = maxValue / (Math.exp(C) - 1);
  const A = -1 * B;
  returnValue = A + B * Math.exp(C * inputValue);
  // you will get NaN for a linear scale, so handle that edge case by returning the scaled linear value
  if (isNaN(returnValue)) {
    return maxValue * inputValue;
  }
  return returnValue;
};

/**
 * lerp from -> to over the given time. Returns a function that can be used to
 * cancel the lerp at any time. If sine based ease is used by default by can be disabled.
 * @param from
 * @param to
 * @param time
 * @param callback
 * @param ease
 * @returns {function()}
 */
export const lerp = (from, to, time, callback, ease = true) => {
  console.assert(
    isFinite(from) && isFinite(to) && isFinite(time) && time > 0,
    "invalid parameters"
  );

  // time span over which to operate
  const startTime = Date.now();
  const endTime = startTime + time;

  let requestId = 0;

  const timer = () => {
    let value = to;
    const now = Date.now();
    if (now < endTime) {
      const delta = now - startTime;
      const normalized = ease
        ? Math.sin((delta / time) * (Math.PI / 2))
        : delta / time;
      value = from + normalized * (to - from);
      requestId = requestAnimationFrame(timer);
    } else {
      requestId = 0;
    }
    callback(value);
  };

  requestId = requestAnimationFrame(timer);

  return () => {
    if (requestId) {
      cancelAnimationFrame(requestId);
    }
  };
};

/**
 * TODO, gives this a shared requestAnimationFrame
 */
export class AnimatedValue {
  constructor(value, options = {}) {
    // assign our option
    Object.assign(this, options, {
      lowLimit: -Number.MAX_VALUE,
      hiLimit: Number.MAX_VALUE,
      time: 1000,
      callback: () => {}
    });
    // the actual value with initial clamping
    this.value = Math.max(this.lowLimit, Math.min(this.hiLimit, value));
    // the current value of the animation
    this.currentValue = value;
  }

  /**
   * set the value and begin a lerp as necessary to reach it
   * @param value
   */
  setValue(value) {
    if (value !== this.value) {
      this.cancelLerp();
      this.value = Math.max(this.lowLimit, Math.min(this.hiLimit, value));
      this.lerp = lerp(this.currentValue, this.value, this.time, v => {
        this.currentValue = v;
        this.callback(this.currentValue, this.value);
      });
    }
  }

  /**
   * set the value with immediate effect, no animation
   * @param value
   */
  setValueImmediate(value) {
    this.value = Math.max(this.lowLimit, Math.min(this.hiLimit, value));
    this.currentValue = value;
    this.cancelLerp();
    this.callback(this.currentValue, this.value);
  }

  /**
   * cancel any current lerp
   */
  cancelLerp() {
    if (this.lerp) {
      this.lerp();
      this.lerp = null;
    }
  }
}
