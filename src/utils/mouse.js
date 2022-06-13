import D from "DOMArray";
import Disposable from "../disposable";
import Vector2D from "../geometry/vector2d";

// native events we capture
const events = ["mousemove", "mousedown", "mouseup", "mouseover", "mouseout"];
// synthetic events we produce. If can, optionally, register for these events.
// If you do you will receive them whenever the node is the target of a
// call to setCapture, release capture. This gives you a clean way of tracking
// the start and end of capture.
// NOTE: the callback for these events receive no parameters.
const sEvents = ["setCapture", "releaseCapture"];

export default class Mouse extends Disposable {
  constructor() {
    super();
    // save some typing
    this.d = document.documentElement;
    // capture all events
    this.handleEvent = this.handleEvent.bind(this);
    events.forEach(name => {
      this.d.addEventListener(name, this.handleEvent);
    });
    this.addDisposable(() => {
      events.forEach(name =>
        this.d.removeEventListener(name, this.handleEvent)
      );
    });
    // map event name to listeners of that event ( ears )
    this.hash = {};
    // the node that current has the capture
    this.captureNode = null;
  }

  /**
   * event handler for all events
   * @param e
   */
  handleEvent(e) {
    // get all ears for this event
    const ears = this.hash[e.type];
    if (ears) {
      ears.forEach(ear => {
        // if capturing all events go to the captureNode
        if (this.captureNode) {
          ear.callback(e, this.eventToNode(ear.node, e), true);
        } else {
          // otherwise only if event targets the node or children of node as specified
          if (
            e.target === ear.node ||
            (ear.includeDescendants && this.contains(e.target, ear.node))
          ) {
            ear.callback(e, this.eventToNode(ear.node, e), false);
          }
        }
      });
    }
  }

  /**
   * get position of mouse in the coordinate system of the node.
   * Both getBoundingClientRect and the clientX, clientY coordinate of mouse events are in
   * viewport space so there is no need to convert into document/global space first.
   * @param node
   */
  eventToNode(node, event) {
    // viewport relative bounds of node
    const box = node.getBoundingClientRect();
    // clientX/Y are viewport relative, so just subtract the elements viewport bounds
    return new Vector2D(event.clientX - box.x, event.clientY - box.y);
  }

  /**
   * returns true if descendant really is a descendant of parent
   * https://developer.mozilla.org/en-US/docs/Web/API/Node/compareDocumentPosition
   * @param ancestor
   * @param descendant
   */
  contains(ancestor, descendant) {
    const relationship = ancestor.compareDocumentPosition(descendant);
    return relationship & 8;
  }

  /**
   * register a listener for a given event and node. You can either include or exclude
   * events to the descendants of the given node
   * @param event
   * @param node
   * @param callback
   * @param includeDescendants
   */
  register(event, node, callback, includeDescendants = true) {
    // you can only register for one of our event
    if (!this.hash[event]) {
      this.hash[event] = [];
    }
    this.hash[event].push({
      node,
      callback,
      includeDescendants
    });
  }

  /**
   * unregister a handler using the same parameters as were used to register it. Everything must match
   * @param event
   * @param node
   * @param callback
   * @param includeDescendants
   */
  unregister(event, node, callback, includeDescendants = true) {
    console.assert(this.hash[event], "nothing registered for this event");
    let removed = 0;
    this.hash[event].forEach((record, index) => {
      if (
        record.node === node &&
        record.callback === callback &&
        record.includeDescendants === includeDescendants
      ) {
        this.hash[event].splice(index, 1);
        // if this is the capture node then cancel capture
        if (record.node === this.captureNode) {
          this.releaseCapture();
        }
        removed += 1;
      }
    });
    console.assert(
      removed !== 1,
      "unregister did not match exactly one record"
    );
  }

  /**
   * Return the listener for the named event and the given node
   * @param eventName
   * @param node
   */
  findNode(eventName, node) {
    const list = this.hash[eventName];
    if (list) {
      return list.find(record => record.node === node);
    }
    return null;
  }

  /**
   * send all events to the capture node until releaseCapture is called.
   * @param node
   */
  setCapture(node) {
    this.releaseCapture();
    this.captureNode = node;
    // find a listener for 'setCapture' for this node
    const record = this.findNode("setCapture", this.captureNode);
    if (record) {
      record.callback();
    }
  }

  /**
   * release the capture on the given node
   */
  releaseCapture() {
    if (this.captureNode) {
      // find a listener for 'releaseCapture' for this node
      const record = this.findNode("releaseCapture", this.captureNode);
      if (record) {
        record.callback();
      }
      this.captureNode = null;
    }
  }
}
