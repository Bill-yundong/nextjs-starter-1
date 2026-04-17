import Head from 'next/head';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useApp } from '../context/AppContext';
import { fetchProducts, CATEGORIES } from '../data/products';

export default function Home() {
  const { state, dispatch } = useApp();
  const [loading, setLoading] = useState(true);

  // Load products on mount
  useEffect(() => {
    const loadProducts = async () => {
      dispatch({ type: 'PRODUCTS_START' });
      try {
        const products = await fetchProducts();
        dispatch({ type: 'PRODUCTS_SUCCESS', payload: products });
      } catch (error) {
        dispatch({ type: 'PRODUCTS_FAILURE', payload: error.message });
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, [dispatch]);

  const handleSearch = (e) => {
    dispatch({
      type: 'SET_FILTER',
      payload: { key: 'search', value: e.target.value }
    });
  };

  const handleCategoryChange = (categoryId) => {
    dispatch({
      type: 'SET_FILTER',
      payload: { key: 'category', value: categoryId }
    });
  };

  const handleSortChange = (sortBy) => {
    dispatch({
      type: 'SET_FILTER',
      payload: { key: 'sortBy', value: sortBy }
    });
  };

  const handlePriceChange = (type, value) => {
    dispatch({
      type: 'SET_FILTER',
      payload: { key: type === 'min' ? 'minPrice' : 'maxPrice', value: Number(value) }
    });
  };

  const clearFilters = () => {
    dispatch({ type: 'CLEAR_FILTERS' });
  };

  // Bug 7: 使用闭包陷阱捕获过时的购物车状态
  const handleAddToCart = async (product) => {
    dispatch({ type: 'CART_START' });
    
    // Bug: 在异步开始前捕获当前状态（可能过时）
    const staleCartItems = JSON.parse(JSON.stringify(state.cart.items));
    
    // Bug: 模拟API延迟
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Bug: 使用过时的staleCartItems进行更新
    // 当快速点击时，所有并发调用都使用最初捕获的状态
    dispatch({ 
      type: 'CART_ADD_ITEM_WITH_STALE_STATE', 
      payload: { 
        staleItems: staleCartItems,  // 过时的状态
        newItem: product 
      } 
    });
    dispatch({
      type: 'ADD_NOTIFICATION',
      payload: { type: 'success', message: `Added ${product.name} to cart!` }
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-2xl">Loading products...</div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Next.js Starter - Shop</title>
        <meta name="description" content="Shop the best products" />
      </Head>

      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-4">
            Welcome to Next.js Starter
          </h1>
          <p className="text-xl md:text-2xl mb-8">
            Discover amazing products at unbeatable prices
          </p>
          <Link
            href="#products"
            className="inline-block bg-white text-blue-600 py-3 px-8 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
          >
            Shop Now
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8" id="products">
        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Search
              </label>
              <input
                type="text"
                value={state.filters.search}
                onChange={handleSearch}
                placeholder="Search products..."
                className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Category Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <select
                value={state.filters.category}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Price Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Price Range
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={state.filters.minPrice}
                  onChange={(e) => handlePriceChange('min', e.target.value)}
                  placeholder="Min"
                  className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span>-</span>
                <input
                  type="number"
                  value={state.filters.maxPrice}
                  onChange={(e) => handlePriceChange('max', e.target.value)}
                  placeholder="Max"
                  className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Sort */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sort By
              </label>
              <select
                value={state.filters.sortBy}
                onChange={(e) => handleSortChange(e.target.value)}
                className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="default">Default</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="name-asc">Name: A-Z</option>
                <option value="name-desc">Name: Z-A</option>
              </select>
            </div>
          </div>

          {/* Clear Filters */}
          <div className="mt-4 flex justify-between items-center">
            <p className="text-gray-600">
              Showing {state.filteredProducts.length} products
            </p>
            {(state.filters.search || state.filters.category !== 'all' || state.filters.sortBy !== 'default') && (
              <button
                onClick={clearFilters}
                className="text-blue-600 hover:text-blue-800 text-sm"
              >
                Clear all filters
              </button>
            )}
          </div>
        </div>

        {/* Products Grid */}
        {state.filteredProducts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 text-lg">No products found matching your criteria.</p>
            <button
              onClick={clearFilters}
              className="mt-4 text-blue-600 hover:text-blue-800"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {state.filteredProducts.map((product) => (
              <div
                key={product.id}
                className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow group"
              >
                {/* Product Image */}
                <Link href={`/product/${product.id}`}>
                  <a className="relative aspect-square block overflow-hidden">
                    {product.image.startsWith('http') ? (
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <Image
                        src={product.image}
                        alt={product.name}
                        layout="fill"
                        objectFit="cover"
                        className="group-hover:scale-105 transition-transform duration-300"
                      />
                    )}
                    {product.stock <= 3 && product.stock > 0 && (
                      <div className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded">
                        Low Stock
                      </div>
                    )}
                    {product.stock === 0 && (
                      <div className="absolute top-2 right-2 bg-gray-500 text-white text-xs px-2 py-1 rounded">
                        Out of Stock
                      </div>
                    )}
                  </a>
                </Link>

                {/* Product Info */}
                <div className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs text-gray-500 uppercase tracking-wide">
                      {product.category.name}
                    </span>
                    <div className="flex items-center text-yellow-400">
                      <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      <span className="ml-1 text-xs text-gray-600">{product.rating}</span>
                    </div>
                  </div>

                  <Link href={`/product/${product.id}`}>
                    <a className="font-semibold text-lg mb-1 hover:text-blue-600 cursor-pointer block">
                      {product.name}
                    </a>
                  </Link>

                  <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                    {product.description}
                  </p>

                  <div className="flex justify-between items-center">
                    <span className="text-xl font-bold text-gray-900">
                      ${product.price}
                    </span>
                    <button
                      onClick={() => handleAddToCart(product)}
                      disabled={product.stock === 0}
                      className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      {product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
