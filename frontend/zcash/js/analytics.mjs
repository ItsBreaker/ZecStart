// Analytics interface stub. A future version could report anonymous,
// aggregate counters (for example "finished step 2") in a privacy-preserving
// way. Today it deliberately does nothing and sends nothing anywhere.
/** @param {string} event e.g. "step_finished" @param {Record<string, string|number>} [props] */
export function track(event, props = {}) {
  void event;
  void props;
}
