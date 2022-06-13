import { D2R, R2D, POC } from "../geometry/angle";
import D from "DOMArray";
import Vector2D from "../geometry/vector2d";

/**
 * create and return a SnapSVG circle object
 * @param snap
 * @param center
 * @param radius
 * @param stroke
 * @param strokeWidth
 * @param fill
 * @returns {*|SnapShape}
 */
export const circle = (
  snap,
  center,
  radius,
  stroke,
  strokeWidth,
  fill = "none"
) => {
  return snap.circle(center.x, center.y, radius).attr({
    strokeWidth,
    stroke,
    fill
  });
};

/**
 * create and return a SnapSVG circle object
 * @param snap
 * @param x
 * @param y
 * @param w
 * @param h
 * @param stroke
 * @param strokeWidth
 * @param fill
 * @param rx
 * @param ry
 * @returns {*|SnapShape}
 */
export const rectangle = (
  snap,
  x,
  y,
  w,
  h,
  stroke,
  strokeWidth,
  fill = "none",
  rx = 0,
  ry = 0
) => {
  return snap.rect(x, y, w, h).attr({
    strokeWidth,
    stroke,
    fill,
    rx,
    ry
  });
};

/**
 * create and return a Snap text element centered on a given point
 * @param snap
 * @param {Vector2D} center,
 * @param string
 * @param fill
 * @param fontSize
 * @param fontFamily
 * @param fontWeight
 */
export const centeredText = (
  snap,
  center,
  string,
  fill,
  fontSize = "21px",
  fontFamily = "Verdana",
  fontWeight = "normal"
) => {
  return snap.text(center.x, center.y, string.toString()).attr({
    fill,
    "text-anchor": "middle",
    "dominant-baseline": "central",
    "font-size": fontSize,
    "font-family": fontFamily,
    "font-weight": fontWeight
  });
};

/**
 * create and return a Snap text element centered on a given point
 * @param snap
 * @param {Vector2D} center,
 * @param string
 * @param fill
 * @param fontSize
 * @param fontFamily
 * @param fontWeight
 */
export const leftText = (
  snap,
  center,
  string,
  fill,
  fontSize = "21px",
  fontFamily = "Verdana",
  fontWeight = "normal"
) => {
  return snap.text(center.x, center.y, string).attr({
    fill,
    "text-anchor": "left",
    "dominant-baseline": "central",
    "font-size": fontSize,
    "font-family": fontFamily,
    "font-weight": fontWeight
  });
};

/**
 * a line shape
 * @param snap
 * @param {Vector2D} p1
 * @param {Vector2D} p2
 * @param stroke
 * @param strokeWidth
 */
export const line = (snap, p1, p2, stroke, strokeWidth) => {
  return snap.line(p1.x, p1.y, p2.x, p2.y).attr({
    strokeWidth,
    stroke
  });
};

/**
 * draw stroke filled triangle defined by 3 points
 * @param snap
 * @param p1
 * @param p2
 * @param p3
 * @param stroke
 * @param strokeWidth
 * @param fill
 */
export const triangle = (snap, p1, p2, p3, stroke, strokeWidth, fill) => {
  const d = `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y} L ${p3.x} ${p3.y} Z`;
  const path = snap.path(d);
  path.attr({
    fill,
    stroke,
    "stroke-width": strokeWidth
  });
  return path;
};

/**
 * draw stroke filled polygon defined by n points ( where 3 <= n )
 * @param snap
 * @param p
 * @param stroke
 * @param strokeWidth
 * @param fill
 */
export const polygon = (snap, p, stroke, strokeWidth, fill) => {
  let d = `M ${p[0].x} ${p[0].y}`;
  for (let i = 1; i < p.length; i += 1) {
    d += ` L ${p[i].x} ${p[i].y}`;
  }
  d += " Z";
  const path = snap.path(d);
  path.attr({
    fill,
    stroke,
    "stroke-width": strokeWidth
  });
  return path;
};

/**
 * draw a tick mark radiating from a center of a circle at a given starting
 * and ending radius e.g. denoting an airspeed on an airspeed indicator
 * @param snap
 * @param center
 * @param angle - degrees
 * @param outerRadius
 * @param innerRadius
 * @param thickness
 * @param color
 */
export const tick = (
  snap,
  center,
  angle,
  outerRadius,
  innerRadius,
  thickness,
  color
) => {
  const p1 = POC(center, outerRadius, angle);
  const p2 = POC(center, innerRadius, angle);
  return line(snap, p1, p2, color, thickness);
};

/**
 *
 * @param snap
 * @param {Vector2D} center
 * @param radius
 * @param thickness
 * @param strokeWidth
 * @param stroke
 * @param fill
 * @param startAngle
 * @param endAngle
 * @param clockWise
 */
export const arc = (
  snap,
  center,
  radius,
  thickness,
  strokeWidth,
  stroke,
  fill,
  startAngle,
  endAngle,
  clockWise
) => {
  // return 1 if large arc required for the given start/end angle
  // and the given direction of turn ( clockwise or counter )
  const largeArc = (start, end, cw) => {
    const delta = R2D(
      Math.atan2(Math.sin(D2R(end - start)), Math.cos(D2R(end - start)))
    );
    if (cw) {
      return delta <= 180 && delta >= 0 ? 0 : 1;
    }
    return delta <= 180 && delta >= 0 ? 1 : 0;
  };

  const arcData = (a1, a2, r, cw) => {
    let d = " A " + r + " " + r; // arc command and x/y radius of circle
    d += " 0"; // x axis rotation
    const large = largeArc(a1, a2, cw);
    d += " " + large; // large arc flag
    d += cw ? " 1" : " 0"; // sweep
    d += " " + POC(center, r, a2).x + " " + POC(center, r, a2).y; // end point
    return d;
  };

  // calculate inner and outer radius
  const r0 = radius + thickness / 2;
  const r1 = radius - thickness / 2;

  // move to start of arc on
  let d =
    "M " + POC(center, r0, startAngle).x + " " + POC(center, r0, startAngle).y;

  // add arc data, outer edge from tail to start of arrow
  d += " " + arcData(startAngle, endAngle, r0, clockWise);

  // to inside of arc
  d += " L " + POC(center, r1, endAngle).x + " " + POC(center, r1, endAngle).y;

  // arc back to tail, in opposite direction
  d += " " + arcData(endAngle, startAngle, r1, !clockWise);

  // close the path
  d += " Z";

  const path = snap.path(d);
  path.attr({
    fill,
    stroke,
    "stroke-width": strokeWidth
  });
  return path;
};

/**
 * draw a simple cessna shape within a rectangle of given size. Used for example at the center of
 * the heading indicator / directional gyro
 * @param r
 * @param strokeWidth
 * @param stroke
 * @param fill
 */
export const airplaneSilhouette = (
  centerX,
  centerY,
  width,
  height,
  strokeWidth,
  stroke,
  fill
) => {
  const s = `
  <svg 
      xmlns="http://www.w3.org/2000/svg" 
      version="1.1"  
      x="${centerX - width / 2}"
      y="${centerY - height / 2}"
      width="${width}" height="${height}" 
      viewBox="0 0 432.243 432.243"
  >
      <path 
          d="M396.132,225.557l-29.051-16.144v-13.14c0-8.836-7.164-16-16-16c-7.342,0-13.515,4.952-15.396,11.693l-24.446-13.585    v-12.108c0-8.836-7.164-16-16-16c-7.021,0-12.968,4.526-15.125,10.813l-21.689-12.053c-1.607-31.051-4.521-59.535-8.582-83.175    c-3.221-18.753-7.029-33.617-11.318-44.179C236.346,16.317,229.72,0,216.123,0c-13.598,0-20.224,16.317-22.402,21.679    c-4.289,10.562-8.097,25.426-11.318,44.179c-4.06,23.64-6.975,52.124-8.582,83.175l-21.69,12.053    c-2.157-6.287-8.106-10.813-15.124-10.813c-8.837,0-16,7.164-16,16v12.108l-24.448,13.585    c-1.882-6.742-8.055-11.693-15.396-11.693c-8.837,0-16,7.164-16,16v13.14L36.11,225.557c-3.174,1.766-5.143,5.11-5.143,8.741    v41.718c0,3.237,1.568,6.275,4.208,8.151s6.024,2.356,9.083,1.291l128.616-44.829c1.189,40.082,4.47,77.047,9.528,106.496    c0.917,5.342,1.884,10.357,2.895,15.059l-66.969,37.215c-1.725,0.958-2.794,2.774-2.794,4.749v22.661    c0,1.761,0.852,3.41,2.286,4.431c1.434,1.018,3.272,1.278,4.935,0.701l78.279-27.284c3.598,4.531,8.53,8.329,15.088,8.329    c6.558,0,11.49-3.798,15.087-8.329l78.279,27.284c0.584,0.201,1.188,0.303,1.788,0.303c1.113,0,2.216-0.342,3.146-1.004    c1.434-1.021,2.285-2.669,2.285-4.431v-22.662c0-1.974-1.068-3.791-2.793-4.748l-66.969-37.215c1.01-4.7,1.977-9.715,2.895-15.059    c5.059-29.447,8.339-66.414,9.527-106.496l128.617,44.829c1.071,0.374,2.184,0.558,3.29,0.558c2.05,0,4.078-0.631,5.791-1.849    c2.642-1.875,4.209-4.914,4.209-8.151v-41.718C401.275,230.667,399.308,227.321,396.132,225.557z" 
          fill="${fill}" stroke-width="${strokeWidth}" stroke="${stroke}"
      />
  </svg>`;
  return new Snap(D(s).el);
};

/**
 * simple nose on view e.g. at the center of a heading indicator
 * @param centerX
 * @param centerY
 * @param width
 * @param fill
 */
export const airplaneNoseView = (snap, center, width, fill) => {
  // prop radius and empennage size are derived from width
  const PR = width / 11;
  const EMT = width / 35;
  const EMS = width / 3;
  const WH = width / 25;

  // prop
  circle(snap, center, PR, 0, "transparent", fill);

  // wing
  const wing = rectangle(
    snap,
    center.x - width / 2,
    center.y - WH / 2,
    width,
    WH,
    "transparent",
    0,
    fill,
    3,
    3
  );

  // vertical stabilizer
  const vs = rectangle(
    snap,
    center.x - EMT / 2,
    center.y - EMS + PR * 1.5,
    EMT,
    EMS / 2,
    "transparent",
    0,
    fill,
    3,
    3
  );

  // horizontal stabilizer
  const hs = rectangle(
    snap,
    center.x - EMS / 2,
    center.y - PR,
    EMS,
    EMT,
    "transparent",
    0,
    fill,
    3,
    3
  );

  return snap.g(wing, vs, hs);
};
