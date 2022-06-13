import Animated from "./animated";

/**
 * base class for all analog / digital instruments
 */
export default class Instrument extends Animated {
  /**
   * requires at the very least width, height and an airplane
   * @param config
   */
  constructor(config) {
    super();
    Object.assign(
      this,
      {
        width: 0,
        height: 0,
        airplane: null,
        listener: []
      },
      config
    );
    console.assert(
      this.width && this.height && this.airplane,
      "missing or invalid configuration options"
    );
  }

  demoStart() {
    console.assert(false, "Must override in descendant class");
  }

  demoStop() {
    console.assert(false, "Must override in descendant class");
  }
}
