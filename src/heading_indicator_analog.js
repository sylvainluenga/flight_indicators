import D from "DOMArray";
import Instrument from "./instrument";
import { POC, D2C, C2D } from "./geometry/angle";
import Vector2D from "./geometry/vector2d";
import {
  centeredText,
  tick,
  circle,
  airplaneSilhouette
} from "./graphics/primitives";
import { interval } from "./utils/time";
import Rotatable from "./rotatable-button";
import { colors } from "./graphics/colors";
import { signedDegreesToPositive360 } from "./utils/conversions";
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
// size of airplane pointer
const AW = 180;
const AH = 180;
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

// radius of heading text
const TEXT_RADIUS = R - (CASE1 + CASE2 + CASE3 + 20);
// radius of all tick marks
const TICK = TEXT_RADIUS - 30;
// length of long short tick marks
const LONG_TICK = 22;
const SHORT_TICK = 14;

// center of SET
const SET_CENTER = POC(CENTER, R, 135);
// radius of OBS
const SET_R = 32;

// center of HDG
const HDG_CENTER = POC(CENTER, R, 45);
// radius of OBS
const HDG_R = 32;

const HEADING_BUG_OUTER = R - (CASE1 + CASE2 + CASE3);
const HEADING_BUG_INNER = TICK + 6;
const HEADING_BUG_MID = (HEADING_BUG_INNER + HEADING_BUG_OUTER) / 2;

export default class HeadingIndicatorAnalog extends Instrument {
  constructor(options) {
    super(
      Object.assign(
        {
          width: W,
          height: H,
          // this is the angular offset the user sets from the airplanes magnetic heading.
          // Changing it corresponds to twisting the SET button
          magneticOffset: 0,
          // current setting for heading bug
          headingBugHeading: 0
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

    this.renderImmutable();
    this.setHeading(this.airplane.heading);
    this.setHeadingBug(this.headingBugHeading);

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
        this.airplane.setHeading(360 * Math.random());
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
    this.snap = new Snap(this.svg.el);
    this.renderCase();
    this.renderHeadings();
    this.renderHeadingBug();
    this.renderPointer();
    this.renderShadow();
    this.createButtons();
  }

  /**
   * create SET and HDG buttons
   */
  createButtons() {
    this.setButton = new Rotatable({
      snap: this.snap,
      radius: SET_R,
      text: "SET",
      textColor: colors.silver,
      gear: 0.25,
      rotationCallback: this.onSetChanged.bind(this)
    });
    this.setButton.centerOn(new Vector2D(SET_CENTER.x, SET_CENTER.y));

    this.hdgButton = new Rotatable({
      snap: this.snap,
      radius: HDG_R,
      text: "HDG",
      textColor: colors.red,
      gear: 0.25,
      rotationCallback: this.onHdgChanged.bind(this)
    });
    this.hdgButton.centerOn(new Vector2D(HDG_CENTER.x, HDG_CENTER.y));
  }

  /**
   * set the offset from the magnetic heading supplied by our aircraft model
   * @param delta
   */
  onSetChanged(delta) {
    this.magneticOffset = signedDegreesToPositive360(
      this.magneticOffset + delta
    );
    this.setHeading(this.airplane.heading + this.magneticOffset);
    this.setHeadingBug(this.headingBugHeading);
  }

  /**
   * repond to twists of the heading bug button
   * @param delta
   */
  onHdgChanged(delta) {
    this.headingBugHeading = signedDegreesToPositive360(
      this.headingBugHeading + delta
    );
    this.setHeadingBug(this.headingBugHeading);
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
      colors.black
    );
    circle(
      this.snap,
      CENTER,
      R - (CASE1 + CASE2 / 2),
      this.snap.gradient(`l(0, 0, 1, 1)#111-#666`),
      CASE2,
      colors.black
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
   * render the heading bug at zero degrees, it is transformed into the current setting
   */
  renderHeadingBug() {
    this.headingBugGroup = this.faceSnap.group();
    this.headingBug1 = tick(
      this.faceSnap,
      CENTER,
      D2C(-3),
      HEADING_BUG_OUTER,
      HEADING_BUG_INNER,
      9,
      colors.red
    );
    this.headingBug2 = tick(
      this.faceSnap,
      CENTER,
      D2C(3),
      HEADING_BUG_OUTER,
      HEADING_BUG_INNER,
      9,
      colors.red
    );
    this.headingBugGroup.add(this.headingBug1, this.headingBug2);
  }

  /**
   * render the text and ticks marks for headings
   */
  renderHeadings() {
    this.faceSnap = new Snap(W, H);
    this.face = this.faceSnap.group();

    for (let i = 0; i < 360; i += 5) {
      const a = D2C(i);
      const longTick = a % 10 === 0;
      const text = a % 30 === 0;

      const outerTick = TICK + (longTick ? LONG_TICK : SHORT_TICK) / 2;
      const innerTick = TICK - (longTick ? LONG_TICK : SHORT_TICK) / 2;
      const thickness = longTick ? 3 : 2;
      this.face.add(
        tick(this.faceSnap, CENTER, a, outerTick, innerTick, thickness, "white")
      );

      if (text) {
        let str;
        switch (i) {
          case 0:
            str = "N";
            break;
          case 90:
            str = "E";
            break;
          case 180:
            str = "S";
            break;
          case 270:
            str = "W";
            break;
          default:
            str = i / 10;
        }

        const textCenter = POC(CENTER, TEXT_RADIUS, a);
        const t = centeredText(
          this.faceSnap,
          textCenter,
          str,
          "white",
          "32px",
          "Verdana"
        );
        t.attr({ transform: `r${i} ${textCenter.x} ${textCenter.y}` });
        this.face.add(t);
      }
    }
    this.snap.add(this.faceSnap);
  }

  /**
   * update to the given heading
   * @param heading
   */
  setHeading(heading) {
    this.face.attr({
      transform: `r  ${-1 * heading} ${CENTER.x} ${CENTER.y}`
    });
  }

  /**
   * update the heading bug, which is always the airplanes heading + the heading bug heading
   * @param heading
   */
  setHeadingBug() {
    const h = this.airplane.heading + this.magneticOffset;
    this.headingBugGroup.attr({
      transform: `r  ${-1 * (h + this.headingBugHeading)} ${CENTER.x} ${
        CENTER.y
      }`
    });
  }

  renderPointer() {
    this.snap.add(
      airplaneSilhouette(CX, CY, AW, AH, 4, "orange", "transparent")
    );
    tick(this.snap, CENTER, 0, TICK, AH / 2, 3, "orange");
    tick(this.snap, CENTER, 90, TICK, AH / 2, 3, "orange");
    tick(this.snap, CENTER, 180, TICK, AH / 2, 3, "orange");
    tick(this.snap, CENTER, 270, TICK, AH / 2, 3, "orange");

    circle(this.snap, CENTER, 4, "#888", 1, colors.black);
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
   * a property of the airplane was changed
   * @param airplane
   */
  onAirplaneChanged(airplane) {
    console.assert(airplane === this.airplane, "not our airplane");
    this.setHeading(this.airplane.heading + this.magneticOffset);
    this.setHeadingBug(this.headingBugHeading);
  }
}
