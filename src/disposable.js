/**
 * base class for a lot of types in the app. Provides for callbacks to be invoked when
 * its dispose() method is called. Also provides event emitter capabilities
 */

export default class Disposable {
  /**
   * the purpose of this class is simply to provide a way to add
   * various functions to be called when the dispose method is
   * called. This allows classes to create methods ( usually lambdas )
   * juxtaposed to where an object that needs disposing is declared.
   */
  constructor() {
    this.disposeFunctions = [];
    this.listeners = [];
  }

  /**
   * add a function to call when we are disposed
   * NOTE: if you want to later remove a dispose function do NOT use a lambda.
   * @param func
   */
  addDisposable(func) {
    console.assert(func && typeof func === "function", "expected a callback");
    console.assert(
      this.disposeFunctions.indexOf(func) < 0,
      "listener already registered"
    );
    this.disposeFunctions.push(func);
  }

  /**
   * remove a function that was previously added.
   * @param func
   */
  removeDisposable(func) {
    console.assert(func && typeof func === "function", "expected a callback");
    console.assert(
      this.disposeFunctions.indexOf(func) >= 0,
      "listener is not registered"
    );
    this.disposeFunctions = this.disposeFunctions.filter(f => f !== func);
  }

  /**
   * call all our dispose methods
   */
  dispose() {
    console.assert(!this.disposed, "already disposed");
    this.disposed = true;
    this.disposeFunctions.forEach(f => f());
    this.disposeFunctions.length = 0;
  }

  /**
   * add a change listener any changes to the airplane configuration
   * @param func
   */
  addListener(func) {
    console.assert(func && typeof func === "function", "expected a callback");
    console.assert(
      this.listeners.indexOf(func) < 0,
      "listener already registered"
    );
    this.listeners.push(func);
  }

  /**
   * remove an existing change listener
   * @param func
   */
  removeListener(func) {
    console.assert(func && typeof func === "function", "expected a callback");
    console.assert(
      this.listeners.indexOf(func) >= 0,
      "listener is not registered"
    );
    this.listeners = this.listeners.filter(f => f !== func);
  }

  /**
   * remove all listeners
   */
  removeAllListeners() {
    this.listeners.length = 0;
  }

  /**
   * send a change notification to all listeners
   */
  callListeners() {
    this.listeners.forEach(l => l(this));
  }
}

// Alex Sylvain Luenga