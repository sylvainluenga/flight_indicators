import Disposable from "./disposable";
import { lerp } from "./utils/math";
import { STANDARD_BAROMETER } from "./utils/conversions";

export default class Airplane extends Disposable {
  constructor() {
    super();
    // default configuration for an airplane, Similar to a Cessna 172
    Object.assign(this, {
      // V speeds KIAS
      VS0: 40,
      VS1: 50,
      VR: 55,
      VLOF: 60,
      VFE: 85,
      VA: 95,
      VNO: 130,
      VNE: 157,

      // maximum airspeed that is displayed on the analog airspeed gauge
      MAX_DISPLAYED_SPEED: 200,

      // maximum altitude in ft
      SERVICE_CEILING: 17000,

      // speed in KIAS
      airspeed: 0,
      // rate of change of airspeed in knots per second, + or -
      airspeedRate: 0,
      // altitude in feet
      altitude: 0,
      // vertical speed in feet per minute
      altitudeRate: 0,
      // static pressure as measured at the static port
      staticPressure: STANDARD_BAROMETER,
      // barometric pressure at sea level (QNH) ( inches of mercury )
      barometer: STANDARD_BAROMETER,
      // magnetic heading
      heading: 0,
      // rate of heading change in degrees per seconds, + or -
      headingRate: 0,
      // pitch, degrees
      pitch: 0,
      // rate of pitch change in degrees per seconds, + or -
      pitchRate: 0,
      // roll, degrees
      roll: 0,
      // rate of roll change in degrees per seconds, + or -
      rollRate: 0,
      // yaw degrees
      yaw: 0,
      // rate of yaw change in degrees per seconds, + or -
      yawRate: 0,

      // idle speed of engine
      idle: 1000,
      // max RPM
      redLine: 2700,
      // lower end of green range
      greenMin: 2000,
      // current RPM
      rpm: 0,

      // change listeners
      listeners: [],

      // lerps for different properties
      lerps: {}
    });

    // cancel all lerps when disposed
    this.addDisposable(() => {
      Object.values(this.lerps).forEach(f => f());
      this.lerps = {};
    });
  }

  /**
   * set the airspeed
   * @param kias
   */
  setAirspeed(kias) {
    if (kias !== this.airspeed) {
      this.addLerp(
        "airspeed",
        lerp(this.airspeed, kias, 1000, speed => {
          this.airspeed = speed;
          this.callListeners();
        })
      );
    }
  }

  /**
   * set the rpm
   * @param rpm
   */
  setRPM(rpm) {
    if (rpm !== this.rpm) {
      this.addLerp(
        "rpm",
        lerp(this.rpm, rpm, 1000, rpm => {
          this.rpm = rpm;
          this.callListeners();
        })
      );
    }
  }

  /**
   * set the altitude
   * @param feet
   */
  setAltitude(feet) {
    if (feet !== this.altitude) {
      this.addLerp(
        "altitude",
        lerp(this.altitude, feet, 4000, altitude => {
          this.altitude = altitude;
          this.callListeners();
        })
      );
    }
  }

  /**
   * set the altitude
   * @param verticalSpeed
   */
  setAltitudeRate(verticalSpeed) {
    if (verticalSpeed !== this.altitudeRate) {
      this.addLerp(
        "altitude-rate",
        lerp(this.altitudeRate, verticalSpeed, 4000, rate => {
          this.altitudeRate = rate;
          this.callListeners();
        })
      );
    }
  }

  /**
   * set the barometer setting ( QNH ). Can be animated or immediate
   * @param inchesOfMercury
   */
  setBarometer(inchesOfMercury, immediate = false) {
    if (immediate) {
      this.barometer = inchesOfMercury;
      this.callListeners();
    } else {
      if (inchesOfMercury !== this.barometer) {
        this.addLerp(
          "barometer",
          lerp(this.barometer, inchesOfMercury, 4000, qnh => {
            this.barometer = qnh;
            this.callListeners();
          })
        );
      }
    }
  }

  /**
   * set the altitude
   * @param feet
   */
  setHeading(magneticHeading) {
    if (magneticHeading !== this.heading) {
      this.addLerp(
        "heading",
        lerp(this.heading, magneticHeading, 3000, heading => {
          this.heading = heading;
          this.callListeners();
        })
      );
    }
  }

  /**
   * set the roll
   * @param degrees
   */
  setRoll(degrees) {
    if (degrees !== this.roll) {
      this.addLerp(
        "roll",
        lerp(this.roll, degrees, 3000, r => {
          this.roll = r;
          this.callListeners();
        })
      );
    }
  }

  /**
   * set the roll rate
   * @param degreesPerSecond
   */
  setRollRate(degreesPerSecond) {
    if (degreesPerSecond !== this.rollRate) {
      this.addLerp(
        "roll-rate",
        lerp(this.rollRate, degreesPerSecond, 3000, r => {
          this.rollRate = r;
          this.callListeners();
        })
      );
    }
  }

  /**
   * set the pitch
   * @param degrees
   */
  setPitch(degrees) {
    if (degrees !== this.pitch) {
      this.addLerp(
        "pitch",
        lerp(this.pitch, degrees, 3000, p => {
          this.pitch = p;
          this.callListeners();
        })
      );
    }
  }

  /**
   * set the degrees left ( negative ) or right ( positive ) of neutral ( 0 )
   * @param degrees
   */
  setYaw(degrees) {
    if (degrees !== this.yaw) {
      this.addLerp(
        "yaw",
        lerp(this.yaw, degrees, 3000, p => {
          this.yaw = p;
          this.callListeners();
        })
      );
    }
  }

  /**
   * add a lerp and cancel an existing one with the same key
   * @param key
   */
  addLerp(key, callback) {
    this.cancelLerp(key);
    this.lerps[key] = callback;
  }

  /**
   * cancel any existing lerp
   */
  cancelLerp(key) {
    if (this.lerps[key]) {
      this.lerps[key]();
      delete this.lerps[key];
    }
  }
}
