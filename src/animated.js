import Disposable from "./disposable";
/**
 * base class for things that use lerps and intervals to animate their internal state
 */
export default class Animated extends Disposable {
  /**
   * initialize lerp hash
   */
  constructor() {
    super();
    this.lerps = {};
    this.addDisposable(() => this.cancelAllLerps());
  }

  /**
   * add a lerp/interval that can be cancelled with cancelLerp
   * @param key
   * @param callback
   */
  addLerp(key, callback) {
    this.cancelLerp(key);
    this.lerps[key] = callback;
  }

  /**
   * cancel any existing lerp /interval that was registered with addLerp
   */
  cancelLerp(key) {
    if (this.lerps[key]) {
      this.lerps[key]();
      delete this.lerps[key];
    }
  }

  /**
   * cancel all lerps
   */
  cancelAllLerps() {
    Object.values(this.lerps).forEach(f => f());
    this.lerps = {};
  }
}

// Alex Sylvain Luenga