import D from "DOMArray";
import Instrument from "./instrument";
import { nonLinearScale } from "./utils/math";
import { POC, C2D } from "./geometry/angle";
import Vector2D from "./geometry/vector2d";
import { circle, centeredText, tick, arc } from "./graphics/primitives";
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
const TICK2 = TICK1 - 40;
// inner radius of large ticks
const TICK3 = TICK1 - 50;
// radius of center of airspeed labels
const LABEL_RADIUS = TICK3 - 26;

// width of range arcs
const ARC_WIDTH = 22;

// width of range arcs
const FLAP_ARC_WIDTH = 18;

// radius of white arc
const WHITE_ARC_RADIUS = TICK3 + ARC_WIDTH * 2 - ARC_WIDTH / 2 - 1;
// green / yellow arcs
const ARC_RADIUS = TICK3 + ARC_WIDTH / 2;

// max airspeed angle on face
const MAX_SPEED_ANGLE = 320;
// airspeed at 6 o'clock
const MID_SPEED = 115;

const POINTER_SMALL_RADIUS = 40;
const POINTER_WIDTH = 14;
const POINTER_ARROW = 6;
const POINTER_RADIUS = WHITE_ARC_RADIUS + FLAP_ARC_WIDTH / 2 - POINTER_ARROW;
const POINTER_MID = POINTER_RADIUS * 0.65;

export default class AirspeedAnalog extends Instrument {
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

    // figure out the airspeed closest to 12 o'clock. This is our minimum displayable speed
    this.minimumDisplayableSpeed = 0;
    let nearest = Number.MAX_VALUE;
    for (let i = this.airplane.VS0; i >= 0; i -= 0.2) {
      const angle = this.airspeedToAngle(i);
      if (Math.abs(angle - 270) < nearest) {
        this.minimumDisplayableSpeed = i;
        nearest = Math.abs(angle - 270);
      }
    }

    // initial render of instrument
    this.renderImmutable();
    this.createNeedle();

    // set needle to default display position
    this.setNeedle(this.airplane.airspeed);

    // listen for changes to the airplane
    this.onAirplaneChanged = this.onAirplaneChanged.bind(this);
    this.airplane.addListener(this.onAirplaneChanged);
    this.addDisposable(() =>
      this.airplane.removeListener(this.onAirplaneChanged)
    );

    this.template.appendTo(this.parentElement);
    this.addDisposable(() => this.template.remove());
  }

  /**
   * enter demonstration mode
   */
  demoStart() {
    this.addLerp(
      "demo",
      interval(() => {
        const speed =
          this.airplane.VS0 +
          (this.airplane.VNE - this.airplane.VS0) * Math.random();
        this.airplane.setAirspeed(speed);
      }, 2000)
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
    this.renderSpeedArcs();
    this.renderText();
    this.renderTicks();
    this.renderAirspeeds();
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
   * render the three speed arcs ( white, green, yellow )
   */
  renderSpeedArcs() {
    // draw the flap (white) normal ( green ) and caution ( yellow ) speed arcs
    arc(
      this.snap,
      CENTER,
      WHITE_ARC_RADIUS,
      ARC_WIDTH,
      0,
      "white",
      "white",
      this.airspeedToAngle(this.airplane.VS0),
      this.airspeedToAngle(this.airplane.VFE),
      true
    );

    arc(
      this.snap,
      CENTER,
      ARC_RADIUS,
      ARC_WIDTH,
      0,
      "transparent",
      "#00EE00",
      this.airspeedToAngle(this.airplane.VS1),
      this.airspeedToAngle(this.airplane.VNO),
      true
    );

    arc(
      this.snap,
      CENTER,
      ARC_RADIUS,
      ARC_WIDTH,
      0,
      "transparent",
      "#FFDC00",
      this.airspeedToAngle(this.airplane.VNO),
      this.airspeedToAngle(this.airplane.VNE),
      true
    );
  }

  /**
   * render static text, KNOTS and AIR SPEED
   */
  renderText() {
    // draw airspeeds and knots labels
    centeredText(
      this.snap,
      new Vector2D(CX, CY + 50),
      "KNOTS",
      "white",
      "16px"
    );
    centeredText(this.snap, new Vector2D(CX, 70), "AIR", "white", "16px");
    centeredText(this.snap, new Vector2D(CX, 90), "SPEED", "white", "16px");
  }

  /**
   * render the knots ( KIAS ) tick marks around the outside of the face.
   */
  renderTicks() {
    // draw VS0 to MAX_SPEED in 10 knot intervals
    for (
      let i = this.airplane.VS0;
      i <= this.airplane.MAX_DISPLAYED_SPEED;
      i += 10
    ) {
      tick(
        this.snap,
        CENTER,
        this.airspeedToAngle(i),
        TICK1,
        TICK3,
        4,
        "white"
      );
    }

    // small ticks at 5 knot intervals
    for (
      let i = this.airplane.VS0 + 5;
      i <= this.airplane.MAX_DISPLAYED_SPEED - 5;
      i += 10
    ) {
      tick(
        this.snap,
        CENTER,
        this.airspeedToAngle(i),
        TICK1,
        TICK2,
        2,
        "white"
      );
    }

    // draw VNE tick mark
    tick(
      this.snap,
      CENTER,
      this.airspeedToAngle(this.airplane.VNE),
      TICK1,
      TICK3,
      7,
      "red"
    );
  }

  /**
   * rendered the numbers airspeeds
   */
  renderAirspeeds() {
    // draw airspeed labels 40, 60, ... 200 in intervals of 20
    for (
      let i = this.airplane.VS0;
      i <= this.airplane.MAX_DISPLAYED_SPEED;
      i += 20
    ) {
      const position = POC(CENTER, LABEL_RADIUS, this.airspeedToAngle(i));
      centeredText(this.snap, position, i, "white", "24px", "Verdana", "bold");
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
   * create the needle shape
   */
  createNeedle() {
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
   * immediately set the needle to the given airspeed
   * @param airspeed
   */
  setNeedle(airspeed) {
    const angle = this.airspeedToAngle(
      Math.max(this.minimumDisplayableSpeed, airspeed)
    );
    this.needle.setCenterAndAngle(CX, CY, angle);
  }

  /**
   * convert the given airspeed ( KIAS ) into an angle in degrees.
   * @param airspeed
   * @returns {number}
   */
  airspeedToAngle(airspeed) {
    console.assert(
      airspeed >= 0 && airspeed <= this.airplane.MAX_DISPLAYED_SPEED,
      "airspeed out of range"
    );
    // convert airspeed to 0..1
    const normalized = airspeed / this.airplane.MAX_DISPLAYED_SPEED;
    // get non linear value 0..MAX_SPEED
    const nonLinear = nonLinearScale(
      normalized,
      MID_SPEED,
      this.airplane.MAX_DISPLAYED_SPEED
    );
    // zero airspeed is actually starts at MAX_SPEED and goes clockwise
    const circle = 360 * (nonLinear / this.airplane.MAX_DISPLAYED_SPEED);
    return C2D((MAX_SPEED_ANGLE + circle) % 360);
  }

  /**
   * a property of the airplane was changed
   * @param airplane
   */
  onAirplaneChanged(airplane) {
    console.assert(airplane === this.airplane, "not our airplane");
    this.setNeedle(this.airplane.airspeed);
  }
}
