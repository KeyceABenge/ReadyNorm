/**
 * ANALYTICS ADAPTER — No-op with console logging.
 * 
 * Replaces base44.analytics.track(). Same signature, zero dependencies.
 * To upgrade: swap the body with PostHog, Mixpanel, or custom endpoint.
 */

/**
 * Track a custom analytics event.
 * @param {string} eventName - Event name (e.g. "add_to_cart_button_clicked")
 * @param {object} [properties] - Event properties
 */
export function trackEvent(eventName, properties = {}) {
  if (import.meta.env.DEV) {
    console.log(`[analytics] ${eventName}`, properties);
  }
}