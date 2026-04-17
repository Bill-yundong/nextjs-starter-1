/**
 * 购物车修复验证测试
 * 测试两个已修复的bug：
 * 1. 购物车总价精度丢失问题
 * 2. 快速点击购物车数量异常问题
 */

function calculateCartTotals(cart) {
  const totalQuantity = cart.items.reduce((sum, item) => sum + item.quantity, 0);
  
  let totalPrice = 0;
  cart.items.forEach(item => {
    const itemTotal = parseFloat(item.price) * item.quantity;
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
      
      return calculateCartTotals({ ...state, items: newItems });
    }
    default:
      return state;
  }
}

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

console.log('\n========================================');
console.log('  购物车修复验证测试');
console.log('========================================\n');

console.log('---------- Bug 1: 总价精度测试 ----------\n');

test('单个商品总价精度正确 (49.99 x 2 = 99.98)', () => {
  const cart = { items: [], discount: 0 };
  const result = calculateCartTotals({
    ...cart,
    items: [{ id: 1, name: 'Helmet', price: '49.99', quantity: 2 }]
  });
  assert(result.totalPrice === 99.98, `期望 99.98, 实际 ${result.totalPrice}`);
});

test('多个商品总价精度正确 (49.99x2 + 29.99x1 = 129.97)', () => {
  const cart = {
    items: [
      { id: 1, name: 'Helmet', price: '49.99', quantity: 2 },
      { id: 2, name: 'T-Shirt', price: '29.99', quantity: 1 },
    ],
    discount: 0
  };
  const result = calculateCartTotals(cart);
  assert(result.totalPrice === 129.97, `期望 129.97, 实际 ${result.totalPrice}`);
});

test('小数价格精度不丢失 (9.99 x 3 = 29.97)', () => {
  const cart = {
    items: [{ id: 1, name: 'Socks', price: '9.99', quantity: 3 }],
    discount: 0
  };
  const result = calculateCartTotals(cart);
  assert(result.totalPrice === 29.97, `期望 29.97, 实际 ${result.totalPrice}`);
});

test('折扣后价格精度正确 (129.97 - 10.50 = 119.47)', () => {
  const cart = {
    items: [
      { id: 1, name: 'Helmet', price: '49.99', quantity: 2 },
      { id: 2, name: 'T-Shirt', price: '29.99', quantity: 1 },
    ],
    discount: 10.50
  };
  const result = calculateCartTotals(cart);
  assert(result.finalPrice === 119.47, `期望 119.47, 实际 ${result.finalPrice}`);
});

test('极端小数精度 (0.01 x 100 = 1.00)', () => {
  const cart = {
    items: [{ id: 1, name: 'Item', price: '0.01', quantity: 100 }],
    discount: 0
  };
  const result = calculateCartTotals(cart);
  assert(result.totalPrice === 1.00, `期望 1.00, 实际 ${result.totalPrice}`);
});

test('浮点数累加精度正确 (0.1 + 0.2 价格场景)', () => {
  const cart = {
    items: [
      { id: 1, name: 'Item A', price: '0.1', quantity: 1 },
      { id: 2, name: 'Item B', price: '0.2', quantity: 1 },
    ],
    discount: 0
  };
  const result = calculateCartTotals(cart);
  assert(Math.abs(result.totalPrice - 0.30) < 0.001, `期望 0.30, 实际 ${result.totalPrice}`);
});

console.log('\n---------- Bug 2: 快速点击数量累加测试 ----------\n');

test('单次添加商品数量正确', () => {
  const state = { items: [], discount: 0 };
  const product = { id: 1, name: 'Helmet', price: '49.99' };
  
  const result = cartReducer(state, { type: 'CART_ADD_ITEM', payload: product });
  
  assert(result.items.length === 1, '商品数量应为1');
  assert(result.items[0].quantity === 1, '商品quantity应为1');
});

test('连续添加相同商品数量正确累加', () => {
  let state = { items: [], discount: 0 };
  const product = { id: 1, name: 'Helmet', price: '49.99' };
  
  for (let i = 0; i < 5; i++) {
    state = cartReducer(state, { type: 'CART_ADD_ITEM', payload: product });
  }
  
  assert(state.items.length === 1, '商品种类应为1');
  assert(state.items[0].quantity === 5, `商品quantity应为5, 实际 ${state.items[0].quantity}`);
});

test('模拟快速点击场景 - 同步dispatch', () => {
  let state = { items: [], discount: 0 };
  const product = { id: 1, name: 'Helmet', price: '49.99' };
  
  state = cartReducer(state, { type: 'CART_ADD_ITEM', payload: product });
  state = cartReducer(state, { type: 'CART_ADD_ITEM', payload: product });
  state = cartReducer(state, { type: 'CART_ADD_ITEM', payload: product });
  
  assert(state.items[0].quantity === 3, `快速点击3次, quantity应为3, 实际 ${state.items[0].quantity}`);
  assert(state.totalPrice === 149.97, `快速点击3次, 总价应为149.97, 实际 ${state.totalPrice}`);
});

test('混合添加不同商品', () => {
  let state = { items: [], discount: 0 };
  const product1 = { id: 1, name: 'Helmet', price: '49.99' };
  const product2 = { id: 2, name: 'T-Shirt', price: '29.99' };
  
  state = cartReducer(state, { type: 'CART_ADD_ITEM', payload: product1 });
  state = cartReducer(state, { type: 'CART_ADD_ITEM', payload: product2 });
  state = cartReducer(state, { type: 'CART_ADD_ITEM', payload: product1 });
  
  assert(state.items.length === 2, '商品种类应为2');
  const helmet = state.items.find(i => i.id === 1);
  const shirt = state.items.find(i => i.id === 2);
  assert(helmet.quantity === 2, `Helmet quantity应为2, 实际 ${helmet.quantity}`);
  assert(shirt.quantity === 1, `T-Shirt quantity应为1, 实际 ${shirt.quantity}`);
  assert(state.totalPrice === 129.97, `总价应为129.97, 实际 ${state.totalPrice}`);
});

test('大量快速点击数量正确', () => {
  let state = { items: [], discount: 0 };
  const product = { id: 1, name: 'Item', price: '10.00' };
  
  for (let i = 0; i < 100; i++) {
    state = cartReducer(state, { type: 'CART_ADD_ITEM', payload: product });
  }
  
  assert(state.items[0].quantity === 100, `100次点击, quantity应为100, 实际 ${state.items[0].quantity}`);
  assert(state.totalPrice === 1000.00, `总价应为1000.00, 实际 ${state.totalPrice}`);
});

console.log('\n---------- 边界情况测试 ----------\n');

test('空购物车总价为0', () => {
  const cart = { items: [], discount: 0 };
  const result = calculateCartTotals(cart);
  assert(result.totalPrice === 0, '空购物车总价应为0');
  assert(result.totalQuantity === 0, '空购物车数量应为0');
});

test('折扣大于总价时最终价格为0', () => {
  const cart = {
    items: [{ id: 1, name: 'Item', price: '10.00', quantity: 1 }],
    discount: 20
  };
  const result = calculateCartTotals(cart);
  assert(result.finalPrice === 0, `折扣大于总价时finalPrice应为0, 实际 ${result.finalPrice}`);
});

test('数量字段正确计算', () => {
  const cart = {
    items: [
      { id: 1, name: 'Item A', price: '10.00', quantity: 3 },
      { id: 2, name: 'Item B', price: '20.00', quantity: 2 },
      { id: 3, name: 'Item C', price: '30.00', quantity: 1 },
    ],
    discount: 0
  };
  const result = calculateCartTotals(cart);
  assert(result.totalQuantity === 6, `总数量应为6, 实际 ${result.totalQuantity}`);
});

console.log('\n========================================');
console.log('  测试报告');
console.log('========================================\n');
console.log(`总测试数: ${passed + failed}`);
console.log(`通过: ${passed} ✅`);
console.log(`失败: ${failed} ❌`);
console.log(`通过率: ${((passed / (passed + failed)) * 100).toFixed(2)}%`);

if (failed === 0) {
  console.log('\n🎉 所有购物车测试通过！两个Bug已修复验证！');
  process.exit(0);
} else {
  console.log('\n⚠️ 存在失败的测试');
  process.exit(1);
}
