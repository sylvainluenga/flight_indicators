import D from "DOMArray";
import Instrument from "./instrument";
import { POC, C2D } from "./geometry/angle";
import Vector2D from "./geometry/vector2d";
import {
  circle,
  centeredText,
  tick,
  rectangle,
  arc
} from "./graphics/primitives";
import { arrowNeedle } from "./needles";
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
const TICK2 = TICK1 - 25;
// inner radius of large ticks
const TICK3 = TICK1 - 40;

// green arc radius and thickness
const ARC_WIDTH = 20;
const ARC_RADIUS = TICK2 + ARC_WIDTH / 2;

// radius of  large digits marking hundreds of feet
const LABEL_RADIUS = TICK3 - 25;

// hundreds needle, other needles are derived from these
const POINTER_SMALL_RADIUS = 40;
const POINTER_WIDTH = 10;
const POINTER_ARROW = 6;
const POINTER_RADIUS = TICK2 - POINTER_ARROW;

// RPM limits and ranges
const MIN_RPM = 0;
const MAX_RPM = 3500;
const MIN_GREEN = 2100;
const MAX_GREEN = 2700;
const REDLINE = 2700;

// angle at low stop of tacometer and angle sweep to the
// max rpm point
const START_ANGLE = 145;
const ANGLE_SWEEP = 250;

// dimensions of individual hours window
const HOUR_W = 24;
const HOUR_H = 30;
const HOUR_P = 8;
const HOUR_Y = CY + 70;

export default class TachometerAnalog extends Instrument {
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
    this.renderText();
    this.renderHours();
    this.createNeedle();
    this.setNeedle(this.airplane.rpm);

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
        this.airplane.setRPM(MIN_RPM + (REDLINE - MIN_RPM) * Math.random());
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
    this.renderShadow();
  }

  /**
   * fixed text
   */
  renderText() {
    centeredText(this.snap, new Vector2D(CX, CY - 55), "RPM", "white", "24px");
    centeredText(
      this.snap,
      new Vector2D(CX, CY - 33),
      "X 100",
      "white",
      "14px"
    );
  }

  /**
   * fake hours windows
   */
  renderHours() {
    // five windows including 10ths
    const n = 5;
    const width = n * HOUR_W + (n - 1) * HOUR_P;
    const left = CX - width / 2;
    for (let i = 0; i < n; i += 1) {
      const x = left + i * (HOUR_W + HOUR_P);
      rectangle(
        this.snap,
        x,
        HOUR_Y,
        HOUR_W,
        HOUR_H,
        this.snap.gradient(`l(0, 0, 1, 1)#222:0-#666:100`),
        1,
        i === n - 1
          ? "whitesmoke"
          : this.snap.gradient(`l(0.5, 0, 0.5, 1)#000:0-#444:50-#000:100`),
        3,
        3
      );
      const position = new Vector2D(x + HOUR_W / 2, HOUR_Y + HOUR_H / 2);
      centeredText(
        this.snap,
        position,
        Math.floor(Math.random() * 10) % 10,
        i === n - 1 ? "black" : "white",
        "20px",
        "Verdana"
      );
    }
    centeredText(
      this.snap,
      new Vector2D(CX, HOUR_Y + HOUR_H + 12),
      "HOURS",
      "white",
      "14px",
      "Verdana"
    );
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
   * render tick marks around face and numbers for 100's of feet
   */
  renderDial() {
    // draw green arc under all ticks
    arc(
      this.snap,
      CENTER,
      ARC_RADIUS,
      ARC_WIDTH,
      0,
      "transparent",
      "#00EE00",
      this.rpmToAngle(MIN_GREEN),
      this.rpmToAngle(MAX_GREEN),
      true
    );
    // draw small/large ticks across entire RPM range
    for (let i = MIN_RPM; i <= MAX_RPM; i += 100) {
      // large or small
      if (i % 500 === 0) {
        tick(this.snap, CENTER, this.rpmToAngle(i), TICK1, TICK3, 5, "white");
        // draw RPM text and 500 intervals except and upper and lower limit
        if (i > MIN_RPM && i < MAX_RPM) {
          const position = POC(CENTER, LABEL_RADIUS, this.rpmToAngle(i));
          centeredText(
            this.snap,
            position,
            Math.floor(i / 100),
            "white",
            "34px",
            "Verdana"
          );
        }
      } else {
        tick(this.snap, CENTER, this.rpmToAngle(i), TICK1, TICK2, 3, "white");
      }
    }
    // draw redline
    tick(this.snap, CENTER, this.rpmToAngle(REDLINE), TICK1, TICK3, 7, "red");
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
  createNeedle() {
    this.needle = arrowNeedle(
      this.snap,
      POINTER_RADIUS,
      POINTER_SMALL_RADIUS,
      POINTER_ARROW,
      POINTER_WIDTH
    );
    circle(this.snap, CENTER, 4, "#888", 1, "black");
  }

  /**
   * update the needle
   * @param airspeed
   */
  setNeedle(rpm) {
    this.needle.setCenterAndAngle(CX, CY, this.rpmToAngle(rpm));
  }

  /**
   * convert an RPM to an angle
   * @param rpm
   */
  rpmToAngle(rpm) {
    // clamp to limits
    const v = Math.max(MIN_RPM, Math.min(MAX_RPM, rpm));
    // normalize
    const normalized = (v - MIN_RPM) / (MAX_RPM - MIN_RPM);
    // angle
    return (START_ANGLE + ANGLE_SWEEP * normalized) % 360;
  }

  /**
   * a property of the airplane was changed
   * @param airplane
   */
  onAirplaneChanged(airplane) {
    console.assert(airplane === this.airplane, "not our airplane");
    this.setNeedle(this.airplane.rpm);
  }
}

// Alex Sylvain Luenga