import { Link } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { selectCartCount } from '../store/cartSlice'
import { useAuth } from '../context/Authcontext'

const Footer = () => {
  const cartCount = useSelector(selectCartCount)
  const { isLoggedIn } = useAuth()

  const year = new Date().getFullYear()

  return (
    <footer className="bg-gray-900 text-gray-300 mt-16">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-3">
            <Link to="/" className="text-2xl font-bold text-white">
              ShopZone
            </Link>
            <p className="text-sm text-gray-400 leading-relaxed">
              Your one-stop shop for the best products at unbeatable prices. Shop smart, live better.
            </p>
            <div className="flex gap-3 pt-2">
              <a href="https://twitter.com" target="_blank" rel="noreferrer" aria-label="Twitter" className="w-9 h-9 rounded-full bg-gray-800 hover:bg-indigo-600 flex items-center justify-center transition">
                𝕏
              </a>
              <a href="https://facebook.com" target="_blank" rel="noreferrer" aria-label="Facebook" className="w-9 h-9 rounded-full bg-gray-800 hover:bg-indigo-600 flex items-center justify-center transition">
                f
              </a>
              <a href="https://instagram.com" target="_blank" rel="noreferrer" aria-label="Instagram" className="w-9 h-9 rounded-full bg-gray-800 hover:bg-indigo-600 flex items-center justify-center transition">
                📷
              </a>
              <a href="https://github.com" target="_blank" rel="noreferrer" aria-label="GitHub" className="w-9 h-9 rounded-full bg-gray-800 hover:bg-indigo-600 flex items-center justify-center transition">
                ⌥
              </a>
            </div>
          </div>

          {/* Shop links */}
          <div>
            <h3 className="text-white font-semibold mb-4 text-sm uppercase tracking-wide">Shop</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/" className="hover:text-indigo-400 transition">All Products</Link>
              </li>
              <li>
                <Link to="/cart" className="hover:text-indigo-400 transition flex items-center gap-1">
                  Cart
                  {cartCount > 0 && (
                    <span className="bg-indigo-600 text-white text-xs rounded-full px-2">
                      {cartCount}
                    </span>
                  )}
                </Link>
              </li>
              <li>
                <Link to="/checkout" className="hover:text-indigo-400 transition">Checkout</Link>
              </li>
            </ul>
          </div>

          {/* Account links */}
          <div>
            <h3 className="text-white font-semibold mb-4 text-sm uppercase tracking-wide">Account</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/profile" className="hover:text-indigo-400 transition">My Profile</Link>
              </li>
              {isLoggedIn ? (
                <li>
                  <Link to="/profile" className="hover:text-indigo-400 transition">Orders</Link>
                </li>
              ) : (
                <>
                  <li>
                    <Link to="/login" className="hover:text-indigo-400 transition">Login</Link>
                  </li>
                  <li>
                    <Link to="/register" className="hover:text-indigo-400 transition">Sign Up</Link>
                  </li>
                </>
              )}
            </ul>
          </div>

          {/* Support / Contact */}
          <div>
            <h3 className="text-white font-semibold mb-4 text-sm uppercase tracking-wide">Support</h3>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <span>📧</span>
                <a href="mailto:support@shopzone.com" className="hover:text-indigo-400 transition">support@shopzone.com</a>
              </li>
              <li className="flex items-center gap-2">
                <span>📞</span>
                <a href="tel:+18001234567" className="hover:text-indigo-400 transition">+1 (800) 123-4567</a>
              </li>
              <li className="flex items-start gap-2">
                <span>📍</span>
                <span>123 Market Street, Suite 100, San Francisco, CA</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-gray-800 mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-gray-500">
          <p>© {year} ShopZone. All rights reserved.</p>
          <div className="flex gap-5">
            <a href="#" className="hover:text-indigo-400 transition">Privacy Policy</a>
            <a href="#" className="hover:text-indigo-400 transition">Terms of Service</a>
            <a href="#" className="hover:text-indigo-400 transition">Shipping Info</a>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer
