import Disposable from "./disposable";
import Animated from "./animated";
import D from "DOMArray";
import { POC, D2C, angleFrom, angularDelta } from "./geometry/angle";
import Vector2D from "./geometry/vector2d";
import {
  tick,
  circle,
  rectangle,
  centeredText,
  leftText
} from "./graphics/primitives";
import { colors } from "./graphics/colors";
import { lerp } from "./utils/math";
import { interval } from "./utils/time";
import Snap from "snapsvg-cjs";
import Mouse from "./utils/mouse";

// outer beveled ring thickess
const CASE1 = 5;

// anglular changes above this delta are ignored
const JITTER_THRESHOLD = 20;

// scale when pop'ed out
const POP_SCALE = 1.25;

/**
 * base class for all analog / digital instruments
 */
export default class Rotatable extends Animated {
  constructor(options) {
    super();
    Object.assign(
      this,
      {
        radius: 30,
        text: "",
        textColor: colors.white,
        rotation: 0,
        rotationCallback: null,
        clickCallback: null,
        gear: 1,
        fontSize: "16px",
        randomize: true,
        popout: false,
        popState: false
      },
      options
    );
    console.assert(this.snap, "requires a snap paper");
    console.assert(
      this.rotationCallback || this.clickCallback,
      "requires a rotation or click callback"
    );
    this.center = new Vector2D(this.radius, this.radius);
    this.randomOffset = this.randomize ? Math.random() * 360 : 0;
    this.renderImmutable();
  }

  /**
   * set the pop scale ana update
   * @param s
   */
  setPopScale(s) {
    this.scale = s;
    this.addLerp(
      "scale",
      lerp(this.displayScale, this.scale, 200, (v) => {
        this.displayScale = v;
        this.updateTransform();
        this.updateButtonColor();
      })
    );
  }

  renderImmutable() {
    // group everything for centering on parent location and rotation
    this.group = this.snap.group();
    this.group.attr({
      class: "clickable"
    });

    this.el = circle(
      this.snap,
      this.center,
      this.radius - CASE1 / 2,
      this.snap.gradient(`l(0, 0, 1, 1)#FFF:0-#888:20-#111:100`),
      CASE1,
      colors.black
    );

    this.text = centeredText(
      this.snap,
      this.center,
      this.text,
      this.textColor,
      this.fontSize
    );

    // set initial position which might be random
    this.text.attr({
      transform: `r ${this.rotation + this.randomOffset} ${this.center.x} ${
        this.center.y
      }`
    });

    // this is a nearly invisible outer circle that enlarges the area which
    // is responsive to clicks and touches. Useful on small screens and touch devices.
    this.outer = circle(
      this.snap,
      this.center,
      this.radius * 2,
      "none",
      0,
      "rgba(0, 0, 0, 0.001)"
    );

    this.group.add(this.el, this.text, this.outer);

    // setup mouse interactions
    this.mouse = new Mouse();
    this.onMouseDown = this.onMouseDown.bind(this);
    this.onMouseMove = this.onMouseMove.bind(this);
    this.onMouseUp = this.onMouseUp.bind(this);
    this.mouse.register("mousemove", this.group.node, this.onMouseMove);
    this.mouse.register("mousedown", this.group.node, this.onMouseDown);
    this.mouse.register("mouseup", this.group.node, this.onMouseUp);

    // set default center
    this.centerOn(this.center);

    // set default scale
    this.displayScale = this.popState ? POP_SCALE : 1;
    this.setPopScale(this.displayScale);
  }

  /**
   * set color of button face according to the currently displayed scale
   * @param color
   */
  updateButtonColor() {
    const normalized = (this.displayScale - 1) / (POP_SCALE - 1);
    const gray = Math.floor(normalized * 92);
    this.el.attr({
      fill: `rgb(${gray}, ${gray}, ${gray})`
    });
  }

  /**
   *
   * @param e
   * @param local
   */
  onMouseDown(e, local) {
    this.lastAngle = angleFrom(this.center, local);
    this.mouse.setCapture(this.group.node);
  }

  /**
   * mouse is released
   * @param e
   * @param local
   */
  onMouseUp(e, local, capture) {
    if (capture && this.clickCallback) {
      this.clickCallback();
    }
    this.mouse.releaseCapture();
    if (this.popout) {
      this.togglePopout();
    }
  }

  /**
   * repond to twisting when capturing the mouse
   * @param e
   * @param local
   */
  onMouseMove(e, local, capture) {
    // mouse rotation swipes only if capturing and there is a rotation callback
    if (capture && this.rotationCallback) {
      console.assert(isFinite(this.lastAngle), "lastAngle must be set");
      const angle = angleFrom(this.center, local);
      let delta = angularDelta(this.lastAngle, angle);
      this.lastAngle = angle;
      // ignore if delta above a threshold to avoid too much jumpiness
      if (Math.abs(delta) < JITTER_THRESHOLD) {
        this.rotationCallback(delta * this.gear);
        this.rotation = this.rotation + delta;
        this.text.attr({
          transform: `r ${this.rotation + this.randomOffset} ${this.center.x} ${
            this.center.y
          }`
        });
      }
    }
  }

  /**
   * toggle popstate
   */
  togglePopout() {
    this.popState = !this.popState;
    this.setPopScale(this.popState ? POP_SCALE : 1);
  }

  /**
   * position / center ourselves on the given location
   * @param point
   */
  centerOn(point) {
    this.position = new Vector2D(point.x, point.y);
    this.updateTransform();
  }

  /**
   * update position and scale
   */
  updateTransform() {
    this.group.attr({
      transform: `t ${this.position.x - this.radius} ${
        this.position.y - this.radius
      } s${this.displayScale} ${this.radius} ${this.radius}`
    });
  }
}

// Alex Sylvain Luenga