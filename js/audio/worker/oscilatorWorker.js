/**/

/*/

/**/
// begin code

/**
 * Metronome worker for AudioOscillatorHandler. It holds no audio state and
 * touches no Web Audio API (unavailable in workers anyway) - it only keeps a
 * steady tick running on its own thread and posts {id:'tick'} to the main
 * thread on each beat. That drives the handler's look-ahead scheduler
 * independently of main-thread / game-loop jank; the main thread still does all
 * real note scheduling against the AudioContext clock, so timing stays
 * sample-accurate and no worker/audio clock sync is needed.
 *
 * The tick is driven by a recursive setTimeout (never setInterval, which drifts
 * and piles up callbacks). Commands from the main thread: {id:'start',
 * intervalMs} and {id:'stop'}.
 */

let timerId = false;
let intervalMs = 25;

/**
 * Emits one tick and re-arms the next tick via setTimeout (self-correcting,
 * never overlaps).
 * @returns {void}
 */
function tick() {
  self.postMessage({id: 'tick'});
  timerId = setTimeout(tick, intervalMs);
} // tick

self.onmessage = (event) => {
  const data = event.data;
  if (data.id === 'start') {
    if ('intervalMs' in data) {
      intervalMs = Math.max(10, data.intervalMs);
    }
    if (timerId === false) {
      tick();
    }
  } else if (data.id === 'stop') {
    if (timerId !== false) {
      clearTimeout(timerId);
      timerId = false;
    }
  }
}; // onmessage
