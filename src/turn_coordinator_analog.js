import D from "DOMArray";
import Instrument from "./instrument";
import { POC, D2C } from "./geometry/angle";
import Vector2D from "./geometry/vector2d";
import {
  arc,
  tick,
  circle,
  airplaneNoseView,
  centeredText,
  leftText
} from "./graphics/primitives";
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

// thickness of outer bezel
const OUTER_BEZEL = 50;

// inner suface radius
const INNER_RADIUS = R - (CASE1 + CASE2 + CASE3 + OUTER_BEZEL);

// inclinomenter metrics
const INC_THICKNESS = 55;
const INC_RADIUS = R * 2;
const INC_CENTER = new Vector2D(CX, CY - INC_RADIUS + INC_THICKNESS * 1.5);
// number of degrees either side of 90 for the inclinometer arc
const INC_ANGLE = 16;
// angle offset for ticks on inclinometer
const INC_TICK_ANGLE = 3.5;

// offset angle of 2 minute turn ticks
const OFFSET_2_MINUTES = 20;

// standard roll rate and instrument limit in degrees per second
const ROLL_RATE = 3;
const MAX_ROLL_RATE = 6;

// max number of degrees of yaw ( negative is left yaw, positive is right yaw )
const MAX_YAW = 20;

export default class TurnCoordinatorAnalog extends Instrument {
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
    this.template.appendTo(this.parentElement);

    // listen for changes to the airplane
    this.onAirplaneChanged = this.onAirplaneChanged.bind(this);
    this.airplane.addListener(this.onAirplaneChanged);
    this.addDisposable(() =>
      this.airplane.removeListener(this.onAirplaneChanged)
    );
  }

  /**
   * enter demonstration mode
   */
  demoStart() {
    this.addLerp(
      "demo",
      interval(() => {
        this.airplane.setRollRate(
          -MAX_ROLL_RATE + MAX_ROLL_RATE * 2 * Math.random()
        );
        this.airplane.setYaw(-MAX_YAW + MAX_YAW * 2 * Math.random());
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
    this.renderInclinometer();
    this.renderTicksAndText();
    this.renderShadow();
    this.renderAirplane();
    this.setRollRate(this.airplane.rollRate);
    this.setYaw(this.airplane.yaw);
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
      "#222"
    );
  }

  /**
   * render ticks marks and associated text ( "L" "R" )
   */
  renderTicksAndText() {
    const BEZEL_R = R - (CASE1 + CASE2 + CASE3 + OUTER_BEZEL / 2);
    // inner bezel containing ticks marks
    circle(this.snap, CENTER, BEZEL_R, "#333", OUTER_BEZEL, "transparent");

    [0, OFFSET_2_MINUTES, 180, 180 - OFFSET_2_MINUTES].forEach((angle) => {
      tick(
        this.snap,
        CENTER,
        angle,
        BEZEL_R + OUTER_BEZEL / 8,
        BEZEL_R - OUTER_BEZEL / 2,
        10,
        "white"
      );
    });
    centeredText(
      this.snap,
      POC(CENTER, BEZEL_R + 10, 270),
      "D.C.",
      "white",
      "16px",
      "Verdana"
    );
    centeredText(
      this.snap,
      POC(CENTER, BEZEL_R - 8, 270),
      "ELECTRIC",
      "white",
      "16px",
      "Verdana"
    );

    centeredText(
      this.snap,
      POC(CENTER, BEZEL_R - 4, 180 - OFFSET_2_MINUTES * 1.7),
      "L",
      "white",
      "32px",
      "Verdana"
    );
    centeredText(
      this.snap,
      POC(CENTER, BEZEL_R - 4, OFFSET_2_MINUTES * 1.7),
      "R",
      "white",
      "30px",
      "Verdana"
    );

    centeredText(
      this.snap,
      POC(CENTER, BEZEL_R - 14, 90),
      "NO PITCH",
      "white",
      "16px",
      "Verdana"
    );
    centeredText(
      this.snap,
      POC(CENTER, BEZEL_R + 4, 90),
      "INFORMATION",
      "white",
      "16px",
      "Verdana"
    );

    centeredText(
      this.snap,
      POC(CENTER, 35, 90),
      "2 MIN",
      "white",
      "20px",
      "Verdana"
    );
  }

  /**
   * return the turn rate indicator which is an airplane symbol
   */
  renderAirplane() {
    this.airplaneGroup = airplaneNoseView(
      this.snap,
      CENTER,
      INNER_RADIUS * 2 - 8,
      "white"
    );
  }

  /**
   * render the inclinometer and keep a reference to the ball
   */
  renderInclinometer() {
    const inner = INC_RADIUS - INC_THICKNESS / 2;
    const middle = INC_RADIUS;
    const outer = INC_RADIUS + INC_THICKNESS / 2;
    arc(
      this.snap,
      INC_CENTER,
      INC_RADIUS,
      INC_THICKNESS,
      0,
      "transparent",
      this.snap.gradient(
        `R(${INC_CENTER.x}, ${INC_CENTER.y}, ${outer})black:0-#aaa:${
          (inner / outer) * 100
        }-#fff:${(middle / outer) * 100}-#aaa:100`
      ),
      90 - INC_ANGLE,
      90 + INC_ANGLE,
      true
    );
    // render the ball
    this.renderBall();
    // render the strokes that indicate the coordinated range
    tick(
      this.snap,
      INC_CENTER,
      90 - INC_TICK_ANGLE,
      INC_RADIUS - INC_THICKNESS / 2,
      INC_RADIUS + INC_THICKNESS / 2,
      5,
      this.snap.gradient(`l(0.5, 0, 0.5, 1)#000:0-#888:50-#000:100`)
    );
    tick(
      this.snap,
      INC_CENTER,
      90 + INC_TICK_ANGLE,
      INC_RADIUS - INC_THICKNESS / 2,
      INC_RADIUS + INC_THICKNESS / 2,
      5,
      this.snap.gradient(`l(0.5, 0, 0.5, 1)#000:0-#888:50-#000:100`)
    );
  }

  /**
   * The face of this instrument has two levels so two shadows to give the appearance of depth
   */
  renderShadow() {
    circle(
      this.snap,
      CENTER,
      R - (CASE1 + CASE2 + CASE3),
      "transparent",
      0,
      this.snap.gradient(`r(0.5, 0.5, 0.5)transparent:85-rgba(0,0,0,0.3)`)
    );

    circle(
      this.snap,
      CENTER,
      R - (CASE1 + CASE2 + CASE3 + OUTER_BEZEL),
      "transparent",
      0,
      this.snap.gradient(`r(0.5, 0.5, 0.5)transparent:85-rgba(0,0,0,0.3)`)
    );
  }

  /**
   * set the roll rate in +/- degrees per second
   * @param rollRate
   */
  setRollRate(rollRate) {
    // clamp between -MAX_ROLL_RATE and + MAX_ROLL_RATE
    const clampedRollRate = Math.max(
      -MAX_ROLL_RATE,
      Math.min(MAX_ROLL_RATE, rollRate)
    );
    // normalize 0..1
    const normalized = clampedRollRate / MAX_ROLL_RATE;
    const A = OFFSET_2_MINUTES * 2 * normalized;
    this.airplaneGroup.attr({ transform: `r${A} ${CENTER.x} ${CENTER.y}` });
  }

  /**
   * render ball component of inclinometer. Set this.ball to the SVG element for later animation
   */
  renderBall() {
    // calculate point on the inclinometer circumference
    const center = POC(INC_CENTER, INC_RADIUS, 90);
    // create circle
    this.ball = circle(
      this.snap,
      center,
      INC_THICKNESS / 2 - 4,
      "transparent",
      0,
      this.snap.gradient(`r(0.35, 0.35, 0.5)#aaa:0-black:100`)
    );
    // scale to give it the more typical oval appearance
    this.ball.attr({
      transform: "s0.8,1"
    });
  }

  /**
   * set yaw and update inclinometer
   * @param yaw
   */
  setYaw(yaw) {
    // clamp between -MAX_YAW and MAX_YAW
    const clampedYaw = Math.max(-MAX_YAW, Math.min(MAX_YAW, yaw));
    // normalize 0..1
    const normalized = clampedYaw / MAX_YAW;
    const A = INC_ANGLE * normalized;
    const center = POC(INC_CENTER, INC_RADIUS, 90 + A);
    this.ball.attr({
      cx: center.x,
      cy: center.y
    });
  }

  /**
   * a property of the airplane was changed
   * @param airplane
   */
  onAirplaneChanged(airplane) {
    console.assert(airplane === this.airplane, "not our airplane");
    this.setRollRate(this.airplane.rollRate);
    this.setYaw(this.airplane.yaw);
  }
}
