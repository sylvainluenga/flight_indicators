/**
 * convert millibars to feet altitude
 * @param millibars
 * @returns {number}
 */
export function millibarsToFeet(millibars) {
  // 1024 = Math.pow(2, 10)
  // reverse Math.pow(1024, 1 / 10)
  const feet = (1 - Math.pow(millibars / 1013.25, 0.190284)) * 145366.45;
  return feet;
}

/**
 * convert inches of mercury to feet altitude
 * @param inchesNg
 * @returns {number}
 */
export function inchesHgToFeet(inchesNg) {
  return millibarsToFeet(inchesHgToMillibars(inchesNg));
}

/**
 * millibars to inches of mercury
 * @param millibars
 * @returns {number}
 */
export function millibarsToInchesHg(millibars) {
  return 0.02953 * millibars;
}

/**
 * inches of mercury to millibars
 * @param millibars
 * @returns {number}
 */
export function inchesHgToMillibars(inchesHg) {
  return inchesHg / 0.02953;
}

/**
 * convert a signed degrees value to positive 0->360
 * e.g. -10 becomes 350
 *      400 becomes 40
 */
export function signedDegreesToPositive360(vIn) {
  let vOut = vIn;
  if (vOut < 0) {
    vOut = 360 + vOut;
  }
  vOut = vOut % 360;
  return vOut;
}

/**
 * standard barometer in inches of mercury
 * @type {number}
 */
export const STANDARD_BAROMETER = 29.92;
