const STORAGE_KEY = 'am-hussein-cart';
const LAST_ORDER_KEY = 'am-hussein-last-order';
const API_ENDPOINT = '/api/order';


const parsePrice = (value) => Number(String(value).replace(/[^0-9.]/g, '')) || 0;

const slugify = (value) => String(value || '')
  .trim()
  .toLowerCase()
  .replace(/[\p{P}\p{S}]+/gu, ' ')
  .replace(/[^\p{L}\p{N}\s-]/gu, '')
  .replace(/\s+/g, '-')
  .replace(/-+/g, '-')
  .replace(/^-|-$/g, '');

const formatCurrency = (amount) => `${Number(amount || 0)} جنيه`;

const getCart = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(saved) ? saved : [];
  } catch (error) {
    return [];
  }
};

const saveCart = (cart) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
};

const updateCartBadge = () => {
  const cart = getCart();
  const totalItems = cart.reduce((sum, item) => sum + Number(item.qty || 0), 0);

  document.querySelectorAll('.cart-count').forEach((badge) => {
    badge.textContent = String(totalItems);
    badge.parentElement.classList.toggle('has-items', totalItems > 0);
  });
};

const addToCart = (product) => {
  const cart = getCart();
  const existingItem = cart.find((item) => item.id === product.id);

  if (existingItem) {
    existingItem.qty += product.qty;
  } else {
    cart.push(product);
  }

  saveCart(cart);
  updateCartBadge();
};

const updateCartItemQty = (id, delta) => {
  const cart = getCart();
  const nextCart = cart
    .map((item) => {
      if (item.id !== id) return item;
      const nextQty = Number(item.qty || 0) + Number(delta || 0);
      return nextQty > 0 ? { ...item, qty: nextQty } : null;
    })
    .filter(Boolean);

  saveCart(nextCart);
  updateCartBadge();
  if (document.body.dataset.page === 'cart') {
    renderCartPage();
  }
};

const removeCartItem = (id) => {
  const nextCart = getCart().filter((item) => item.id !== id);
  saveCart(nextCart);
  updateCartBadge();
  if (document.body.dataset.page === 'cart') {
    renderCartPage();
  }
};

const clearCart = () => {
  saveCart([]);
  updateCartBadge();
  if (document.body.dataset.page === 'cart') {
    renderCartPage();
  }
};

const setupProductCards = () => {
  const items = document.querySelectorAll('.product-item');

  items.forEach((item, index) => {
    const title = item.querySelector('h3')?.textContent.trim() || `منتج ${index + 1}`;
    const price = parsePrice(item.querySelector('.product-meta span')?.textContent || '0');
    const id = slugify(title) || `product-${index + 1}`;

    item.dataset.id = id;
    item.dataset.name = title;
    item.dataset.price = String(price);

    const meta = item.querySelector('.product-meta');
    if (meta && !meta.querySelector('.product-qty')) {
      const qtyWrap = document.createElement('label');
      qtyWrap.className = 'product-qty';
      qtyWrap.innerHTML = '<span>كجم</span><input type="number" min="1" step="1" value="1" aria-label="الكمية المطلوبة بالكيلو" class="qty-box" />';
      meta.insertBefore(qtyWrap, meta.querySelector('button'));
    }
  });

  document.body.addEventListener('click', (event) => {
    const button = event.target.closest('.product-meta button');
    if (!button) {
      return;
    }

    const productCard = button.closest('.product-item');
    if (!productCard) {
      return;
    }

    const qtyInput = productCard.querySelector('.qty-box');
    const qty = Number(qtyInput?.value || 1);
    const name = productCard.dataset.name || productCard.querySelector('h3')?.textContent.trim() || 'منتج';
    const price = parsePrice(productCard.dataset.price || productCard.querySelector('.product-meta span')?.textContent || '0');
    const id = productCard.dataset.id || slugify(name) || `product-${Math.random().toString(16).slice(2)}`;

    addToCart({
      id,
      name,
      price,
      qty: Number.isFinite(qty) && qty > 0 ? qty : 1,
    });
  });
};

const setupFilters = () => {
  const tabButtons = document.querySelectorAll('.tab-btn');
  const productItems = document.querySelectorAll('.product-item');

  const setFilter = (filter) => {
    tabButtons.forEach((button) => {
      const isActive = button.dataset.filter === filter;
      button.classList.toggle('active', isActive);
    });

    productItems.forEach((item) => {
      const shouldShow = filter === 'all' || item.dataset.category === filter;
      item.classList.toggle('hidden', !shouldShow);
    });
  };

  tabButtons.forEach((button) => {
    button.addEventListener('click', () => setFilter(button.dataset.filter));
  });
};

const renderCartPage = () => {
  const items = getCart();
  const cartItemsWrap = document.querySelector('#cartItems');
  const cartEmpty = document.querySelector('#cartEmpty');
  const cartTotalEl = document.querySelector('#cartTotal');
  const clearCartButton = document.querySelector('#clearCartButton');

  if (!cartItemsWrap || !cartTotalEl) {
    return;
  }

  if (clearCartButton) {
    clearCartButton.addEventListener('click', clearCart);
  }

  if (!items.length) {
    cartItemsWrap.innerHTML = '';
    cartEmpty?.classList.remove('hidden');
    cartTotalEl.textContent = '0 جنيه';
    return;
  }

  cartEmpty?.classList.add('hidden');
  cartItemsWrap.innerHTML = items.map((item) => {
    const itemTotal = item.price * item.qty;
    return `
      <div class="cart-item">
        <div class="cart-item-title">
          <h3>${item.name}</h3>
          <p>${item.price} جنيه / كجم</p>
        </div>
        <div class="cart-item-controls">
          <div class="qty-adjuster">
            <button type="button" data-action="decrease" data-id="${item.id}">−</button>
            <span>${item.qty} كجم</span>
            <button type="button" data-action="increase" data-id="${item.id}">+</button>
          </div>
          <strong>${itemTotal} جنيه</strong>
          <button type="button" class="remove-item" data-action="remove" data-id="${item.id}">حذف</button>
        </div>
      </div>
    `;
  }).join('');

  const total = items.reduce((sum, item) => sum + (item.price * item.qty), 0);
  cartTotalEl.textContent = formatCurrency(total);
};

const renderCheckoutSummary = () => {
  const items = getCart();
  const summaryEl = document.querySelector('#checkoutSummary');
  const totalEl = document.querySelector('#checkoutTotal');

  if (!summaryEl || !totalEl) {
    return;
  }

  if (!items.length) {
    summaryEl.innerHTML = '<div class="empty-cart"><h3>السلة فارغة</h3><p>اختر بعض المنتجات أولاً.</p></div>';
    totalEl.textContent = '0 جنيه';
    return;
  }

  const total = items.reduce((sum, item) => sum + item.price * item.qty, 0);
  summaryEl.innerHTML = items.map((item) => `
    <div class="checkout-item-row">
      <span>${item.name}</span>
      <span>${item.qty} كجم</span>
      <span>${item.price * item.qty} جنيه</span>
    </div>
  `).join('');
  totalEl.textContent = formatCurrency(total);
};

const saveLastOrder = (customerName, total, items) => {
  localStorage.setItem(LAST_ORDER_KEY, JSON.stringify({
    customerName,
    total,
    items,
    createdAt: new Date().toISOString(),
  }));
};

async function submitOrderToTelegram(orderDetails) {
    try {
        const response = await fetch('/api/send-order', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ message: orderDetails })
        });

        const data = await response.json().catch(() => ({}));

        if (response.ok) {
            alert('تم إرسال الطلب بنجاح!');
            return { ok: true, ...data };
        }

        console.error('Order submit failed:', data);
        alert('حدث خطأ أثناء إرسال الطلب. يرجى المحاولة مرة أخرى.');
        return { ok: false, ...data };
    } catch (error) {
        console.error('Error:', error);
        alert('حدث خطأ في الاتصال بالشبكة.');
        return { ok: false, error: error.message };
    }
}

const setupCheckoutForm = () => {
  const form = document.querySelector('#checkoutForm');
  if (!form) {
    return;
  }

  renderCheckoutSummary();

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const formData = new FormData(form);
    const cart = getCart();

    if (!cart.length) {
      alert('السلة فارغة، يرجى إضافة منتجات أولًا');
      return;
    }

    const name = String(formData.get('name') || '').trim();
    const address = String(formData.get('address') || '').trim();
    const phone1 = String(formData.get('phone1') || '').trim();
    const phone2 = String(formData.get('phone2') || '').trim();
    const whatsapp = String(formData.get('whatsapp') || '').trim();
    const email = String(formData.get('email') || '').trim();

    if (!name || !address || !phone1) {
      alert('يرجى تعبئة الاسم، العنوان، ورقم الهاتف الأول');
      return;
    }

    const total = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const itemsText = cart.map((item) => `- ${item.name}: ${item.qty} كجم × ${item.price} = ${item.price * item.qty} جنيه`).join('\n');
   const orderTime = new Date().toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' });

   const message = `
<b>🛒 طلب جديد من متجر أم حسين</b>

🕒 التاريخ: ${orderTime}
👤 الاسم: ${name}
📍 العنوان: ${address}
📞 رقم الهاتف 1: ${phone1}
📞 رقم الهاتف 2: ${phone2 || 'غير موجود'}
💬 واتساب: ${whatsapp || 'غير موجود'}
✉️ البريد الإلكتروني: ${email || 'غير موجود'}

<b>📦 تفاصيل الطلب:</b>
${itemsText}

<b>💰 الإجمالي:</b> ${formatCurrency(total)}

<b>💳 طريقة الدفع:</b> الدفع عند التسليم
<b>🧾 ملاحظات:</b> لا يوجد دفع فيزا، ويتم الدفع نقدًا عند الاستلام.
`;

    const submitButton = form.querySelector('button[type="submit"]');
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = 'جاري الإرسال...';
    }

    try {
      const result = await submitOrderToTelegram(message);

      if (result?.ok) {
        saveLastOrder(name, total, cart);
        clearCart();
        window.location.href = 'success.html';
      } else {
        throw new Error(result?.description || result?.error || 'فشل إرسال الطلب');
      }
    } catch (error) {
      alert('حدث خطأ أثناء إرسال الطلب. يرجى المحاولة مرة أخرى.');
      console.error(error);
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = 'إتمام عملية الشراء';
      }
    }
  });
};

const bindCartActions = () => {
  document.body.addEventListener('click', (event) => {
    const button = event.target.closest('[data-action]');
    if (!button) {
      return;
    }

    const { action, id } = button.dataset;
    if (!id) {
      return;
    }

    if (action === 'increase') {
      updateCartItemQty(id, 1);
    }

    if (action === 'decrease') {
      updateCartItemQty(id, -1);
    }

    if (action === 'remove') {
      removeCartItem(id);
    }
  });
};

const renderSuccessPage = () => {
  const successPanel = document.querySelector('#successOrderSummary');
  if (!successPanel) {
    return;
  }

  try {
    const lastOrder = JSON.parse(localStorage.getItem(LAST_ORDER_KEY) || 'null');
    if (!lastOrder) {
      successPanel.innerHTML = '<p class="empty-cart">لا توجد بيانات طلب حديثة.</p>';
      return;
    }

    const itemsHtml = (lastOrder.items || []).map((item) => `
      <li>
        <span>${item.name}</span>
        <span>${item.qty} كجم</span>
        <span>${item.price * item.qty} جنيه</span>
      </li>
    `).join('');

    successPanel.innerHTML = `
      <div class="success-summary-box">
        <p class="success-label">اسم العميل</p>
        <h3>${lastOrder.customerName}</h3>
        <ul class="success-order-list">${itemsHtml}</ul>
        <div class="success-total-row">
          <span>الإجمالي</span>
          <strong>${formatCurrency(lastOrder.total)}</strong>
        </div>
      </div>
    `;
  } catch (error) {
    successPanel.innerHTML = '<p class="empty-cart">لا توجد بيانات طلب حديثة.</p>';
  }
};

const init = () => {
  updateCartBadge();
  setupProductCards();
  setupFilters();
  bindCartActions();

  if (document.body.dataset.page === 'cart') {
    renderCartPage();
  }

  if (document.body.dataset.page === 'checkout') {
    renderCheckoutSummary();
    setupCheckoutForm();
  }

  if (document.body.dataset.page === 'success') {
    renderSuccessPage();
  }
};

init();
