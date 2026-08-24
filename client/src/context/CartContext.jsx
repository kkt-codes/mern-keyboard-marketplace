import { createContext, useState, useEffect, useContext, useRef } from 'react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { AuthContext } from './AuthContext';

export const CartContext = createContext();

const GUEST_CART_KEY = 'guestCart';

const readGuestCart = () => {
  try {
    return JSON.parse(localStorage.getItem(GUEST_CART_KEY)) || [];
  } catch {
    return [];
  }
};

/** The server only wants product ids and quantities. */
const toPayload = (items) => items.map((item) => ({ product: item._id, qty: item.qty }));

export const CartProvider = ({ children }) => {
  const { user, loading: authLoading } = useContext(AuthContext);

  const [cartItems, setCartItems] = useState([]);
  const [shippingAddress, setShippingAddress] = useState({});
  const [paymentMethod, setPaymentMethod] = useState('Stripe');

  // Tracks who the cart currently belongs to, so the effect below can tell a
  // fresh page load apart from an actual login/logout transition.
  // `undefined` means "haven't settled yet".
  const ownerId = useRef(undefined);

  useEffect(() => {
    if (authLoading) return;

    const currentId = user?._id ?? null;
    const previousId = ownerId.current;
    if (currentId && currentId === previousId) return; // same user, nothing to do
    ownerId.current = currentId;

    if (currentId) {
      // Signed in: fold anything picked up as a guest into the saved cart.
      // Merging with an empty list just returns the saved cart, so this one
      // call covers both "logged in just now" and "reloaded the page".
      const guestItems = readGuestCart();
      (async () => {
        try {
          const { data } = await api.post('/cart/merge', { items: toPayload(guestItems) });
          setCartItems(data);
          localStorage.removeItem(GUEST_CART_KEY);
          if (guestItems.length > 0) {
            toast.success('Your cart was restored');
          }
        } catch {
          // Fall back to the guest items rather than appearing to lose them.
          setCartItems(guestItems);
        }
      })();
      return;
    }

    if (previousId) {
      // Logged out: the cart belonged to that account, so nothing should be
      // left behind for whoever uses this browser next. Shipping details go
      // too — they're the previous user's personal data.
      setCartItems([]);
      setShippingAddress({});
      setPaymentMethod('Stripe');
      localStorage.removeItem(GUEST_CART_KEY);
      localStorage.removeItem('shippingAddress');
      localStorage.removeItem('paymentMethod');
      return;
    }

    // First load as a guest: pick up whatever is in this browser.
    setCartItems(readGuestCart());
    try {
      setShippingAddress(JSON.parse(localStorage.getItem('shippingAddress')) || {});
      setPaymentMethod(JSON.parse(localStorage.getItem('paymentMethod')) || 'Stripe');
    } catch {
      // Ignore malformed storage and keep the defaults.
    }

    // Older builds kept the cart under a single shared `cartItems` key that
    // was never cleared on logout, so it leaked between accounts. Drop it
    // rather than migrating it — we can't tell whose cart it was.
    localStorage.removeItem('cartItems');
  }, [authLoading, user]);

  useEffect(() => {
    if (!user) {
      localStorage.setItem('shippingAddress', JSON.stringify(shippingAddress));
    }
  }, [shippingAddress, user]);

  useEffect(() => {
    if (!user) {
      localStorage.setItem('paymentMethod', JSON.stringify(paymentMethod));
    }
  }, [paymentMethod, user]);

  /**
   * Applies a new cart locally, then persists it: to the server when signed
   * in, to localStorage when not. The local update lands first so the UI
   * stays instant.
   * @param {object[]} nextItems
   */
  const persistCart = async (nextItems) => {
    setCartItems(nextItems);

    if (!user) {
      localStorage.setItem(GUEST_CART_KEY, JSON.stringify(nextItems));
      return;
    }

    try {
      const { data } = await api.put('/cart', { items: toPayload(nextItems) });
      // Trust the server's version — it caps quantities at available stock
      // and drops anything no longer purchasable.
      setCartItems(data);
    } catch {
      toast.error('Could not save your cart');
    }
  };

  // `qty` is always the item's intended new total quantity, not a delta —
  // every caller (ProductScreen, CartScreen's stepper) already computes the
  // final number before calling this.
  const addToCart = (product, qty) => {
    const exists = cartItems.some((x) => x._id === product._id);
    const next = exists
      ? cartItems.map((x) => (x._id === product._id ? { ...x, qty } : x))
      : [...cartItems, { ...product, qty }];

    persistCart(next);
  };

  const removeFromCart = (id) => {
    persistCart(cartItems.filter((x) => x._id !== id));
  };

  const clearCart = () => {
    persistCart([]);
  };

  const saveShippingAddress = (data) => setShippingAddress(data);
  const savePaymentMethod = (data) => setPaymentMethod(data);

  return (
    <CartContext.Provider
      value={{
        cartItems,
        addToCart,
        removeFromCart,
        shippingAddress,
        saveShippingAddress,
        paymentMethod,
        savePaymentMethod,
        clearCart
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export default CartContext;
