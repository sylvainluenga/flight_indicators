import TachometerAnalog from "./tachometer_analog";
import AirspeedAnalog from "./airspeed_analog";
import AttitudeIndicatorAnalog from "./attitude_indicator_analog";
import AltimeterAnalog from "./altimeter_analog";
import TurnCoordinatorAnalog from "./turn_coordinator_analog";
import HeadingIndicatorAnalog from "./heading_indicator_analog";
import VerticalSpeedAnalog from "./vertical_speed_analog";
import Airplane from "./airplane";

/*
  Fully functionality flight instruments built entirely with Snap SVG
  and JavaScript. By default the intruments all go into demo mode
  with random changes to their properties. You can disable that
  by commenting out .startDemo() below.
  Buttons are functionaty e.g. the HDG button on the directional gyro.
  Rotate with the mouse ( when not in demo mode ) to change.

  Feel free to copy/clone/use as you see fit for any purpose commercial
  or non commerical. These are free and open source for anyone to use
  without renumeration, attribution or compensation.

  https://www.linkedin.com/in/duncanmeech/
  duncanmeech@gmail.com

*/

import "./styles.css";

const parentElement = document.body;
const airplane = new Airplane();

const instruments = [
  new AirspeedAnalog({
    airplane,
    parentElement
  }),
  new AttitudeIndicatorAnalog({
    airplane,
    parentElement
  }),
  new AltimeterAnalog({
    airplane,
    parentElement
  }),
  new TurnCoordinatorAnalog({
    airplane,
    parentElement
  }),
  new HeadingIndicatorAnalog({
    airplane,
    parentElement
  }),
  new VerticalSpeedAnalog({
    airplane,
    parentElement
  }),
  new TachometerAnalog({
    airplane,
    parentElement
  })
];

instruments.forEach(i => i.demoStart());
