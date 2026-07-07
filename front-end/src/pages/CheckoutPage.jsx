import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { clearCart, selectCartItems, selectCartTotal } from '../store/cartSlice'
import { selectCurrentUser } from '../store/authSlice'

const CheckoutPage = () => {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const total = useSelector(selectCartTotal)
  const cartItems = useSelector(selectCartItems)
  const user = useSelector(selectCurrentUser)
  const token = useSelector((state) => state.auth.token)

  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    fullName: '', address: '', city: '', zip: '',
    cardNumber: '', expiry: '', cvv: '',
  })

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setProcessing(true)

    try {
      // map cart items to order schema shape
      const orderItems = cartItems.map((item) => ({
        productId: item.id,
        name: item.title,
        price: item.price,
        qty: item.quantity,
        thumbnail: item.thumbnail,
      }))

      await fetch('http://localhost:5000/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ orderItems, totalAmount: parseFloat(total) }),
      }).then(async (res) => {
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.message || 'Failed to place order')
        }
      })

      // simulate payment processing delay
      setTimeout(() => {
        dispatch(clearCart())
        navigate('/', { state: { paymentSuccess: true } })
      }, 5000)
    } catch (err) {
      setError(err.message)
      setProcessing(false)
    }
  }

  if (processing) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-6">
        <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-lg font-semibold text-gray-700">Processing your payment...</p>
        <p className="text-sm text-gray-400">Please don't close this page</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Checkout</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {/* Delivery Address */}
        <div className="bg-white rounded-2xl shadow p-6 flex flex-col gap-4">
          <h2 className="font-semibold text-gray-700 text-base">Delivery Address</h2>
          <input name="fullName" value={form.fullName} onChange={handleChange} required
            placeholder="Full Name"
            className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          <input name="address" value={form.address} onChange={handleChange} required
            placeholder="Street Address"
            className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          <div className="flex gap-3">
            <input name="city" value={form.city} onChange={handleChange} required
              placeholder="City"
              className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            <input name="zip" value={form.zip} onChange={handleChange} required
              placeholder="ZIP Code" maxLength={10}
              className="w-32 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          </div>
        </div>

        {/* Payment Details */}
        <div className="bg-white rounded-2xl shadow p-6 flex flex-col gap-4">
          <h2 className="font-semibold text-gray-700 text-base">Payment Details</h2>
          <input name="cardNumber" value={form.cardNumber} onChange={handleChange} required
            placeholder="Card Number (16 digits)" maxLength={16}
            className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          <div className="flex gap-3">
            <input name="expiry" value={form.expiry} onChange={handleChange} required
              placeholder="MM/YY" maxLength={5}
              className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            <input name="cvv" value={form.cvv} onChange={handleChange} required
              placeholder="CVV" maxLength={3}
              className="w-28 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          </div>
        </div>

        {/* Order total + submit */}
        <div className="bg-white rounded-2xl shadow p-6 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">Order Total</p>
            <p className="text-xl font-bold text-indigo-600">${total}</p>
          </div>
          <button type="submit"
            className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-indigo-700 transition">
            Proceed to Payment
          </button>
        </div>
      </form>
    </div>
  )
}

export default CheckoutPage
