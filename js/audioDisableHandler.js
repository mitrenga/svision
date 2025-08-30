/**/
const { AbstractAudioHandler } = await import('./abstractAudioHandler.js?ver='+window.srcVersion);
/*/
import AbstractAudioHandler from './abstractAudioHandler.js';
/**/
// begin code

export class AudioDisableHandler extends AbstractAudioHandler {
  
  constructor(app) {
    super(app);
    this.id = 'AudioDisableHandler';
  } // constructor

  openChannel(channel) {
    this.busy = false;
  } // openChannel

  closeChannel() {
    this.busy = false;
    return true;
  } // closeChannel

  playSound(audioData, options) {
    if ('events' in audioData) {
      var timer = 0;
      for (var p = 0; p < audioData.pulses.length; p++) {
        if (p in audioData.events) {
          this.app.model.sendEvent(Math.round(timer/44.1), {'id': audioData.events[p].id, 'data': audioData.events[p]});
        }
        timer += audioData.fragments[audioData.pulses[p]];
      }
      if (audioData.pulses.length in audioData.events) {
        this.app.model.sendEvent(Math.round(timer/44.1), {'id': audioData.events[audioData.pulses.length].id, 'data': audioData.events[audioData.pulses.length]});
      }
    }
  } // playSound

  getSampleRate() {
    return 44100;
  } // getSampleRate

  getState() {
    return 'disable';
  } // getState

} // class AudioDiableHandler

export default AudioDisableHandler;
