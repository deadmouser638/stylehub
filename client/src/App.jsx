import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import MobileBottomNav from './components/MobileBottomNav';
import ScrollManager from './components/ScrollManager';
import SearchOverlay from './components/SearchOverlay';
import VisualSearchModal from './components/VisualSearchModal';
import QuickViewModal from './components/QuickViewModal';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Cart from './pages/Cart';
import Wishlist from './pages/Wishlist';
import Checkout from './pages/Checkout';
import Orders from './pages/Orders';
import Profile from './pages/Profile';
import NotFound from './pages/NotFound';
import ProductListing from './pages/ProductListing';
import ProductDetail from './pages/ProductDetail';
import HelpPage from './pages/HelpPage';
import TrackOrder from './pages/TrackOrder';
import AdminInventory from './pages/admin/AdminInventory';
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminProducts from './pages/admin/AdminProducts';
import AdminOrders from './pages/admin/AdminOrders';
import AdminCoupons from './pages/admin/AdminCoupons';
import AdminOffers from './pages/admin/AdminOffers';
import ScrollProgress from './components/ui/ScrollProgress';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { WishlistProvider } from './context/WishlistContext';
import { CatalogProvider } from './context/CatalogContext';
import { UIProvider } from './context/UIContext';

const protect = (element) => <ProtectedRoute>{element}</ProtectedRoute>;

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <CartProvider>
          <WishlistProvider>
            <CatalogProvider>
              <Router>
                <UIProvider>
                  <ScrollProgress />
                  <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-on-ink">Skip to content</a>
                  <div className="flex min-h-screen flex-col">
                    <Toaster
                      position="top-center"
                      toastOptions={{
                        style: { background: 'var(--ink)', color: 'var(--on-ink)', borderRadius: '999px', fontWeight: 700, fontSize: '14px', padding: '10px 18px' },
                        success: { iconTheme: { primary: 'var(--success)', secondary: 'var(--on-success)' } },
                        error: { iconTheme: { primary: 'var(--accent)', secondary: '#fff' } },
                      }}
                    />
                    <ScrollManager />
                    <Navbar />
                    <main id="main" className="flex-grow pb-16 md:pb-0">
                      <Routes>
                        <Route path="/" element={<Home />} />
                        <Route path="/products/:category" element={<ProductListing />} />
                        <Route path="/products" element={<ProductListing />} />
                        <Route path="/product/:id" element={<ProductDetail />} />
                        <Route path="/login" element={<Login />} />
                        <Route path="/register" element={<Register />} />
                        <Route path="/help/:slug" element={<HelpPage />} />
                        <Route path="/track" element={<TrackOrder />} />
                        <Route path="/cart" element={<Cart />} />
                        <Route path="/wishlist" element={protect(<Wishlist />)} />
                        <Route path="/checkout" element={protect(<Checkout />)} />
                        <Route path="/orders" element={protect(<Orders />)} />
                        <Route path="/profile" element={protect(<Profile />)} />
                        <Route path="/admin" element={<AdminLayout />}>
                          <Route index element={<AdminDashboard />} />
                          <Route path="products" element={<AdminProducts />} />
                          <Route path="orders" element={<AdminOrders />} />
                          <Route path="inventory" element={<AdminInventory />} />
                          <Route path="coupons" element={<AdminCoupons />} />
                          <Route path="offers" element={<AdminOffers />} />
                        </Route>
                        <Route path="*" element={<NotFound />} />
                      </Routes>
                    </main>
                    <Footer />
                    <MobileBottomNav />
                  </div>
                  <SearchOverlay />
                  <VisualSearchModal />
                  <QuickViewModal />
                </UIProvider>
              </Router>
            </CatalogProvider>
          </WishlistProvider>
        </CartProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
