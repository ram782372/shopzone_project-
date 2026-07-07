import { useDispatch, useSelector } from 'react-redux'
import { addToCart, increase, decrease, selectCartItems } from '../store/cartSlice'

const ProductCard = ({ product }) => {
  const { title, price, discountPercentage, rating, thumbnail, category, brand } = product
  const dispatch = useDispatch()
  const cartItems = useSelector(selectCartItems)
  const cartItem = cartItems.find((item) => item.id === product.id)
  const discountedPrice = (price - (price * discountPercentage) / 100).toFixed(2)

  return (
    <div className="bg-white rounded-2xl shadow hover:shadow-lg transition overflow-hidden flex flex-col">
      <img
        src={thumbnail}
        alt={title}
        className="w-full h-48 object-cover"
        loading="lazy"
      />
      <div className="p-4 flex flex-col flex-1 gap-2">
        <span className="text-xs text-indigo-500 font-semibold uppercase tracking-wide">{category}</span>
        <h3 className="text-sm font-semibold text-gray-800 line-clamp-2">{title}</h3>
        {brand && <p className="text-xs text-gray-400">{brand}</p>}

        <div className="flex items-center gap-2 mt-auto">
          <span className="text-lg font-bold text-indigo-600">${discountedPrice}</span>
          <span className="text-xs text-gray-400 line-through">${price}</span>
          <span className="text-xs text-green-500 font-medium ml-auto">-{Math.round(discountPercentage)}%</span>
        </div>

        <div className="flex items-center gap-1 text-xs text-yellow-500">
          {'★'.repeat(Math.round(rating))}{'☆'.repeat(5 - Math.round(rating))}
          <span className="text-gray-400 ml-1">({rating})</span>
        </div>

        {cartItem ? (
          <div className="mt-2 flex items-center justify-between border border-indigo-600 rounded-lg overflow-hidden">
            <button
              onClick={() => dispatch(decrease(product.id))}
              className="flex-1 py-2 text-indigo-600 font-bold text-lg hover:bg-indigo-50 transition"
            >
              −
            </button>
            <span className="px-4 text-sm font-semibold text-gray-800">{cartItem.quantity}</span>
            <button
              onClick={() => dispatch(increase(product.id))}
              className="flex-1 py-2 text-indigo-600 font-bold text-lg hover:bg-indigo-50 transition"
            >
              +
            </button>
          </div>
        ) : (
          <button
            onClick={() => dispatch(addToCart({ id: product.id, title, price, thumbnail }))}
            className="mt-2 w-full bg-indigo-600 text-white py-2 rounded-lg text-sm hover:bg-indigo-700 transition"
          >
            Add to Cart
          </button>
        )}
      </div>
    </div>
  )
}

export default ProductCard
