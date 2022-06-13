/**
 * make a stepped needle. Base is the given width but it steps down to half
 * that width at the tip. See the analog airspeed indicator for an example
 * of positioning.
 */
export const steppedNeedle = (
  snap, // snap/svg to use
  radius, // radius from pivot to tip
  radiusShort, // radius from pivot to short/blunt end of needle
  radiusMid, // radius where width changes
  arrowHead, // length of arrow heads
  width // widest width of needle
) => {
  let d = `M 0 0`;
  d += ` L ${radiusShort} 0`;
  d += `L ${radiusMid - arrowHead} 0`;
  d += `L ${radiusMid} ${width * 0.4}`;
  d += `L ${radius + radiusShort - arrowHead} ${width * 0.3}`;

  d += `L ${radius + radiusShort + arrowHead} ${width / 2}`;

  d += `L ${radius + radiusShort - arrowHead} ${width * 0.7}`;
  d += `L ${radiusMid} ${width * 0.7}`;
  d += `L ${radiusMid - arrowHead} ${width}`;
  d += ` L ${radiusShort} ${width}`;

  d += ` L 0 ${width} Z`;

  const needle = snap.path(d);
  needle.attr({
    fill: snap.gradient(`l(0, 0.5, 1, 0.5)#222:30-#fff:31-#fff`),
    stroke: snap.gradient(`l(0, 0.5, 1, 0.5)#444:30-#222:31-#222`),
    "stroke-width": 1
  });
  // return the needle shape and a closure for positioning and rotating it
  return {
    needle,
    setCenterAndAngle: (cx, cy, angle) => {
      needle.attr({
        transform: `t ${cx - radiusShort} ${cy -
          width / 2} r ${angle} ${radiusShort} ${width / 2}`
      });
    }
  };
};
/**
 * Like the stepped needle but with a triangle at the tip, used only for the
 * 10K needle on an altimeter
 */
export const altimeter10KNeedle = (
  snap, // snap/svg to use
  radius, // radius from pivot to tip
  radiusShort, // radius from pivot to short/blunt end of needle
  radiusMid, // radius where width changes
  arrowHead, // length of arrow heads
  triangleWidth // widest width of needle ( the triangle at the tip )
) => {
  // width of needle at the short end
  const baseWidth = triangleWidth * 0.25;
  const narrowWidth = baseWidth / 2;
  const CY = triangleWidth / 2;

  let d = `M 0 ${CY - baseWidth / 2}`;

  d += `L ${radiusMid - arrowHead} ${CY - baseWidth / 2}`;

  d += `L ${radiusMid} ${CY - narrowWidth / 2}`;

  d += `L ${radius + radiusShort - arrowHead * 1.5} ${CY - narrowWidth / 2}`;

  d += `L ${radius + radiusShort + arrowHead} 0`;
  d += `L ${radius + radiusShort + arrowHead} ${triangleWidth}`;

  d += `L ${radius + radiusShort - arrowHead * 1.5} ${CY + narrowWidth / 2}`;

  d += `L ${radiusMid} ${CY + narrowWidth / 2}`;

  d += `L ${radiusMid - arrowHead} ${CY + baseWidth / 2}`;

  d += `L 0 ${CY + baseWidth / 2} Z`;

  const needle = snap.path(d);
  needle.attr({
    fill: snap.gradient(`l(0, 0.5, 1, 0.5)#222:30-#fff:31-#fff`),
    stroke: snap.gradient(`l(0, 0.5, 1, 0.5)#444:30-#222:31-#222`),
    "stroke-width": 1
  });
  // return the needle shape and a closure for positioning and rotating it
  return {
    needle,
    setCenterAndAngle: (cx, cy, angle) => {
      needle.attr({
        transform: `t ${cx - radiusShort} ${cy -
          triangleWidth / 2} r ${angle} ${radiusShort} ${triangleWidth / 2}`
      });
    }
  };
};

/**
 * Simple arrow head needle, see the hundreds needle on the altimeter for an example
 */
export const arrowNeedle = (
  snap, // snap/svg to use
  radius, // radius from pivot to tip
  radiusShort, // radius from pivot to short/blunt end of needle
  arrowHead, // length of arrow heads
  width // widest width of needle
) => {
  let d = `M 0 0`;
  d += ` L ${radiusShort} 0`;
  d += `L ${radius + radiusShort - arrowHead} 0`;

  d += `L ${radius + radiusShort + arrowHead} ${width / 2}`;
  d += `L ${radius + radiusShort - arrowHead} ${width}`;

  d += ` L ${radiusShort} ${width}`;

  d += ` L 0 ${width} Z`;

  const needle = snap.path(d);
  needle.attr({
    fill: snap.gradient(`l(0, 0.5, 1, 0.5)#222:30-#fff:31-#fff`),
    stroke: snap.gradient(`l(0, 0.5, 1, 0.5)#444:30-#222:31-#222`),
    "stroke-width": 1
  });
  // return the needle shape and a closure for positioning and rotating it
  return {
    needle,
    setCenterAndAngle: (cx, cy, angle) => {
      needle.attr({
        transform: `t ${cx - radiusShort} ${cy -
          width / 2} r ${angle} ${radiusShort} ${width / 2}`
      });
    }
  };
};

/**
 * Dagger shaped needle e.g. the thousands needle of the altimeter
 */
export const daggerNeedle = (
  snap, // snap/svg to use
  radius, // radius from pivot to tip
  radiusShort, // radius from pivot to short/blunt end of needle
  arrowHead, // length of arrow heads
  width // widest width of needle
) => {
  // parameter width of dagger at narrowest point
  const narrow = 0.35;

  let d = `M 0 0`;
  d += ` L ${radiusShort} ${width * narrow}`;

  d += `L ${radius + radiusShort - arrowHead} 0`;

  d += `L ${radius + radiusShort + arrowHead} ${width / 2}`;
  d += `L ${radius + radiusShort - arrowHead} ${width}`;

  d += ` L ${radiusShort} ${width - width * narrow}`;

  d += ` L 0 ${width} Z`;

  const needle = snap.path(d);
  needle.attr({
    fill: snap.gradient(`l(0, 0.5, 1, 0.5)#222:40-#fff:41-#fff`),
    stroke: snap.gradient(`l(0, 0.5, 1, 0.5)#444:40-#222:41-#222`),
    "stroke-width": 1
  });
  // return the needle shape and a closure for positioning and rotating it
  return {
    needle,
    setCenterAndAngle: (cx, cy, angle) => {
      needle.attr({
        transform: `t ${cx - radiusShort} ${cy -
          width / 2} r ${angle} ${radiusShort} ${width / 2}`
      });
    }
  };
};
