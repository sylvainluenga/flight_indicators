import Vector2D from "../geometry/vector2d";
/**
 * An angle in clock format ( 0 degrees is straight up ) to a regular angle
 * @param angle
 * @returns {number}
 */
export const C2D = angle => {
  return (270 + angle) % 360;
};

/**
 * angle to clock angles ( 0 degrees returned as -90 )
 * @param angle
 * @returns {number}
 */
export const D2C = angle => {
  return (angle - 90) % 360;
};

/**
 * degrees to radian
 * @param d
 * @returns {number}
 */
export const D2R = d => {
  return d * (Math.PI / 180);
};

/**
 * radians to degrees
 * @param r
 * @returns {number}
 */
export const R2D = r => {
  return r * (180 / Math.PI);
};

/**
 * point on the circumference of a circle
 * @param {Vector2D} center
 * @param {number} radius
 * @param {number } angle - degrees
 * @returns {Vector2D}
 */
export const POC = (center, radius, angle) => {
  return new Vector2D(
    center.x + radius * Math.cos(D2R(angle)),
    center.y + radius * Math.sin(D2R(angle))
  );
};

/**
 * return the angle between the given center point and the given position
 * @param center
 * @param position
 */
export const angleFrom = (center, position) => {
  let a =
    (Math.atan2(position.y - center.y, position.x - center.x) * 180) / Math.PI;
  // this keeps the angle always positive, rather than switching to negatives for 180 - 360
  if (a < 0) {
    a = 180 + (180 + a);
  }
  return a;
};

/**
 * signed angular delta between two angles. Positive is clockwise.
 * @param start
 * @param end
 */
export const angularDelta = (firstAngle, secondAngle) => {
  let difference = secondAngle - firstAngle;
  while (difference < -180) difference += 360;
  while (difference > 180) difference -= 360;
  return difference;
};
