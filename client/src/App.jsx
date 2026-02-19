import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import HomeScreen from './pages/HomeScreen';
import ProductScreen from './pages/ProductScreen';
import CartScreen from './pages/CartScreen';

function App() {
  return (
    <Router>
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="container mx-auto px-4 py-8 flex-grow">
          <Routes>
            <Route path="/" element={<HomeScreen />} />
            <Route path="/product/:id" element={<ProductScreen />} />
            <Route path="/cart" element={<CartScreen />} />
            <Route path="/login" element={<h1 className="text-3xl font-bold text-center">Login Page</h1>} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}

export default App;
