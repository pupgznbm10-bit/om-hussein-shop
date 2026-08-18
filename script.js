const STORAGE_KEY = 'am-hussein-cart';
const LAST_ORDER_KEY = 'am-hussein-last-order';
const CUSTOMER_INFO_KEY = 'am-hussein-customer-info';
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

    item.addEventListener('pointermove', (event) => {
      const rect = item.getBoundingClientRect();
      const rotateY = ((event.clientX - rect.left) / rect.width - 0.5) * 10;
      const rotateX = (0.5 - (event.clientY - rect.top) / rect.height) * 10;
      item.style.transform = `perspective(1200px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px)`;
      item.style.boxShadow = '0 22px 44px rgba(26, 45, 37, 0.12)';
    });

    item.addEventListener('pointerleave', () => {
      item.style.transform = '';
      item.style.boxShadow = '';
    });
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

    button.classList.remove('added');
    void button.offsetWidth;
    button.classList.add('added');
    button.textContent = '✓ تم';

    showToast(`${name} أضيف إلى السلة`);

    window.setTimeout(() => {
      button.classList.remove('added');
      button.textContent = 'أضف للسلة';
    }, 900);
  });
};

const showToast = (message) => {
  let toastContainer = document.querySelector('.toast-container');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.className = 'toast-container';
    document.body.appendChild(toastContainer);
  }

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  toastContainer.appendChild(toast);

  window.setTimeout(() => {
    toast.classList.add('show');
  }, 10);

  window.setTimeout(() => {
    toast.classList.remove('show');
    toast.classList.add('hide');
    window.setTimeout(() => toast.remove(), 300);
  }, 2200);
};

const setupSkeletonLoaders = () => {
  const lists = document.querySelectorAll('.product-list');

  lists.forEach((list) => {
    if (list.querySelector('.product-skeletons')) {
      return;
    }

    const skeletonCount = Math.min(4, list.children.length || 4);
    const skeletons = Array.from({ length: skeletonCount }, () => `
      <div class="product-skeletons__card">
        <div class="skeleton skeleton-badge"></div>
        <div class="skeleton skeleton-title"></div>
        <div class="skeleton skeleton-text"></div>
        <div class="skeleton skeleton-meta"></div>
      </div>
    `).join('');

    const skeletonWrap = document.createElement('div');
    skeletonWrap.className = 'product-skeletons';
    skeletonWrap.innerHTML = skeletons;
    list.appendChild(skeletonWrap);
    list.classList.add('is-loading');

    window.setTimeout(() => {
      list.classList.remove('is-loading');
      skeletonWrap.remove();
    }, 600);
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

const getCustomerInfo = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(CUSTOMER_INFO_KEY) || '{}');
    return saved && typeof saved === 'object' ? saved : {};
  } catch (error) {
    return {};
  }
};

const saveCustomerInfo = (customerInfo) => {
  const nextInfo = { ...getCustomerInfo(), ...customerInfo };

  Object.keys(nextInfo).forEach((key) => {
    if (nextInfo[key] === null || nextInfo[key] === undefined || nextInfo[key] === '') {
      delete nextInfo[key];
    }
  });

  localStorage.setItem(CUSTOMER_INFO_KEY, JSON.stringify(nextInfo));
};

const loadSavedCustomerInfo = () => {
  const form = document.querySelector('#checkoutForm');
  if (!form) {
    return;
  }

  const savedCustomer = getCustomerInfo();
  Object.entries(savedCustomer).forEach(([fieldName, value]) => {
    const input = form.querySelector(`[name="${fieldName}"]`);
    if (input && typeof value === 'string') {
      input.value = value;
    }
  });
};

const generateOrderCode = () => String(Math.floor(1000 + Math.random() * 9000));

const saveLastOrder = (customerName, total, items, customerInfo = {}, orderCode = generateOrderCode()) => {
  localStorage.setItem(LAST_ORDER_KEY, JSON.stringify({
    customerName,
    total,
    items,
    customerAddress: customerInfo.address || '',
    customerPhone: customerInfo.phone1 || '',
    customerPhone2: customerInfo.phone2 || '',
    customerWhatsapp: customerInfo.whatsapp || '',
    customerEmail: customerInfo.email || '',
    orderCode,
    createdAt: new Date().toISOString(),
  }));
};

const normalizePhoneNumber = (value) => String(value || '').replace(/\D+/g, '');

const isValidPhoneNumber = (value) => /^\d{11}$/.test(normalizePhoneNumber(value));

const buildInvoiceHtml = (order) => {
  const items = Array.isArray(order?.items) ? order.items : [];
  const rows = items.map((item) => `
    <tr>
      <td>${item.name}</td>
      <td>${item.qty} كجم</td>
      <td>${item.price} جنيه</td>
      <td>${item.price * item.qty} جنيه</td>
    </tr>
  `).join('');

  const total = Number(order?.total || 0);
  const customerName = order?.customerName || 'عميل';
  const customerAddress = order?.customerAddress || 'غير محدد';
  const customerPhone = order?.customerPhone || 'غير محدد';
  const orderCode = order?.orderCode || '0000';

  return `<!DOCTYPE html>
    <html lang="ar" dir="rtl">
      <head>
        <meta charset="UTF-8" />
        <title>فاتورة طلب | أم شهد</title>
        <style>
          body {
            font-family: 'Cairo', Arial, sans-serif;
            background: #f7f8f5;
            color: #1a2d25;
            margin: 0;
            padding: 32px;
          }
          .invoice {
            max-width: 760px;
            margin: 0 auto;
            background: white;
            border: 1px solid rgba(15, 59, 46, 0.08);
            border-radius: 24px;
            padding: 32px;
            box-shadow: 0 14px 32px rgba(26, 45, 37, 0.08);
          }
          .invoice-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            border-bottom: 1px solid rgba(15,59,46,0.12);
            padding-bottom: 16px;
            margin-bottom: 26px;
          }
          .brand {
            font-size: 2rem;
            font-weight: 900;
            color: #0f3b2e;
          }
          .brand-mark {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 40px;
            height: 40px;
            border-radius: 12px;
            background: linear-gradient(135deg, #2f7b55, #6bbf59);
            color: white;
            margin-left: 8px;
          }
          h1 {
            margin: 0;
            color: #0f3b2e;
            font-size: 2rem;
          }
          .meta {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 10px 22px;
            margin-bottom: 26px;
            color: #1a2d25;
            font-weight: 600;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 12px;
          }
          th, td {
            text-align: right;
            padding: 12px 10px;
            border-bottom: 1px solid rgba(15,59,46,0.08);
          }
          th {
            background: rgba(15,59,46,0.04);
            color: #0f3b2e;
          }
          .total-box {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-top: 24px;
            padding-top: 14px;
            border-top: 1px solid rgba(15,59,46,0.12);
            color: #0f3b2e;
            font-size: 1.2rem;
            font-weight: 800;
          }
          @media print {
            body {
              background: white;
              padding: 0;
            }
            .invoice {
              box-shadow: none;
              border: none;
              border-radius: 0;
            }
          }
        </style>
      </head>
      <body>
        <div class="invoice">
          <div class="invoice-header">
            <div class="brand"><span class="brand-mark">أم</span>شهد</div>
            <h1>فاتورة الطلب</h1>
          </div>

          <div class="meta">
            <div>اسم العميل: ${customerName}</div>
            <div>رقم الهاتف: ${customerPhone}</div>
            <div>العنوان: ${customerAddress}</div>
            <div>رقم الطلب: ${orderCode}</div>
            <div>تاريخ الطلب: ${new Date().toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' })}</div>
          </div>

          <table>
            <thead>
              <tr>
                <th>اسم المنتج</th>
                <th>الكمية</th>
                <th>سعر الوحدة</th>
                <th>الإجمالي</th>
              </tr>
            </thead>
            <tbody>
              ${rows || '<tr><td colspan="4">لا توجد منتجات</td></tr>'}
            </tbody>
          </table>

          <div class="total-box">
            <span>الإجمالي</span>
            <strong>${total} جنيه</strong>
          </div>
        </div>
      </body>
    </html>`;
};

const printInvoice = (order) => {
  const invoiceWindow = window.open('', '_blank', 'width=900,height=1200');

  if (!invoiceWindow) {
    alert('يرجى السماح بفتح نافذة جديدة لعرض الفاتورة أو الضغط على طباعة PDF.');
    return;
  }

  invoiceWindow.document.write(buildInvoiceHtml(order));
  invoiceWindow.document.close();
  invoiceWindow.focus();
  setTimeout(() => {
    invoiceWindow.print();
  }, 300);
};

const getOrderApiCandidates = () => {
  const baseUrls = [];

  if (window.location.origin && window.location.origin !== 'null') {
    baseUrls.push(window.location.origin);
  }

  baseUrls.push('http://localhost:8000', 'http://127.0.0.1:8000');

  const seen = new Set();
  return ['/api/send-order', '/api/order', ...baseUrls.map((baseUrl) => `${baseUrl}/api/send-order`), ...baseUrls.map((baseUrl) => `${baseUrl}/api/order`)]
    .filter((url) => {
      const isUnique = !seen.has(url);
      seen.add(url);
      return isUnique;
    });
};

async function submitOrderToTelegram(orderDetails, customerName, customerEmail, total) {
  const candidates = getOrderApiCandidates();

  let lastError = 'فشل في إرسال الطلب';

  for (const endpoint of candidates) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: orderDetails,
          customerName,
          customerEmail,
          orderTotal: total,
          orderDetails: orderDetails
        })
      });

      const data = await response.json().catch(() => ({}));
      const success = response.ok && (data.ok === true || data.success === true || data.telegram?.ok === true || data.result?.ok === true);

      if (success) {
        return { ok: true, data };
      }

      lastError = data?.error || data?.message || 'فشل في إرسال الطلب';
    } catch (error) {
      console.error('Error:', error);
      lastError = 'فشل في إرسال الطلب';
    }
  }

  return { ok: false, error: lastError };
}

const setupCheckoutForm = () => {
  const form = document.querySelector('#checkoutForm');
  if (!form) {
    return;
  }

 loadSavedCustomerInfo();
 renderCheckoutSummary();

 form.addEventListener('input', (event) => {
   const target = event.target;
   if (!(target instanceof HTMLInputElement)) {
     return;
   }

   const { name, value } = target;
   if (!name) {
     return;
   }

   if (['phone1', 'phone2', 'whatsapp'].includes(name)) {
     const digitsOnly = value.replace(/\D/g, '').slice(0, 11);
     target.value = digitsOnly;
     saveCustomerInfo({ [name]: digitsOnly });
     return;
   }

   saveCustomerInfo({ [name]: value.trim() });
 });

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
   const phone1 = normalizePhoneNumber(formData.get('phone1'));
   const phone2 = normalizePhoneNumber(formData.get('phone2'));
   const whatsapp = normalizePhoneNumber(formData.get('whatsapp'));
   const email = String(formData.get('email') || '').trim();

   if (!name || !address || address.length < 5) {
     alert('يرجى إدخال عنوان صحيح، ولا يقل عن 5 أحرف.');
     form.querySelector('[name="address"]').focus();
     return;
   }

   if (!phone1 || !isValidPhoneNumber(phone1)) {
     alert('يرجى إدخال رقم الهاتف الأول بشكل صحيح، بحيث يكون 11 رقمًا.');
     form.querySelector('[name="phone1"]').focus();
     return;
   }

   if (!whatsapp || !isValidPhoneNumber(whatsapp)) {
     alert('يرجى إدخال رقم الواتساب بشكل صحيح، بحيث يكون 11 رقمًا.');
     form.querySelector('[name="whatsapp"]').focus();
     return;
   }

   if (phone2 && !isValidPhoneNumber(phone2)) {
     alert('يرجى إدخال رقم الهاتف الثاني بشكل صحيح، أو تركه فارغًا.');
     form.querySelector('[name="phone2"]').focus();
     return;
   }

   const customerInfo = { name, address, phone1, phone2, whatsapp, email };
   saveCustomerInfo(customerInfo);

   const total = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
   const itemsText = cart.map((item) => `- ${item.name}: ${item.qty} كجم × ${item.price} = ${item.price * item.qty} جنيه`).join('\n');
   const orderTime = new Date().toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' });
   const orderCode = generateOrderCode();

   const message = `
   <b>🛒 طلب جديد من متجر أم شهد</b>
  
   🕒 التاريخ: ${orderTime}
   🔢 رقم الطلب: ${orderCode}
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
     const result = await submitOrderToTelegram(message, name, email, total);

     if (result?.ok) {
       alert('تم إرسال الطلب بنجاح');
       saveLastOrder(name, total, cart, customerInfo, orderCode);
       clearCart();
       window.location.href = 'success.html';
       return;
     }

     alert(result?.error || 'فشل في إرسال الطلب');
   } catch (error) {
     alert('فشل في إرسال الطلب');
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
  const invoiceButton = document.querySelector('#downloadInvoiceButton');
  if (!successPanel) {
    return;
  }

  try {
    const lastOrder = JSON.parse(localStorage.getItem(LAST_ORDER_KEY) || 'null');
    if (!lastOrder) {
      successPanel.innerHTML = '<p class="empty-cart">لا توجد بيانات طلب حديثة.</p>';
      if (invoiceButton) {
        invoiceButton.disabled = true;
      }
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
        <p class="success-small-meta">رقم الطلب: ${lastOrder.orderCode || '0000'}</p>
        <p class="success-small-meta">العنوان: ${lastOrder.customerAddress || 'غير محدد'}</p>
        <p class="success-small-meta">الهاتف: ${lastOrder.customerPhone || 'غير محدد'}</p>
        <ul class="success-order-list">${itemsHtml}</ul>
        <div class="success-total-row">
          <span>الإجمالي</span>
          <strong>${formatCurrency(lastOrder.total)}</strong>
        </div>
      </div>
    `;

    if (invoiceButton) {
      invoiceButton.disabled = false;
      invoiceButton.addEventListener('click', () => printInvoice(lastOrder));
    }
  } catch (error) {
    successPanel.innerHTML = '<p class="empty-cart">لا توجد بيانات طلب حديثة.</p>';
    if (invoiceButton) {
      invoiceButton.disabled = true;
    }
  }
};

const setupBrandAnimations = () => {
  const brandLinks = document.querySelectorAll('.brand');

  brandLinks.forEach((brand) => {
    brand.addEventListener('click', () => {
      brand.classList.remove('brand-bounce');
      void brand.offsetWidth;
      brand.classList.add('brand-bounce');
      window.setTimeout(() => brand.classList.remove('brand-bounce'), 600);
    });
  });
};

const setupScrollEffects = () => {
  const header = document.querySelector('.topbar');
  if (header) {
    const updateHeaderState = () => {
      const scrollTop = Math.max(
        window.scrollY || 0,
        window.pageYOffset || 0,
        document.documentElement?.scrollTop || 0,
        document.body?.scrollTop || 0
      );
      header.classList.toggle('scrolled', scrollTop > 12);
    };

    updateHeaderState();
    window.addEventListener('scroll', updateHeaderState, { passive: true });
    document.addEventListener('scroll', updateHeaderState, { passive: true });
  }

  const revealItems = document.querySelectorAll('.feature-item, .product-item, .hero-copy, .hero-visual, .about-copy, .about-image, .shop-page-shell');
  if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });

    revealItems.forEach((item) => {
      item.classList.add('reveal-item');
      revealObserver.observe(item);
    });
  } else {
    revealItems.forEach((item) => item.classList.add('visible'));
  }
};

const init = () => {
  updateCartBadge();
  setupBrandAnimations();
  setupScrollEffects();
  setupSkeletonLoaders();
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
