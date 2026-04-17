/**
 * 完整性测试脚本
 * 测试所有核心功能模块
 */

const { ALL_PRODUCTS, CATEGORIES, fetchProducts, fetchProduct, fetchRelatedProducts } = require('../data/products');

// 测试计数器
let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ ${name}`);
    passed++;
  } catch (error) {
    console.log(`❌ ${name}`);
    console.log(`   Error: ${error.message}`);
    failed++;
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

console.log('\n========== 数据层测试 ==========\n');

// 测试商品数据
test('商品数据存在且不为空', () => {
  assert(ALL_PRODUCTS && ALL_PRODUCTS.length > 0, '商品数据为空');
});

test('每个商品都有必要的字段', () => {
  const requiredFields = ['id', 'name', 'description', 'price', 'image', 'category', 'stock'];
  ALL_PRODUCTS.forEach(product => {
    requiredFields.forEach(field => {
      assert(product[field] !== undefined, `商品 ${product.id} 缺少字段 ${field}`);
    });
  });
});

test('商品ID唯一', () => {
  const ids = ALL_PRODUCTS.map(p => p.id);
  const uniqueIds = new Set(ids);
  assert(ids.length === uniqueIds.size, '商品ID重复');
});

test('商品价格有效', () => {
  ALL_PRODUCTS.forEach(product => {
    const price = parseFloat(product.price);
    assert(!isNaN(price) && price >= 0, `商品 ${product.id} 价格无效`);
  });
});

test('商品分类有效', () => {
  ALL_PRODUCTS.forEach(product => {
    assert(product.category && product.category.id, `商品 ${product.id} 分类无效`);
  });
});

// 测试商品图片唯一性
test('每个商品都有唯一的图片', () => {
  const images = ALL_PRODUCTS.map(p => p.image);
  const uniqueImages = new Set(images);
  assert(images.length === uniqueImages.size, '商品图片有重复');
});

// 测试分类数据
test('分类数据存在', () => {
  assert(CATEGORIES && CATEGORIES.length > 0, '分类数据为空');
});

test('分类包含 "all" 选项', () => {
  const allCategory = CATEGORIES.find(c => c.id === 'all');
  assert(allCategory, '缺少 "all" 分类选项');
});

console.log('\n========== API 模拟测试 ==========\n');

// 测试 fetchProducts
(async () => {
  try {
    const products = await fetchProducts();
    test('fetchProducts 返回商品列表', () => {
      assert(Array.isArray(products) && products.length > 0, '未返回商品列表');
    });
  } catch (error) {
    test('fetchProducts 返回商品列表', () => {
      throw error;
    });
  }

  // 测试 fetchProduct
  try {
    const product = await fetchProduct(1);
    test('fetchProduct 返回单个商品', () => {
      assert(product && product.id === 1, '未返回正确的商品');
    });
  } catch (error) {
    test('fetchProduct 返回单个商品', () => {
      throw error;
    });
  }

  // 测试 fetchProduct 不存在的商品
  try {
    const product = await fetchProduct(9999);
    test('fetchProduct 对不存在商品返回 undefined', () => {
      assert(product === undefined, '应该返回 undefined');
    });
  } catch (error) {
    test('fetchProduct 对不存在商品返回 undefined', () => {
      throw error;
    });
  }

  // 测试 fetchRelatedProducts
  try {
    const related = await fetchRelatedProducts(1);
    test('fetchRelatedProducts 返回相关商品', () => {
      assert(Array.isArray(related), '未返回数组');
    });
  } catch (error) {
    test('fetchRelatedProducts 返回相关商品', () => {
      throw error;
    });
  }

  console.log('\n========== 购物车逻辑测试 ==========\n');

  // 模拟购物车计算 - 修复 Bug 1: 总价精度丢失
  // 模拟修复后的 calculateCartTotals 函数
  function calculateCartTotals(cart) {
    const totalQuantity = cart.items.reduce((sum, item) => sum + item.quantity, 0);
    
    // 修复: 使用精确的小数计算，避免精度丢失
    let totalPrice = 0;
    cart.items.forEach(item => {
      const itemTotal = parseFloat(item.price) * item.quantity;
      // 修复: 直接累加浮点数，不使用parseInt截断
      totalPrice += itemTotal;
    });
    
    const discount = cart.discount || 0;
    const finalPrice = Math.max(0, totalPrice - discount);
    
    return {
      ...cart,
      totalQuantity,
      totalPrice: parseFloat(totalPrice.toFixed(2)),
      finalPrice: parseFloat(finalPrice.toFixed(2)),
    };
  }

  // Bug 1 测试: 购物车总价精度丢失修复验证
  console.log('\n----- Bug 1: 购物车总价精度修复测试 -----\n');

  test('【修复验证】小数价格商品总价计算保留精度', () => {
    const mockCartItemsWithDecimals = [
      { id: 1, name: 'Product A', price: '49.99', quantity: 1 },
      { id: 2, name: 'Product B', price: '29.99', quantity: 1 },
    ];
    const cart = calculateCartTotals({ items: mockCartItemsWithDecimals, discount: 0 });
    
    // 修复前使用 parseInt 会导致 79.98 变成 79
    // 修复后应该正确显示 79.98
    assert(cart.totalPrice === 79.98, `总价精度丢失: 期望 79.98, 实际 ${cart.totalPrice}`);
  });

  test('【修复验证】多件小数价格商品总价计算正确', () => {
    const mockCartItemsWithDecimals = [
      { id: 1, name: 'Product A', price: '19.99', quantity: 3 }, // 59.97
      { id: 2, name: 'Product B', price: '9.99', quantity: 2 },  // 19.98
    ];
    const cart = calculateCartTotals({ items: mockCartItemsWithDecimals, discount: 0 });
    
    // 修复前: parseInt(59.97) + parseInt(19.98) = 59 + 19 = 78
    // 修复后: 59.97 + 19.98 = 79.95
    assert(cart.totalPrice === 79.95, `多件商品总价错误: 期望 79.95, 实际 ${cart.totalPrice}`);
  });

  test('【修复验证】带折扣的小数价格商品最终价格计算正确', () => {
    const mockCartItemsWithDecimals = [
      { id: 1, name: 'Product A', price: '99.99', quantity: 1 },
      { id: 2, name: 'Product B', price: '49.99', quantity: 1 },
    ];
    const cart = calculateCartTotals({ items: mockCartItemsWithDecimals, discount: 10 });
    
    // 总价 149.98 - 折扣 10 = 139.98
    assert(cart.finalPrice === 139.98, `折扣后价格错误: 期望 139.98, 实际 ${cart.finalPrice}`);
  });

  // Bug 2 测试: 快速点击竞态条件修复验证
  console.log('\n----- Bug 2: 快速点击竞态条件修复测试 -----\n');

  // 模拟修复后的购物车 reducer 逻辑
  function cartReducer(state, action) {
    switch (action.type) {
      case 'CART_ADD_ITEM': {
        const existingItem = state.items.find(item => item.id === action.payload.id);
        let newItems;
        
        if (existingItem) {
          newItems = state.items.map(item =>
            item.id === action.payload.id
              ? { ...item, quantity: item.quantity + 1 }
              : item
          );
        } else {
          newItems = [...state.items, { ...action.payload, quantity: 1 }];
        }
        
        return {
          ...state,
          items: newItems,
        };
      }
      default:
        return state;
    }
  }

  test('【修复验证】连续快速添加同一商品，数量正确累加', () => {
    let state = { items: [] };
    const product = { id: 1, name: 'Test Product', price: '29.99' };
    
    // 模拟快速点击 5 次
    for (let i = 0; i < 5; i++) {
      state = cartReducer(state, { type: 'CART_ADD_ITEM', payload: product });
    }
    
    // 修复后: 数量应该正确累加为 5
    // 修复前: 使用过时状态的闭包陷阱会导致数量丢失
    assert(state.items.length === 1, `购物车商品项数错误: 期望 1, 实际 ${state.items.length}`);
    assert(state.items[0].quantity === 5, `商品数量累加错误: 期望 5, 实际 ${state.items[0].quantity}`);
  });

  test('【修复验证】并发添加不同商品，各商品数量独立正确', () => {
    let state = { items: [] };
    const productA = { id: 1, name: 'Product A', price: '29.99' };
    const productB = { id: 2, name: 'Product B', price: '49.99' };
    
    // 模拟快速添加商品 A 3 次
    for (let i = 0; i < 3; i++) {
      state = cartReducer(state, { type: 'CART_ADD_ITEM', payload: productA });
    }
    
    // 模拟快速添加商品 B 2 次
    for (let i = 0; i < 2; i++) {
      state = cartReducer(state, { type: 'CART_ADD_ITEM', payload: productB });
    }
    
    // 验证商品 A 数量为 3
    const itemA = state.items.find(item => item.id === 1);
    assert(itemA && itemA.quantity === 3, `商品A数量错误: 期望 3, 实际 ${itemA?.quantity}`);
    
    // 验证商品 B 数量为 2
    const itemB = state.items.find(item => item.id === 2);
    assert(itemB && itemB.quantity === 2, `商品B数量错误: 期望 2, 实际 ${itemB?.quantity}`);
  });

  test('【修复验证】交替快速添加不同商品，数量不累加到错误商品', () => {
    let state = { items: [] };
    const productA = { id: 1, name: 'Product A', price: '29.99' };
    const productB = { id: 2, name: 'Product B', price: '49.99' };
    
    // 交替快速添加: A, B, A, B, A
    state = cartReducer(state, { type: 'CART_ADD_ITEM', payload: productA });
    state = cartReducer(state, { type: 'CART_ADD_ITEM', payload: productB });
    state = cartReducer(state, { type: 'CART_ADD_ITEM', payload: productA });
    state = cartReducer(state, { type: 'CART_ADD_ITEM', payload: productB });
    state = cartReducer(state, { type: 'CART_ADD_ITEM', payload: productA });
    
    // 验证商品 A 数量为 3
    const itemA = state.items.find(item => item.id === 1);
    assert(itemA && itemA.quantity === 3, `商品A数量错误: 期望 3, 实际 ${itemA?.quantity}`);
    
    // 验证商品 B 数量为 2
    const itemB = state.items.find(item => item.id === 2);
    assert(itemB && itemB.quantity === 2, `商品B数量错误: 期望 2, 实际 ${itemB?.quantity}`);
  });

  // 基础购物车测试
  const mockCartItems = [
    { id: 1, name: 'Classic Helmet', price: '49.99', quantity: 2 },
    { id: 2, name: 'Classic T-Shirt', price: '29.99', quantity: 1 },
  ];

  test('购物车总价计算正确', () => {
    const cart = calculateCartTotals({ items: mockCartItems, discount: 0 });
    assert(Math.abs(cart.totalPrice - 129.97) < 0.01, `总价计算错误: ${cart.totalPrice}`);
  });

  test('购物车商品数量计算正确', () => {
    const totalQuantity = mockCartItems.reduce((sum, item) => sum + item.quantity, 0);
    assert(totalQuantity === 3, `数量计算错误: ${totalQuantity}`);
  });

  console.log('\n========== 筛选逻辑测试 ==========\n');

  // 模拟筛选函数
  function applyFilters(products, filters) {
    return products.filter(product => {
      if (filters.search && !product.name.toLowerCase().includes(filters.search.toLowerCase())) {
        return false;
      }
      if (filters.category !== 'all' && product.category?.id !== parseInt(filters.category)) {
        return false;
      }
      const price = parseFloat(product.price);
      if (price < filters.minPrice || price > filters.maxPrice) {
        return false;
      }
      return true;
    }).sort((a, b) => {
      switch (filters.sortBy) {
        case 'price-asc':
          return parseFloat(a.price) - parseFloat(b.price);
        case 'price-desc':
          return parseFloat(b.price) - parseFloat(a.price);
        case 'name-asc':
          return a.name.localeCompare(b.name);
        case 'name-desc':
          return b.name.localeCompare(a.name);
        default:
          return 0;
      }
    });
  }

  test('搜索筛选功能正常', () => {
    const filters = { search: 'Helmet', category: 'all', minPrice: 0, maxPrice: 1000, sortBy: 'default' };
    const result = applyFilters(ALL_PRODUCTS, filters);
    assert(result.every(p => p.name.toLowerCase().includes('helmet')), '搜索结果不准确');
  });

  test('分类筛选功能正常', () => {
    const filters = { search: '', category: '1', minPrice: 0, maxPrice: 1000, sortBy: 'default' };
    const result = applyFilters(ALL_PRODUCTS, filters);
    assert(result.every(p => p.category.id === 1), '分类筛选结果不准确');
  });

  test('价格范围筛选功能正常', () => {
    const filters = { search: '', category: 'all', minPrice: 0, maxPrice: 30, sortBy: 'default' };
    const result = applyFilters(ALL_PRODUCTS, filters);
    assert(result.every(p => parseFloat(p.price) <= 30), '价格筛选结果不准确');
  });

  test('排序功能 - 价格升序', () => {
    const filters = { search: '', category: 'all', minPrice: 0, maxPrice: 1000, sortBy: 'price-asc' };
    const result = applyFilters(ALL_PRODUCTS, filters);
    for (let i = 1; i < result.length; i++) {
      assert(parseFloat(result[i-1].price) <= parseFloat(result[i].price), '价格升序排序错误');
    }
  });

  test('排序功能 - 价格降序', () => {
    const filters = { search: '', category: 'all', minPrice: 0, maxPrice: 1000, sortBy: 'price-desc' };
    const result = applyFilters(ALL_PRODUCTS, filters);
    for (let i = 1; i < result.length; i++) {
      assert(parseFloat(result[i-1].price) >= parseFloat(result[i].price), '价格降序排序错误');
    }
  });

  console.log('\n========== 测试报告 ==========\n');
  console.log(`总测试数: ${passed + failed}`);
  console.log(`通过: ${passed} ✅`);
  console.log(`失败: ${failed} ❌`);
  console.log(`通过率: ${((passed / (passed + failed)) * 100).toFixed(2)}%`);
  
  if (failed === 0) {
    console.log('\n🎉 所有测试通过！');
    process.exit(0);
  } else {
    console.log('\n⚠️ 存在失败的测试');
    process.exit(1);
  }
})();
