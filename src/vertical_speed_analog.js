import D from "DOMArray";
import Instrument from "./instrument";
import { POC, C2D } from "./geometry/angle";
import Vector2D from "./geometry/vector2d";
import {
  circle,
  centeredText,
  leftText,
  tick,
  arc
} from "./graphics/primitives";
import { steppedNeedle } from "./needles";
import { interval } from "./utils/time";

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
const TICK2 = TICK1 - 20;
// inner radius of large ticks
const TICK3 = TICK1 - 30;

// radius of  large digits marking hundreds of feet
const LABEL_RADIUS = TICK3 - 25;

// max positive and negative rates displayed
const MIN_MAX_SPEED = 2000;

// only large ticks above this level
const HUNDRED_LIMIT = 1000;

// angle of zero speed
const ZERO = 180;

// sweep required for entire range
const SWEEP = 170;

// hundreds needle, other needles are derived from these
const POINTER_SMALL_RADIUS = 40;
const POINTER_WIDTH = 14;
const POINTER_ARROW = 6;
const POINTER_RADIUS = TICK2 - POINTER_ARROW;
const POINTER_MID = POINTER_RADIUS * 0.8;

// radius and offset angle for "UP" and "DN"
const UP_DOWN_RADIUS = LABEL_RADIUS - 25;
const UP_DOWN_ANGLE = 15;

// position of left aligned rate text
const RATE_TEXT = CX + 10;

export default class VerticalSpeedAnalog extends Instrument {
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

    this.template = D(`
      <svg r="svg" height="${W}" width="${H}" xmlns="http://www.w3.org/2000/svg"></svg>
    `);
    this.template.zip(this);
    this.snap = new Snap(this.svg.el);

    this.renderImmutable();
    this.createNeedles();
    this.setNeedle(this.airplane.altitudeRate);

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
        this.airplane.setAltitudeRate(-1500 + 3000 * Math.random());
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
    this.renderText();
    this.renderShadow();
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
   * convert positive or negative vertical speed to an angle.
   * @param verticalSpeed
   */
  verticalSpeedToAngle(verticalSpeed) {
    // clamp to limits
    const v = Math.max(-MIN_MAX_SPEED, Math.min(MIN_MAX_SPEED, verticalSpeed));
    if (v >= 0) {
      return ZERO + (v / MIN_MAX_SPEED) * SWEEP;
    }
    return ZERO - (-v / MIN_MAX_SPEED) * SWEEP;
  }

  // render up/down vertical speed in 100
  renderText() {
    let position = POC(CENTER, UP_DOWN_RADIUS, ZERO + UP_DOWN_ANGLE);
    centeredText(this.snap, position, "UP", "white", "16px", "Verdana");
    position = POC(CENTER, UP_DOWN_RADIUS, ZERO - UP_DOWN_ANGLE);
    centeredText(this.snap, position, "DN", "white", "16px", "Verdana");

    leftText(
      this.snap,
      new Vector2D(RATE_TEXT, CY - 50),
      "VERTICAL",
      "white",
      "16px",
      "Verdana"
    );
    leftText(
      this.snap,
      new Vector2D(RATE_TEXT, CY - 30),
      "SPEED",
      "white",
      "16px",
      "Verdana"
    );
    leftText(
      this.snap,
      new Vector2D(RATE_TEXT, CY + 30),
      "100 FEET",
      "white",
      "16px",
      "Verdana"
    );
    leftText(
      this.snap,
      new Vector2D(RATE_TEXT, CY + 50),
      "PER MINUTE",
      "white",
      "16px",
      "Verdana"
    );
  }

  /**
   * render tick marks around face and numbers for 100's of feet
   */
  renderDial() {
    for (let i = 0; i <= MIN_MAX_SPEED; i += 100) {
      // draw large ticks at 500ft intervals
      if (i % 500 === 0) {
        tick(
          this.snap,
          CENTER,
          this.verticalSpeedToAngle(i),
          TICK1,
          TICK3,
          3,
          "white"
        );
        if (i > 0) {
          tick(
            this.snap,
            CENTER,
            this.verticalSpeedToAngle(-i),
            TICK1,
            TICK3,
            3,
            "white"
          );
        }
        // draw 500 intervals in 100's of feet, except for the last value which is centered between the extremes
        let position;
        if (i < MIN_MAX_SPEED) {
          if (i === 0) {
            position = POC(CENTER, LABEL_RADIUS, ZERO);
            centeredText(this.snap, position, "0", "white", "30px", "Verdana");
          } else {
            position = POC(CENTER, LABEL_RADIUS, this.verticalSpeedToAngle(i));
            centeredText(
              this.snap,
              position,
              i / 100,
              "white",
              "30px",
              "Verdana"
            );
            position = POC(CENTER, LABEL_RADIUS, this.verticalSpeedToAngle(-i));
            centeredText(
              this.snap,
              position,
              i / 100,
              "white",
              "30px",
              "Verdana"
            );
          }
        } else {
          position = POC(CENTER, LABEL_RADIUS, ZERO + 180);
          centeredText(
            this.snap,
            position,
            i / 100,
            "white",
            "30px",
            "Verdana"
          );
        }
      } else {
        if (i < HUNDRED_LIMIT) {
          tick(
            this.snap,
            CENTER,
            this.verticalSpeedToAngle(i),
            TICK1,
            TICK2,
            2,
            "white"
          );
          tick(
            this.snap,
            CENTER,
            this.verticalSpeedToAngle(-i),
            TICK1,
            TICK2,
            2,
            "white"
          );
        }
      }
    }
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
      this.snap.gradient(`r(0.5, 0.5, 0.5)transparent:85-rgba(0,0,0,0.6)`)
    );
  }

  /**
   * create the needle and center nut
   */
  createNeedles() {
    this.needle = steppedNeedle(
      this.snap,
      POINTER_RADIUS,
      POINTER_SMALL_RADIUS,
      POINTER_MID,
      POINTER_ARROW,
      POINTER_WIDTH
    );
    circle(this.snap, CENTER, 4, "#888", 1, "black");
  }

  /**
   * update the hundreds pointer
   * @param airspeed
   */
  setNeedle(verticalSpeed) {
    this.needle.setCenterAndAngle(
      CX,
      CY,
      this.verticalSpeedToAngle(verticalSpeed)
    );
  }

  /**
   * a property of the airplane was changed
   * @param airplane
   */
  onAirplaneChanged(airplane) {
    console.assert(airplane === this.airplane, "not our airplane");
    this.setNeedle(this.airplane.altitudeRate);
  }
}
