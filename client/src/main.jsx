import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { CartProvider } from './context/CartContext';
import { AuthProvider } from './context/AuthContext';
import { BookmarkProvider } from './context/BookmarkContext';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <BookmarkProvider>
        <CartProvider>
          <App />
        </CartProvider>
      </BookmarkProvider>
    </AuthProvider>
  </React.StrictMode>,
)
