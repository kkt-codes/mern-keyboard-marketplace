import { useState, useEffect } from 'react';
import api from '../services/api';

/**
 * Tells visitors this is a demo and which card to use, shown just before they
 * leave for Stripe.
 *
 * Stripe's hosted page has a small "TEST MODE" badge but never says what to
 * type, so without this someone trying the site reaches for a real card. Test
 * mode correctly refuses it, and the honest conclusion from the other side of
 * that screen is "this checkout is broken".
 *
 * Renders nothing unless the server reports Stripe is in test mode, so real
 * keys make it disappear on their own.
 */
const DemoPaymentNotice = () => {
  const [testMode, setTestMode] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { data } = await api.get('/config');
        if (!cancelled) setTestMode(Boolean(data.stripeTestMode));
      } catch {
        // A hint is not worth surfacing an error over — stay hidden.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (!testMode) return null;

  return (
    <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
      <p className="font-semibold">Demo checkout — no real payment is taken.</p>
      <p className="mt-1 text-amber-200/80">Pay with Stripe&apos;s test card:</p>
      <dl className="mt-2 space-y-1 font-mono text-[11px] text-amber-100">
        <div className="flex justify-between gap-3">
          <dt className="text-amber-200/70">Card</dt>
          <dd className="select-all">4242 4242 4242 4242</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-amber-200/70">Expiry</dt>
          <dd>any future date</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-amber-200/70">CVC / ZIP</dt>
          <dd>any digits</dd>
        </div>
      </dl>
      <p className="mt-2 text-amber-200/70">
        A real card will be declined — test mode only accepts test cards.
      </p>
    </div>
  );
};

export default DemoPaymentNotice;
