import { useEffect, useState, useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import ProductCard from '../components/ProductCard'
import { fetchProducts } from '../api/products.api'
import { useSearch } from '../context/Searchcontext'

const SORT_OPTIONS = [
  { label: 'Default', value: 'default' },
  { label: 'Price: Low to High', value: 'price_asc' },
  { label: 'Price: High to Low', value: 'price_desc' },
  { label: 'Rating: High to Low', value: 'rating_desc' },
  { label: 'Discount: High to Low', value: 'discount_desc' },
]

const HomePage = () => {
  const location = useLocation()
  const { searchQuery } = useSearch()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [sortBy, setSortBy] = useState('default')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [priceRange, setPriceRange] = useState(10000)
  const [showSuccess, setShowSuccess] = useState(false)

  useEffect(() => {
    if (location.state?.paymentSuccess) {
      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 4000)
      window.history.replaceState({}, '')
    }
  }, [])

  useEffect(() => {
    fetchProducts()
      .then(setProducts)
      .catch(() => setError('Failed to fetch products. Please try again.'))
      .finally(() => setLoading(false))
  }, [])

  const categories = useMemo(() => {
    const cats = [...new Set(products.map((p) => p.category))]
    return ['all', ...cats]
  }, [products])

  const maxPrice = useMemo(() => {
    if (!products.length) return 10000
    return Math.ceil(Math.max(...products.map((p) => p.price)))
  }, [products])

  const filtered = useMemo(() => {
    let list = [...products]

    // search filter
    if (searchQuery) {
      list = list.filter((p) =>
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // category filter
    if (selectedCategory !== 'all') {
      list = list.filter((p) => p.category === selectedCategory)
    }

    // price filter
    list = list.filter((p) => p.price <= priceRange)

    // sort
    switch (sortBy) {
      case 'price_asc':
        list.sort((a, b) => a.price - b.price)
        break
      case 'price_desc':
        list.sort((a, b) => b.price - a.price)
        break
      case 'rating_desc':
        list.sort((a, b) => b.rating - a.rating)
        break
      case 'discount_desc':
        list.sort((a, b) => b.discountPercentage - a.discountPercentage)
        break
      default:
        break
    }

    return list
  }, [products, searchQuery, selectedCategory, priceRange, sortBy])

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center text-red-500 mt-20 text-lg">{error}</div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Payment success toast */}
      {showSuccess && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-green-500 text-white px-6 py-3 rounded-2xl shadow-lg flex items-center gap-2 text-sm font-medium animate-bounce">
          ✅ Payment successful! Thank you for your order.
        </div>
      )}
      {/* Filters & Sort bar */}
      <div className="flex flex-wrap gap-4 items-end mb-8 bg-white p-4 rounded-2xl shadow">
        {/* Category filter */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-gray-500 uppercase">Category</label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </option>
            ))}
          </select>
        </div>

        {/* Price range filter */}
        <div className="flex flex-col gap-1 min-w-[180px]">
          <label className="text-xs font-semibold text-gray-500 uppercase">
            Max Price: <span className="text-indigo-600">${priceRange}</span>
          </label>
          <input
            type="range"
            min={1}
            max={maxPrice}
            value={priceRange}
            onChange={(e) => setPriceRange(Number(e.target.value))}
            className="accent-indigo-600"
          />
        </div>

        {/* Sort */}
        <div className="flex flex-col gap-1 ml-auto">
          <label className="text-xs font-semibold text-gray-500 uppercase">Sort By</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Results count */}
      <p className="text-sm text-gray-500 mb-4">
        Showing <span className="font-semibold text-gray-700">{filtered.length}</span> products
        {searchQuery && <span> for "<span className="text-indigo-600">{searchQuery}</span>"</span>}
      </p>

      {/* Product grid */}
      {filtered.length === 0 ? (
        <div className="text-center text-gray-400 mt-20 text-lg">No products found.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {filtered.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  )
}

export default HomePage
