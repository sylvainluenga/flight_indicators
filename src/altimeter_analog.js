import D from "DOMArray";
import Instrument from "./instrument";
import Rotatable from "./rotatable-button";
import { POC, C2D } from "./geometry/angle";
import Vector2D from "./geometry/vector2d";
import {
  circle,
  centeredText,
  leftText,
  tick,
  arc,
  rectangle
} from "./graphics/primitives";
import { arrowNeedle, daggerNeedle, altimeter10KNeedle } from "./needles";
import { interval } from "./utils/time";
import { lerp } from "./utils/math";
import { colors } from "./graphics/colors";
import { inchesHgToFeet, STANDARD_BAROMETER } from "./utils/conversions";

import Snap from "snapsvg-cjs";

/**
 * Regardless of our DOM element size we will render using the constants below
 * and use a transform to scale the resulting SVG to the required size, without altering the aspect ratio
 */

// inset of edges of element
const I = 0;
// width and height
const W = 400;
const H = 400;
// outer radius
const R = (Math.min(W, H) - I) / 2;
// center
const CX = W / 2;
const CY = H / 2;
const CENTER = new Vector2D(CX, CY);

// thickness of outer three rings of case
const CASE1 = 8;
const CASE2 = 10;
const CASE3 = 14;

// outer radius of all tick marks
const TICK1 = R - (CASE1 + CASE2 + CASE3);
// inner radius of small ticks
const TICK2 = TICK1 - 15;
// inner radius of large ticks
const TICK3 = TICK1 - 20;

// radius of  large digits marking hundreds of feet
const LABEL_RADIUS = TICK3 - 20;

// hundreds needle, other needles are derived from these
const POINTER_SMALL_RADIUS = 40;
const POINTER_WIDTH = 10;
const POINTER_ARROW = 6;
const POINTER_RADIUS = TICK2 - POINTER_ARROW;

// thousands needle radius ratio to hundreds
const POINTER_1K_R = 0.5;
// thousands needle width ratio to hundreds needs
const POINTER_1K_W = 2.5;

// ten thousands needle radius ratio to hundreds
const POINTER_10K_R = 0.6;
// ten thousands needle width ratio to hundreds needs
const POINTER_10K_W = 2.5;

// degrees offset for 2 and 3 text
const KOLLSMAN_ADJUST_23 = 7;
// angle at center of window
const KOLLSMAN_ANGLE = 0;
// angle sweep
const KOLLSMAN_SWEEP = 270;
// min/max pressure settings
const MIN_BARO = 28.0;
const MAX_BARO = 31.0;

// outer radius of kollsman ticks
const K_TICK1 = TICK3 - 2;
const K_TICK2 = K_TICK1 - 5;
const K_TICK3 = K_TICK2 - 5;

// inner radius of kollsman window
const KOLLSMAN_INNER = K_TICK1 - 55;

// the kollsman window fits between then airspeeds
const KOLLSMAN_LOWER_SPEED = 210;
const KOLLSMAN_UPPER_SPEED = 290;

// below 10K barber pole
const BARBER_OUTER = KOLLSMAN_INNER;
const BARBER_INNER = BARBER_OUTER - 50;
const BARBER_ANGLE = 90;
const BARBER_SWEEP = 60;

// width of stripes
const BARBER_STRIPE_WIDTH = 8;

// center of BARO button
const BARO_CENTER = POC(CENTER, R, 135);
// radius of OBS
const BARO_R = 32;

export default class AltimeterAnalog extends Instrument {
  constructor(options) {
    super(
      Object.assign(
        {
          width: W,
          height: H
        },
        options
      )
    );

    console.assert(
      this.parentElement,
      "instrument requires a parent to attach to"
    );

    // the barber pole has zero rotation when fully visible or BARBAR_SWEEP + 1 rotation when hidden
    this.barberPoleAngle = 0;
    this.barberPoleVisible = true;

    this.template = D(`
      <svg r="svg" height="${W}" width="${H}" xmlns="http://www.w3.org/2000/svg"></svg>
    `);
    this.template.zip(this);
    this.snap = new Snap(this.svg.el);

    this.renderImmutable();
    this.createNeedles();
    this.createBaroButton();
    this.setNeedles(this.airplane.altitude);
    this.setBarometricPressure(this.airplane.barometer);

    // listen for changes to the airplane
    this.onAirplaneChanged = this.onAirplaneChanged.bind(this);
    this.airplane.addListener(this.onAirplaneChanged);
    this.addDisposable(() =>
      this.airplane.removeListener(this.onAirplaneChanged)
    );

    this.template.appendTo(this.parentElement);
  }

  /**
   * enter demonstration mode
   */
  demoStart() {
    this.addLerp(
      "demo",
      interval(() => {
        const altitude = this.airplane.SERVICE_CEILING * Math.random();
        const qnh = MIN_BARO + (MAX_BARO - MIN_BARO) * Math.random();
        this.airplane.setAltitude(altitude);
        this.airplane.setBarometer(qnh);
      }, 5000)
    );
  }

  /**
   * cancel demo mode
   */
  demoStop() {
    this.cancelLerp("demo");
  }

  /**
   * render the non changing parts of the instrument
   */
  renderImmutable() {
    this.renderCase();
    this.renderDial();
    this.renderKollsman();
    this.renderBarberPole();
    this.renderShadow();
  }

  /**
   * create the button for changing the Kollsman window setting.
   */
  createBaroButton() {
    this.baroButton = new Rotatable({
      snap: this.snap,
      radius: BARO_R,
      text: "BARO",
      textColor: colors.silver,
      gear: 0.0025,
      rotationCallback: this.onBaroChanged.bind(this)
    });
    this.baroButton.centerOn(new Vector2D(BARO_CENTER.x, BARO_CENTER.y));
  }

  /**
   * user twisted the baro button
   * @param delta
   */
  onBaroChanged(delta) {
    const baro = Math.max(
      MIN_BARO,
      Math.min(MAX_BARO, this.airplane.barometer + delta)
    );
    this.airplane.setBarometer(baro, true);
  }

  /**
   * render the shared three outer rings of the bezel
   */
  renderCase() {
    // draw three outer rings of the instrument case
    circle(
      this.snap,
      CENTER,
      R - CASE1 / 2,
      this.snap.gradient(`l(0, 0, 1, 1)#FFF:0-#888:20-#111:100`),
      CASE1,
      "black"
    );
    circle(
      this.snap,
      CENTER,
      R - (CASE1 + CASE2 / 2),
      this.snap.gradient(`l(0, 0, 1, 1)#111-#666`),
      CASE2,
      "black"
    );
    circle(
      this.snap,
      CENTER,
      R - (CASE1 + CASE2 + CASE3 / 2),
      this.snap.gradient(`l(0, 0, 1, 1)#000:0-#888:70-#FFF:100`),
      CASE3,
      this.snap.gradient("l(0, 0, 1, 1)#000:0-#222:100")
    );
  }

  /**
   * render the kollsman window
   */
  renderKollsman() {
    // calculations are lot easier and do not suffer from floating point errors
    // if we work with barometric pressure * 100 in integers
    const IMIN_BARO = (MIN_BARO * 100) >> 0;
    const IMAX_BARO = (MAX_BARO * 100) >> 0;

    // use a snap and group for all elements so it can be rotated
    this.kSnap = new Snap(W, H);
    this.snap.add(this.kSnap);
    this.kGroup = this.kSnap.group();

    const startAngle = KOLLSMAN_ANGLE - KOLLSMAN_SWEEP / 2;
    for (let i = IMIN_BARO; i <= IMAX_BARO; i += 2) {
      const normalized = (i - IMIN_BARO) / (IMAX_BARO - IMIN_BARO);
      const angle = startAngle + normalized * KOLLSMAN_SWEEP;
      if (i % 10 === 0) {
        const tp = POC(CENTER, KOLLSMAN_INNER, angle);
        const str = i.toString();
        // displayed text is one decimal place e.g. 30.40 -? "30.4" 29.90 -> "29.9"
        const strDisplay = `${str.substr(0, 2)}.${str.substr(2, 1)}`;
        const text = leftText(
          this.snap,
          tp,
          strDisplay,
          "white",
          "14px",
          "Verdana"
        );
        text.attr({ transform: `r${angle} ${tp.x} ${tp.y}` });
        this.kGroup.add(text);
        this.kGroup.add(
          tick(this.snap, CENTER, angle, K_TICK1, K_TICK3, 3, "white")
        );
      } else {
        this.kGroup.add(
          tick(this.snap, CENTER, angle, K_TICK1, K_TICK2, 2, "white")
        );
      }
    }
    // create a mask using an arc to give impression of a window
    const KW = K_TICK1 - KOLLSMAN_INNER;
    const AR = KOLLSMAN_INNER + KW / 2;
    this.kMask = arc(
      this.snap,
      CENTER,
      AR,
      KW,
      0,
      "white",
      "white",
      this.altitudeInfo(KOLLSMAN_LOWER_SPEED).hundreds,
      this.altitudeInfo(KOLLSMAN_UPPER_SPEED).hundreds,
      true
    );
    this.kGroup.attr({ mask: this.kMask });

    // draw outline and shadow over kollsman window
    arc(
      this.snap,
      CENTER,
      AR,
      KW,
      1,
      "#555",
      "none",
      this.altitudeInfo(KOLLSMAN_LOWER_SPEED).hundreds,
      this.altitudeInfo(KOLLSMAN_UPPER_SPEED).hundreds,
      true
    );

    // draw the indicator for the current barometric settings
    const p1 = POC(CENTER, TICK1, -1.5);
    const p2 = POC(CENTER, TICK1, +1.5);
    const p3 = POC(CENTER, K_TICK1, 0);
    const d = `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y} L ${p3.x} ${p3.y} Z`;
    this.snap.path(d).attr({ fill: "white" });
  }

  /**
   * set the barometric pressure to the given value, animating
   * the kollsman window to its new position.
   * @param inchesOfMercury
   */
  setBarometricPressure(inchesOfMercury) {
    // clamped the value to the allowed range
    const clamped = Math.max(MIN_BARO, Math.min(MAX_BARO, inchesOfMercury));
    // get the inches range
    const range = MAX_BARO - MIN_BARO;
    // get a normalized value 0 -> 1 representing the new value
    const normalized = (clamped - MIN_BARO) / range;
    // set rotational angle (zero angle is the mid point of the baromatric range)
    const a = KOLLSMAN_SWEEP / 2 - KOLLSMAN_SWEEP * normalized;
    this.kGroup.attr({
      transform: `r ${a} ${CENTER.x} ${CENTER.y}`
    });
    // rotate the mask in the opposite direction to keep it in place ( since it is masking
    // a group and will be rotated with the group )
    this.kMask.attr({
      transform: `r ${-a} ${CENTER.x} ${CENTER.y}`
    });
  }

  /**
   * render the below 10K barber pole
   */
  renderBarberPole() {
    const barberRadius = (BARBER_OUTER + BARBER_INNER) / 2;
    const barberWidth = BARBER_OUTER - BARBER_INNER;
    // background for the barber pole area ( attached to primary SVG )
    arc(
      this.snap,
      CENTER,
      barberRadius,
      barberWidth,
      0,
      "none",
      "#333",
      BARBER_ANGLE + BARBER_SWEEP / 2,
      BARBER_ANGLE - BARBER_SWEEP / 2,
      false
    );
    // stripped rotatable area is on a separate SVG
    this.barberSnap = new Snap(W, H);
    // use two rectangle sides by side for the stripes. Make them into a pattern to fill the arc with.
    const patternGroup = this.barberSnap.group();
    const sw = BARBER_STRIPE_WIDTH;
    const sh = 100;
    patternGroup.add(rectangle(this.snap, 0, 0, sw, sh, "none", 0, "#222"));
    patternGroup.add(rectangle(this.snap, sw, 0, sw, sh, "none", 0, "white"));

    this.barberPoleGroup = this.barberSnap.group();
    // the actual stripped arc
    this.barberPole = arc(
      this.barberSnap,
      CENTER,
      barberRadius,
      barberWidth,
      0,
      "none",
      patternGroup
        .toPattern(0, 0, sw * 2, sh)
        .attr({ transform: `r -45 ${sw} ${sh / 2}` }),
      BARBER_ANGLE + BARBER_SWEEP / 2,
      BARBER_ANGLE - BARBER_SWEEP / 2,
      false
    );
    // create an identically shaped mask for the pole arc
    const mask = arc(
      this.barberSnap,
      CENTER,
      barberRadius,
      barberWidth,
      0,
      "none",
      "white",
      BARBER_ANGLE + BARBER_SWEEP / 2,
      BARBER_ANGLE - BARBER_SWEEP / 2,
      false
    );
    this.barberPoleGroup.add(this.barberPole);
    this.barberPoleGroup.attr({ mask });
    // defaults to this.barberPoleAngle
    this.barberPole.attr({
      transform: `r ${this.barberPoleAngle} ${CENTER.x} ${CENTER.y}`
    });
    this.snap.add(this.barberSnap);
  }

  /**
   * show or hide the barber pole
   * @param visible
   */
  setBarberPole(visible) {
    if (this.barberPoleVisible !== visible) {
      const from = this.barberPoleAngle;
      const to = visible ? 0 : BARBER_SWEEP + 1;
      this.addLerp(
        "barber",
        lerp(from, to, 2000, (angle) => {
          this.barberPoleAngle = angle;
          this.barberPole.attr({
            transform: `r ${this.barberPoleAngle} ${CENTER.x} ${CENTER.y}`
          });
        })
      );
      this.barberPoleVisible = visible;
    }
  }

  /**
   * render tick marks around face and numbers for 100's of feet
   */
  renderDial() {
    // draw small / large ticks at 100 feet intervals. 10,000 feet are displayed.
    for (let i = 0; i < 1000; i += 20) {
      const hundreds = this.altitudeInfo(i).hundreds;
      if (i % 100 === 0) {
        // larger hundred foot tick
        tick(this.snap, CENTER, hundreds, TICK1, TICK3, 3, "white");
        // draw hundreds
        const v0_9 = Math.floor(i / 100);
        centeredText(
          this.snap,
          this.textPosition(v0_9),
          v0_9,
          "white",
          "40px",
          "Verdana"
        );
      } else {
        // smaller ticks for 20ft intervals
        tick(this.snap, CENTER, hundreds, TICK1, TICK2, 2, "white");
      }
    }
  }

  /**
   * return correct position for text on dial for a give hundereds of feet.
   * The position of the '2' and '3' are tweaked to accommodate the kollsman window
   * @param hundredsOfFeet
   */
  textPosition(n) {
    let d = C2D((360 / 10) * n);
    switch (n) {
      case 2:
        d -= KOLLSMAN_ADJUST_23;
        break;
      case 3:
        d += KOLLSMAN_ADJUST_23;
        break;
      default:
    }
    return POC(CENTER, LABEL_RADIUS, d);
  }

  /**
   * render an almost transparent gradient over the face to give the appearance of
   * shadow and depth
   */
  renderShadow() {
    // draw a radial gradient over the face to give a small hint of shadow from the case
    circle(
      this.snap,
      CENTER,
      R - (CASE1 + CASE2 + CASE3),
      "transparent",
      0,
      this.snap.gradient(`r(0.5, 0.5, 0.5)transparent:85-rgba(0,0,0,0.2)`)
    );
  }

  /**
   * create the hundreds pointer
   */
  createNeedles() {
    this.thousands10KNeedle = altimeter10KNeedle(
      this.snap,
      TICK1 - POINTER_ARROW - 1,
      POINTER_SMALL_RADIUS * POINTER_10K_R,
      TICK1 * 0.75,
      POINTER_ARROW,
      POINTER_WIDTH * POINTER_10K_W
    );

    this.thousandsNeedle = daggerNeedle(
      this.snap,
      POINTER_RADIUS * POINTER_1K_R,
      POINTER_SMALL_RADIUS * POINTER_1K_R,
      POINTER_ARROW * 2,
      POINTER_WIDTH * POINTER_1K_W
    );

    this.hundredsNeedle = arrowNeedle(
      this.snap,
      POINTER_RADIUS,
      POINTER_SMALL_RADIUS,
      POINTER_ARROW,
      POINTER_WIDTH
    );
    circle(this.snap, CENTER, 4, "#888", 1, "black");
  }

  /**
   * update the hundreds pointer
   * @param altitude
   */
  setNeedles(altitude) {
    const info = this.altitudeInfo(altitude);
    this.hundredsNeedle.setCenterAndAngle(CX, CY, info.hundreds);
    this.thousandsNeedle.setCenterAndAngle(CX, CY, info.thousands);
    this.thousands10KNeedle.setCenterAndAngle(CX, CY, info.thousands10K);
    this.setBarberPole(info.barberPoleVisible);
  }

  /**
   * for a given altitude returns the angles for the three pointers
   * and a boolean to indicate if the grid pattern should be visible
   * @param altitude
   * @returns {{hundreds: number, thousands: number, thousands10K: number, stripes: boolean}}
   */
  altitudeInfo(altitude) {
    //console.assert(altitude >= 0 && altitude <= this.airplane.SERVICE_CEILING, 'altitude out of range');

    // small needle is altitude % 1000
    const hundreds = C2D((altitude / 1000) * 360);
    const thousands = C2D((altitude / 10000) * 360);
    const thousands10K = C2D((altitude / 100000) * 360);
    const barberPoleVisible = altitude <= 10000;

    return {
      hundreds,
      thousands,
      thousands10K,
      barberPoleVisible
    };
  }

  /**
   * a property of the airplane was changed
   * @param airplane
   */
  onAirplaneChanged(airplane) {
    console.assert(airplane === this.airplane, "not our airplane");
    // get the delta between 29.92 ( standard pressure ) and the airplanes baro setting
    const baroDelta = STANDARD_BAROMETER - this.airplane.barometer;
    const altitude = inchesHgToFeet(airplane.staticPressure + baroDelta);
    this.setNeedles(altitude);
    this.setBarometricPressure(this.airplane.barometer);
  }
}
