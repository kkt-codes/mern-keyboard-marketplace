import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Header from './components/Header';
import Footer from './components/Footer';
import HomeScreen from './pages/HomeScreen';
import ProductScreen from './pages/ProductScreen';
import CartScreen from './pages/CartScreen';
import LoginScreen from './pages/LoginScreen';
import RegisterScreen from './pages/RegisterScreen';
import ShippingScreen from './pages/ShippingScreen';
import PaymentScreen from './pages/PaymentScreen';
import PlaceOrderScreen from './pages/PlaceOrderScreen';
import OrderScreen from './pages/OrderScreen';
import ProfileScreen from './pages/ProfileScreen';
import ProductEditScreen from './pages/ProductEditScreen';
import AboutScreen from './pages/AboutScreen';
import ContactScreen from './pages/ContactScreen';
import FaqScreen from './pages/FaqScreen';
import TermsPrivacyScreen from './pages/TermsPrivacyScreen';
import DashboardLayout from './layouts/DashboardLayout';
import DashboardOverview from './pages/dashboard/DashboardOverview';
import MyOrdersPage from './pages/dashboard/MyOrdersPage';
import MyProductsPage from './pages/dashboard/MyProductsPage';
import OrdersReceivedPage from './pages/dashboard/OrdersReceivedPage';
import BookmarksPage from './pages/dashboard/BookmarksPage';

function App() {
  return (
    <Router>
      <div className="flex flex-col min-h-screen">
        <Toaster position="top-center" reverseOrder={false} />
        <Header />
        <main className="container mx-auto px-4 py-8 flex-grow">
          <Routes>
            <Route path="/" element={<HomeScreen />} />
            <Route path="/product/:id" element={<ProductScreen />} />
            <Route path="/cart" element={<CartScreen />} />
            <Route path="/login" element={<LoginScreen />} />
            <Route path="/register" element={<RegisterScreen />} />
            <Route path="/shipping" element={<ShippingScreen />} />
            <Route path="/payment" element={<PaymentScreen />} />
            <Route path="/placeorder" element={<PlaceOrderScreen />} />
            <Route path="/order/:id" element={<OrderScreen />} />
            <Route path="/profile" element={<ProfileScreen />} />
            <Route path="/dashboard" element={<DashboardLayout />}>
              <Route index element={<DashboardOverview />} />
              <Route path="orders" element={<MyOrdersPage />} />
              <Route path="bookmarks" element={<BookmarksPage />} />
              <Route path="products" element={<MyProductsPage />} />
              <Route path="orders-received" element={<OrdersReceivedPage />} />
            </Route>
            <Route path="/seller/product/new" element={<ProductEditScreen />} />
            <Route path="/seller/product/:id/edit" element={<ProductEditScreen />} />
            <Route path="/about" element={<AboutScreen />} />
            <Route path="/contact" element={<ContactScreen />} />
            <Route path="/faq" element={<FaqScreen />} />
            <Route path="/terms" element={<TermsPrivacyScreen />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}

export default App;
