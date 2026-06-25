// part of https://github.com/rc-dukes/dash fork of https://github.com/mattbradley/dash

import RemoteConfigEditor from "./RemoteConfigEditor.js";

var simulatorVerticle = null;

/**
 * SimulatorVerticle to be used as remoteController
 */
export default class SimulatorVerticle {

  /**
   * construct me
   * @param config
   * @param self
   * @param onHeartBeat
   */
  constructor(config,self=null,onHeartBeat=null) {
    this.config=Object.assign({}, RemoteConfigEditor.defaultConfig, config);
    this.busUrl=this.config.busUrl;
    this.self=self;
    this.onHeartBeat=onHeartBeat;
    this.heartBeatCount=0;
    this.debugHeartBeat=this.config.debugHeartbeat;
    this.remoteControl=new RemoteControl();
    simulatorVerticle=this;
    this.enabled=false;
  }

  /**
   * all publish messages should go thru this function
   *
   * @param address
   * @param message
   * @param headers
   */
  publish(address,message,headers) {
    if (this.eb && this.eb.state===EventBus.OPEN)
  	  this.eb.publish(address, message, headers);
  };

  /**
   * send the given image to the debug image server
   * @param imgData
   */
  sendImage(imgData) {
    this.publish(this.config.imageServerCallsign+":"+this.config.imageAddressSuffix,imgData);
  }

  /**
   * start the verticle and register the handlers
   */
  start() {
    if (!this.eb) {
      this.eb = new EventBus(this.busUrl);
      this.eb.onopen = function() {
        if (simulatorVerticle.config.watchdogEnabled)
          simulatorVerticle.eb.registerHandler(simulatorVerticle.config.heartbeatCallsign,simulatorVerticle.heartBeatHandler);
        simulatorVerticle.eb.registerHandler(simulatorVerticle.config.carCallsign,simulatorVerticle.carMessageHandler);
      };
    };
    this.enabled=true;
  }

  stop() {
    if (this.eb)
      this.eb.close();
    this.eb=null;
    this.enabled=false;
  }

  /**
   * handle a car message
   * @param err - potential errors
   * @param msg - the vert.x message
   */
  carMessageHandler(err,msg) {
    var carjo=msg.body;
    console.log(JSON.stringify(carjo));
    var sv=simulatorVerticle;
    switch (carjo.type) {
      case 'servodirect':
        if (carjo.position) {
          // the position can be between -100 and 100
          var pos=parseFloat(carjo.position);
          // we need a value between -1 and +1
          sv.remoteControl.steer=pos/100;
        }
      break;
      case 'servo':
         switch (carjo.position) {
           case 'left':
             sv.remoteControl.steer-=0.01;
           break;
           case 'right':
             sv.remoteControl.steer+=0.01;
           break;
           case 'center':
             sv.remoteControl.steer=0;
           break;
         }
      break;
      case 'motor':
         switch (carjo.speed) {
           case 'up':
             sv.remoteControl.gas+=0.01;
           break;
           case 'down':
             sv.remoteControl.gas-=0.01;
           break;
           case 'brake':
             sv.remoteControl.break+=0.01;
           break;
           case 'stop':
             sv.remoteControl.gas=0;
             sv.remoteControl.break=1;
           break;
         }
      break;
    }
  }

  /**
   * handle a heart beat message
   * @param err - potential errors
   * @param msg - the vert.x message
   */
  heartBeatHandler(err,msg) {
    var jo=msg.body;
    var sv=simulatorVerticle;
    if (sv.debugHeartBeat)
       console.log(JSON.stringify(jo));
    sv.heartBeatCount++;
    if (sv.onHeartBeat && sv.self) {
      sv.onHeartBeat(sv.self,sv.heartBeatCount);
    }
  }

  stateColor() {
    var stateColor = "white";
    if (this.eb) {
      switch (this.eb.state) {
      case EventBus.CONNECTING:
        stateColor = "orange";
        break;
      case EventBus.OPEN:
        stateColor = "green";
        break;
      case EventBus.CLOSING:
        stateColor = "orange";
        break;
      case EventBus.CLOSED:
        stateColor = "red";
        break;
      }
    } else {
      stateColor = "violet";
    }
    return stateColor;
  }
}

export class RemoteControl {
  /**
   * @param gas
   * @param brake
   * @param steer
   */
  constructor(gas=0,brake=0,steer=0) {
    this.gas=0;
    this.brake=0;
    this.steer=0;
  }

}
