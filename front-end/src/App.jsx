import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { SearchProvider } from './context/Searchcontext'
import { AuthProvider } from './context/Authcontext'
import Navbar from './components/Navbar'
import HomePage from './pages/HomePage'
import CartPage from './pages/CartPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ProfilePage from './pages/ProfilePage'
import CheckoutPage from './pages/CheckoutPage'

const App = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SearchProvider>
          <div className="min-h-screen bg-gray-50">
            <Navbar />
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/cart" element={<CartPage />} />
              <Route path="/checkout" element={<CheckoutPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/profile" element={<ProfilePage />} />
            </Routes>
          </div>
        </SearchProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
