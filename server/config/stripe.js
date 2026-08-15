const Stripe = require('stripe');

/**
 * Stripe SDK client, initialized from the secret key. Only ever used
 * server-side — this key must never be exposed to the frontend.
 *
 * The Stripe constructor throws immediately if given no key at all (not
 * just an invalid one), and since this module loads as part of the app's
 * startup require chain, that would crash the entire server — not just
 * checkout — whenever STRIPE_SECRET_KEY is unset. Falling back to a
 * placeholder keeps the app running; any real attempt to use Stripe without
 * a valid key then fails normally (a caught API error) at the point of use.
 */
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_not_configured');

module.exports = stripe;
