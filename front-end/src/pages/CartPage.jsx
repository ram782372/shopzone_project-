import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { increase, decrease, clearCart, selectCartItems, selectCartTotal } from '../store/cartSlice'

const CartPage = () => {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const items = useSelector(selectCartItems)
  const total = useSelector(selectCartTotal)

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-gray-400">
        <span className="text-6xl mb-4">🛒</span>
        <h2 className="text-2xl font-semibold">Your cart is empty</h2>
        <button
          onClick={() => navigate('/')}
          className="mt-4 bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition text-sm"
        >
          Continue Shopping
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Your Cart</h1>

      <div className="flex flex-col gap-4">
        {items.map((item) => (
          <div key={item.id} className="bg-white rounded-2xl shadow p-4 flex items-center gap-4">
            <img src={item.thumbnail} alt={item.title} className="w-20 h-20 object-cover rounded-xl" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-800 line-clamp-2">{item.title}</p>
              <p className="text-indigo-600 font-bold mt-1">${(item.price * item.quantity).toFixed(2)}</p>
              <p className="text-xs text-gray-400">${item.price} each</p>
            </div>
            <div className="flex items-center border border-indigo-600 rounded-lg overflow-hidden">
              <button
                onClick={() => dispatch(decrease(item.id))}
                className="px-3 py-2 text-indigo-600 font-bold hover:bg-indigo-50 transition"
              >
                −
              </button>
              <span className="px-3 text-sm font-semibold">{item.quantity}</span>
              <button
                onClick={() => dispatch(increase(item.id))}
                className="px-3 py-2 text-indigo-600 font-bold hover:bg-indigo-50 transition"
              >
                +
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="mt-8 bg-white rounded-2xl shadow p-6 flex flex-col gap-4">
        <div className="flex justify-between text-gray-600 text-sm">
          <span>Items ({items.reduce((s, i) => s + i.quantity, 0)})</span>
          <span>${total}</span>
        </div>
        <div className="flex justify-between font-bold text-gray-800 text-lg border-t pt-4">
          <span>Total</span>
          <span>${total}</span>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => dispatch(clearCart())}
            className="flex-1 border border-red-400 text-red-500 py-2 rounded-lg text-sm hover:bg-red-50 transition"
          >
            Clear Cart
          </button>
          <button
            onClick={() => navigate('/checkout')}
            className="flex-1 bg-indigo-600 text-white py-2 rounded-lg text-sm hover:bg-indigo-700 transition font-semibold"
          >
            Proceed to Checkout
          </button>
        </div>
      </div>
    </div>
  )
}

export default CartPage
