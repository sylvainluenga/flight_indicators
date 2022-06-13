export default class Vector2D {
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }

  clone() {
    return new Vector2D(this.x, this.y);
  }

  toString() {
    return `x:${this.x} y:${this.y}`;
  }

  sub(other) {
    return new Vector2D(this.x - other.x, this.y - other.y);
  }

  add(other) {
    return new Vector2D(this.x + other.x, this.y + other.y);
  }
}
