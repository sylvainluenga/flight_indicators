import D from "DOMArray";
import Instrument from "./instrument";
import Rotatable from "./rotatable-button";
import { POC, D2C, D2R } from "./geometry/angle";
import Vector2D from "./geometry/vector2d";
import {
  centeredText,
  tick,
  line,
  circle,
  rectangle,
  triangle,
  arc
} from "./graphics/primitives";
import { interval } from "./utils/time";
import { colors } from "./graphics/colors";
import { lerp } from "./utils/math";
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

// color of sky and earth
const COLOR_SKY = colors.sky;
const COLOR_EARTH = colors.earth;

// radius/thickness of outer bezel
const OUTER_THICKNESS = 40;
const OUTER_RADIUS = R - (CASE1 + CASE2 + CASE3 + OUTER_THICKNESS / 2);
// radius of inner bezel
const INNER_RADIUS = R - (CASE1 + CASE2 + CASE3 + OUTER_THICKNESS);
// determines length of pitch tick marks
const TICK_M = 4;
// width of small ( 5 increment ) tick marks
const SMALL_TICK_WIDTH = 25;
// on the pitch axis this is the ratio between degrees of pitch and pixels the face will move up or down
const PITCH_TO_PIXELS = 3.2;
// pointer base metrics
const POINTER_BASE_THICKNESS = W / 4;
const POINTER_BASE_ARC = 40;
// pointer arm THICKNESS
const PA_T = 8;
const PA_BH = W / 2 - 40;
const PA_BI = CASE1;
const PA_ARM = W / 6;
const PA_TRI_W = 30;
const PA_TRI_H = 32;
const PA_TRI_R = R - (CASE1 + CASE2 + CASE3 + OUTER_THICKNESS);

// vertical adjustment button
const V_ADJUST_CENTER = POC(CENTER, OUTER_RADIUS, 90);
// vertical adjustment is limited to this number of pixels +/- of center
const V_ADJUST_LIMIT = PITCH_TO_PIXELS * 5;

// cage button
const CAGE_CENTER = POC(CENTER, R, 45);

export default class AttitudeIndicatorAnalog extends Instrument {
  constructor(options) {
    super(
      Object.assign(
        {
          width: W,
          height: H,
          // deflection, +/- between the vertical adjustment limits
          verticalAdjustment: 0,
          // if true the attitude is caged
          caged: false,
          // used to damp pitch and roll when caged ( by setting to zero )
          cageMultiplier: 1
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

    this.pitch = this.roll = 0;
    this.renderImmutable();
    this.setRollAndPitch(this.airplane.roll, this.airplane.pitch);
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
        this.airplane.setRoll(-45 + 90 * Math.random());
        this.airplane.setPitch(-20 + 40 * Math.random());
      }, 3000)
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
    this.renderInnerBezel();
    this.renderOuterBezel();
    this.renderShadow();
    this.renderPointers();
    this.renderButtons();
  }

  /**
   * create the vertical adjustment button and CAGE buttons
   */
  renderButtons() {
    // v adjust button
    this.verticalAdjustButton = new Rotatable({
      snap: this.snap,
      text: "↕",
      fontSize: "32px",
      textColor: colors.silver,
      gear: 0.05,
      randomize: false,
      rotationCallback: this.onVerticalAdjustment.bind(this)
    });
    this.verticalAdjustButton.centerOn(V_ADJUST_CENTER);

    // cage button, PULL ( click ) to enter caged mode
    this.cageButton = new Rotatable({
      snap: this.snap,
      text: "CAGE",
      textColor: colors.silver,
      gear: 1,
      clickCallback: this.onCageToggle.bind(this),
      randomize: false,
      popout: true
    });
    this.cageButton.centerOn(CAGE_CENTER);
  }

  /**
   * vertical adjustment button was twisted
   * @param delta
   */
  onVerticalAdjustment(delta) {
    const v = Math.max(
      -V_ADJUST_LIMIT,
      Math.min(V_ADJUST_LIMIT, this.verticalAdjustment + delta)
    );
    this.setArmGroupVerticalAdjustment(v);
  }

  /**
   * toggle cage mode
   */
  onCageToggle() {
    this.caged = !this.caged;
    const from = this.cageMultiplier;
    const to = this.caged ? 0 : 1;
    this.addLerp(
      "caged",
      lerp(from, to, 2000, (v) => {
        this.cageMultiplier = v;
        this.setRollAndPitch(this.airplane.roll, this.airplane.pitch);
      })
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
   * render airplane pointer and level indicator ( arrow at top )
   */
  renderPointers() {
    // group all the arms parts together so they can be vertically adjusted
    this.armGroup = this.snap.group();

    // draw vertical line from base to below the ball
    const bottom = H - PA_BI;
    const top = bottom - PA_BH;
    this.armGroup.add(
      rectangle(
        this.snap,
        CX - PA_T / 2,
        top,
        PA_T,
        bottom - top - V_ADJUST_LIMIT,
        "transparent",
        0,
        colors.orange,
        PA_T / 2,
        PA_T / 2
      )
    );
    // horizontal central arm
    const left = CX - PA_ARM / 2;
    const right = CX + PA_ARM / 2;
    this.armGroup.add(
      rectangle(
        this.snap,
        left,
        top,
        right - left,
        PA_T,
        "transparent",
        0,
        colors.orange,
        PA_T / 2,
        PA_T / 2
      )
    );
    // two vertical wing supports
    const WY = CY - PA_T / 2;
    this.armGroup.add(
      rectangle(
        this.snap,
        left,
        WY,
        PA_T,
        top - WY + PA_T,
        "transparent",
        0,
        colors.orange,
        PA_T / 2,
        PA_T / 2
      )
    );
    this.armGroup.add(
      rectangle(
        this.snap,
        right - PA_T,
        WY,
        PA_T,
        top - WY + PA_T,
        "transparent",
        0,
        colors.orange,
        PA_T / 2,
        PA_T / 2
      )
    );
    // two wings
    this.armGroup.add(
      rectangle(
        this.snap,
        left - PA_ARM + PA_T,
        WY,
        PA_ARM,
        PA_T,
        "transparent",
        0,
        colors.orange,
        PA_T / 2,
        PA_T / 2
      )
    );
    this.armGroup.add(
      rectangle(
        this.snap,
        right - PA_T,
        WY,
        PA_ARM,
        PA_T,
        "transparent",
        0,
        colors.orange,
        PA_T / 2,
        PA_T / 2
      )
    );
    // aiming ball
    this.armGroup.add(
      circle(this.snap, CENTER, PA_T / 1.5, "transparent", 0, colors.orange)
    );

    // draw base for pointer
    arc(
      this.snap,
      CENTER,
      R - CASE1 - POINTER_BASE_THICKNESS / 2,
      POINTER_BASE_THICKNESS,
      1,
      "#111",
      "#333",
      90 - POINTER_BASE_ARC / 2,
      90 + POINTER_BASE_ARC / 2,
      true
    );
    // draw triangle pointer at 12 o'clock
    const p1 = POC(CENTER, PA_TRI_R, 270);
    const p2 = new Vector2D(p1.x - PA_TRI_W / 2, p1.y + PA_TRI_H);
    const p3 = new Vector2D(p1.x + PA_TRI_W / 2, p1.y + PA_TRI_H);

    triangle(this.snap, p1, p2, p3, "transparent", 0, colors.orange);
  }

  /**
   * set the vertical adjustment +/- pixels from center
   * @param pixels
   */
  setArmGroupVerticalAdjustment(pixels) {
    this.verticalAdjustment = pixels;
    console.log(this.verticalAdjustment);
    this.armGroup.attr({
      transform: `t 0 ${this.verticalAdjustment}`
    });
  }

  /**
   * render inner bezel with tick marks
   */
  renderInnerBezel() {
    this.innerBezel = new Snap(W, H);
    this.innerBezelFace = this.innerBezel.group();

    // the actual face is circle that is rotated by not moved. The gradient is adjust
    // to give the pitch indication
    this.pitchCircle = circle(
      this.snap,
      CENTER,
      INNER_RADIUS,
      "transparent",
      0,
      this.pitchGradient()
    );

    // add pitch up marks at 5, 10, 15, 20 degrees, intervals of 10 are large ticks
    [10, 20, -10, -20].forEach((v) => {
      const W = Math.abs(v) * TICK_M;
      const start = new Vector2D(CX - W / 2, CY - PITCH_TO_PIXELS * v);
      const end = new Vector2D(CX + W / 2, CY - PITCH_TO_PIXELS * v);
      this.innerBezelFace.add(line(this.innerBezel, start, end, "white", 3));
      this.innerBezelFace.add(
        centeredText(
          this.innerBezel,
          new Vector2D(start.x - 12, start.y),
          Math.abs(v),
          "white",
          "12px"
        )
      );
      this.innerBezelFace.add(
        centeredText(
          this.innerBezel,
          new Vector2D(end.x + 12, end.y),
          Math.abs(v),
          "white",
          "12px"
        )
      );
    });
    // small ticks
    // add pitch up marks at 5, 10, 15, 20 degrees, intervals of 10 are large ticks
    [5, 15, -5, -15].forEach((v) => {
      const W = SMALL_TICK_WIDTH;
      const start = new Vector2D(CX - W / 2, CY - PITCH_TO_PIXELS * v);
      const end = new Vector2D(CX + W / 2, CY - PITCH_TO_PIXELS * v);
      this.innerBezelFace.add(line(this.innerBezel, start, end, "white", 2));
    });
    // add to outer SVG
    this.snap.add(this.innerBezel);
  }

  /**
   * pitch gradient adjusted to represent the current pitch
   * @returns {*}
   */
  pitchGradient() {
    // displayed pitch includes the cage multiplier
    const displayedPitch = this.pitch * this.cageMultiplier;
    // get correct position for sky/earth separator line ( gradients are generated using stops 0-100 )
    const pixelOffset = displayedPitch * PITCH_TO_PIXELS;
    const normalized = pixelOffset / INNER_RADIUS / 2;
    const y = 50 + normalized * 100;
    return this.snap.gradient(
      `l(0, 0, 0, 1)${COLOR_SKY}:0-${COLOR_SKY}:${
        y - 1
      }-white:${y}-${COLOR_EARTH}:${y + 1}-${COLOR_EARTH}:100`
    );
  }

  /**
   * render out bezel with tick marks
   */
  renderOuterBezel() {
    this.outerBezel = new Snap(W, H);
    this.outerBezelFace = this.outerBezel.group();
    this.outerBezelFace.add(
      circle(
        this.outerBezel,
        CENTER,
        OUTER_RADIUS,
        this.snap.gradient(
          `l(0, 0, 0, 1)${COLOR_SKY}:0-${COLOR_SKY}:50-${COLOR_EARTH}:50-${COLOR_EARTH}:100`
        ),
        OUTER_THICKNESS,
        "transparent"
      )
    );
    this.snap.add(this.outerBezel);
    // render ticks and triangles on outer bezel
    // small ticks
    [10, 20].forEach((a) => {
      this.outerBezelFace.add(
        tick(
          this.outerBezel,
          CENTER,
          270 + a,
          OUTER_RADIUS,
          OUTER_RADIUS - OUTER_THICKNESS / 2,
          3,
          "white"
        )
      );
      this.outerBezelFace.add(
        tick(
          this.outerBezel,
          CENTER,
          270 - a,
          OUTER_RADIUS,
          OUTER_RADIUS - OUTER_THICKNESS / 2,
          3,
          "white"
        )
      );
    });
    // big ticks
    [30, 60, 90].forEach((a) => {
      this.outerBezelFace.add(
        tick(
          this.outerBezel,
          CENTER,
          270 + a,
          OUTER_RADIUS - OUTER_THICKNESS / 2,
          OUTER_RADIUS + OUTER_THICKNESS / 2,
          6,
          "white"
        )
      );
      this.outerBezelFace.add(
        tick(
          this.outerBezel,
          CENTER,
          270 - a,
          OUTER_RADIUS - OUTER_THICKNESS / 2,
          OUTER_RADIUS + OUTER_THICKNESS / 2,
          6,
          "white"
        )
      );
    });
    // render small dots at 45 degrees
    this.outerBezelFace.add(
      circle(
        this.outerBezel,
        POC(CENTER, OUTER_RADIUS, 270 - 45),
        4,
        "transparent",
        0,
        "white"
      )
    );
    this.outerBezelFace.add(
      circle(
        this.outerBezel,
        POC(CENTER, OUTER_RADIUS, 270 + 45),
        4,
        "transparent",
        0,
        "white"
      )
    );

    // draw white triangle at 12 o'clock
    // draw triangle pointer at 12 o'clock
    const p1 = POC(CENTER, PA_TRI_R, 270);
    const p2 = new Vector2D(p1.x - PA_TRI_W / 2, p1.y - PA_TRI_H);
    const p3 = new Vector2D(p1.x + PA_TRI_W / 2, p1.y - PA_TRI_H);

    this.outerBezelFace.add(
      triangle(this.snap, p1, p2, p3, "transparent", 0, "white")
    );
  }

  /**
   * set the roll. Left roll is 0 -> -180, right roll is 0 -> +180
   * The displayed pitch is adjusted to include the verticalAdjustment but this does not effect
   * the stored pitch value for the instrument
   * NOTE: When caged the pitch and roll and damped to zero. There is an animated multiplier that
   * is used on the actual display roll and pitch to accomplish this.
   * @param roll
   */
  setRollAndPitch(roll, pitch) {
    this.roll = roll;
    this.pitch = pitch;

    const displayRoll = this.roll * this.cageMultiplier;
    const displayPitch = this.pitch * this.cageMultiplier;

    this.outerBezelFace.attr({
      transform: `r${-1 * displayRoll} ${CX} ${CY}`
    });
    this.innerBezelFace.attr({
      transform: `r${-1 * displayRoll} ${CX} ${CY} t ${0} ${
        displayPitch * PITCH_TO_PIXELS
      }`
    });
    this.pitchCircle.attr({
      transform: `r${-1 * displayRoll} ${CX} ${CY}`,
      fill: this.pitchGradient()
    });
  }

  /**
   * render an almost transparent gradient over the face to give the appearance of
   * shadow and depth. Also add a shadow to the inner bezel to the give the correct 3D appearance
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

    // make a sin based shadow for the inner bezel
    const MAX_ALPHA = 0.5;
    const START = 85;
    let str = "";
    for (let i = 0; i < 90; i += 1) {
      if (str) {
        str += "-";
      }
      const v = START + (100 - START) * (i / 90);
      str += `rgba(0, 0, 0, ${Math.sin(D2R(i)) * MAX_ALPHA}):${v}`;
    }
    circle(
      this.snap,
      CENTER,
      INNER_RADIUS,
      "transparent",
      0,
      this.snap.gradient(`r(0.5, 0.5, 0.5)${str}`)
    );
  }

  /**
   * a property of the airplane was changed
   * @param airplane
   */
  onAirplaneChanged(airplane) {
    if (!this.caged) {
      console.assert(airplane === this.airplane, "not our airplane");
      this.setRollAndPitch(this.airplane.roll, this.airplane.pitch);
    }
  }
}
