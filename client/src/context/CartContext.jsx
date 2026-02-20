import { createContext, useState, useEffect } from 'react';

export const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState(() => {
    const storedCart = localStorage.getItem('cartItems');
    return storedCart ? JSON.parse(storedCart) : [];
  });

  const [shippingAddress, setShippingAddress] = useState(() => {
    const storedAddress = localStorage.getItem('shippingAddress');
    return storedAddress ? JSON.parse(storedAddress) : {};
  });

  const [paymentMethod, setPaymentMethod] = useState(() => {
    const storedMethod = localStorage.getItem('paymentMethod');
    return storedMethod ? JSON.parse(storedMethod) : 'PayPal';
  });

  useEffect(() => {
    localStorage.setItem('cartItems', JSON.stringify(cartItems));
  }, [cartItems]);

  useEffect(() => {
    localStorage.setItem('shippingAddress', JSON.stringify(shippingAddress));
  }, [shippingAddress]);

  useEffect(() => {
    localStorage.setItem('paymentMethod', JSON.stringify(paymentMethod));
  }, [paymentMethod]);

  const addToCart = (product, qty) => {
    const existItem = cartItems.find((x) => x._id === product._id);

    if (existItem) {
      setCartItems(
        cartItems.map((x) =>
          x._id === existItem._id ? { ...existItem, qty: existItem.qty + qty } : x
        )
      );
    } else {
      setCartItems([...cartItems, { ...product, qty }]);
    }
  };

  const removeFromCart = (id) => {
    setCartItems(cartItems.filter((x) => x._id !== id));
  };

  const saveShippingAddress = (data) => {
    setShippingAddress(data);
  };

  const savePaymentMethod = (data) => {
    setPaymentMethod(data);
  };

  const clearCart = () => {
    setCartItems([]);
    localStorage.removeItem('cartItems');
  };

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
