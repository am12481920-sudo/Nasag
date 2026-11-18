const checkoutForm = document.getElementById('checkoutForm');
const cartItems = NusjCart.read();
const formatMoney = value => new Intl.NumberFormat('ar-EG').format(value) + ' ج.م';
const escapeText = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.qty, 0);
const delivery = subtotal >= 1500 || !subtotal ? 0 : 60;
const orderTotal = subtotal + delivery;
let currentStep = 1;

if (!cartItems.length) {
  document.getElementById('emptyCheckout').hidden = false;
  document.querySelector('.checkout-summary').hidden = true;
  document.getElementById('progress').hidden = true;
  checkoutForm.querySelectorAll('.checkout-panel,.checkout-actions').forEach(element => element.hidden = true);
}

document.getElementById('checkoutItems').innerHTML = cartItems.map(item => `<div class="checkout-item"><img src="${item.img}" alt=""><div><b>${escapeText(item.name)}</b><small>${[item.color, item.size && ('مقاس ' + item.size)].filter(Boolean).map(escapeText).join(' · ') || 'قطعة مختارة'}</small><small>الكمية: ${item.qty}</small></div><strong>${formatMoney(item.price * item.qty)}</strong></div>`).join('');
document.getElementById('itemCount').textContent = new Intl.NumberFormat('ar-EG').format(cartItems.reduce((sum, item) => sum + item.qty, 0)) + ' قطع';
document.getElementById('subtotal').textContent = formatMoney(subtotal);
document.getElementById('shipping').textContent = delivery ? formatMoney(delivery) : 'مجاني';
document.getElementById('grandTotal').textContent = formatMoney(orderTotal);

function showStep(next) {
  currentStep = next;
  document.querySelectorAll('.checkout-panel').forEach(panel => panel.hidden = Number(panel.dataset.panel) !== next);
  document.querySelectorAll('.progress-step').forEach(element => {
    const stepNumber = Number(element.dataset.step);
    element.classList.toggle('current', stepNumber === next);
    element.classList.toggle('done', stepNumber < next);
  });
  document.getElementById('backStep').hidden = next === 1;
  document.getElementById('nextStep').innerHTML = next === 3 ? 'تأكيد الطلب <span>✓</span>' : (next === 1 ? 'متابعة إلى الدفع <span>←</span>' : 'مراجعة الطلب <span>←</span>');
  if (next === 3) renderReview();
}

function renderReview() {
  const data = new FormData(checkoutForm);
  const address = [data.get('city'), data.get('area'), data.get('address')].filter(Boolean).map(escapeText).join('، ');
  document.getElementById('reviewOrder').innerHTML = cartItems.map(item => `<div class="review-order-row"><span>${escapeText(item.name)}${item.size ? ' · ' + escapeText(item.size) : ''}${item.color ? ' · ' + escapeText(item.color) : ''} × ${item.qty}</span><b>${formatMoney(item.price * item.qty)}</b></div>`).join('') + `<div class="review-order-row review-order-total"><span>الإجمالي شامل الشحن</span><b>${formatMoney(orderTotal)}</b></div>`;
  document.getElementById('reviewAddress').innerHTML = `<b>التوصيل إلى</b><p>${escapeText(data.get('fullName'))} · ${escapeText(data.get('phone'))}</p><p>${address}</p>`;
}

document.getElementById('backStep').onclick = () => showStep(Math.max(1, currentStep - 1));
document.getElementById('nextStep').onclick = () => {
  if (currentStep === 1) {
    const fields = [...checkoutForm.querySelectorAll('[data-panel="1"] [required]')];
    if (fields.find(field => !field.reportValidity())) return;
    showStep(2);
    return;
  }
  const selectedPayment = checkoutForm.querySelector('input[name="payment"]:checked');
  if (currentStep === 2) {
    if (!selectedPayment) { checkoutForm.querySelector('input[name="payment"]').reportValidity(); return; }
    if (selectedPayment.value === 'card') {
      const cardFields = [...document.querySelectorAll('#cardFields [required]')];
      if (cardFields.find(field => !field.reportValidity())) return;
    }
    showStep(3);
    return;
  }
  const reference = 'NS-' + Math.random().toString(36).slice(2, 8).toUpperCase();
  const order = {
    reference,
    total: orderTotal,
    payment: selectedPayment.value === 'card' ? 'بطاقة بنكية' : 'الدفع عند الاستلام',
    createdAt: Date.now(),
    items: cartItems.map(({name, qty, size, color, price}) => ({name, qty, size, color, price}))
  };
  let orders = [];
  try { orders = JSON.parse(localStorage.getItem('nusj-orders') || '[]'); } catch {}
  orders.unshift(order);
  localStorage.setItem('nusj-orders', JSON.stringify(orders.slice(0, 20)));
  NusjCart.clear();
  location.href = 'order-success.html?ref=' + encodeURIComponent(reference);
};

document.querySelectorAll('input[name="payment"]').forEach(input => input.addEventListener('change', () => {
  const isCard = input.checked && input.value === 'card';
  const cardFields = document.getElementById('cardFields');
  cardFields.hidden = !isCard;
  cardFields.querySelectorAll('input').forEach(field => field.required = isCard);
}));

const cardHolderInput = document.getElementById('cardHolder');
cardHolderInput.addEventListener('input', () => {
  document.getElementById('previewCardHolder').textContent = cardHolderInput.value.trim() || 'اسم حامل البطاقة';
});
const cardNumberInput = document.getElementById('cardNumber');
const cardExpiryInput = document.getElementById('cardExpiry');
const cardCvcInput = document.getElementById('cardCvc');
const cardScene = document.getElementById('bankCardScene');
const normalizeDigits = value => value.replace(/[٠-٩]/g, digit => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit))).replace(/[^0-9]/g, '');
cardNumberInput.addEventListener('input', () => {
  const digits = normalizeDigits(cardNumberInput.value).slice(0, 19);
  cardNumberInput.value = digits.replace(/(.{4})/g, '$1 ').trim();
  document.getElementById('previewCardNumber').textContent = cardNumberInput.value || '•••• •••• •••• ••••';
  document.getElementById('cardBrand').textContent = digits.startsWith('4') ? 'VISA' : (/^[2356]/.test(digits) ? 'Mastercard' : 'CARD');
});
cardExpiryInput.addEventListener('input', () => {
  const digits = normalizeDigits(cardExpiryInput.value).slice(0, 4);
  cardExpiryInput.value = digits.length > 2 ? digits.slice(0, 2) + ' / ' + digits.slice(2) : digits;
  document.getElementById('previewCardExpiry').textContent = cardExpiryInput.value || 'MM / YY';
});
cardCvcInput.addEventListener('input', () => {
  document.getElementById('previewCardCvc').textContent = normalizeDigits(cardCvcInput.value).slice(0, 4) || '•••';
});
cardCvcInput.addEventListener('focus', () => cardScene.classList.add('is-back'));
cardCvcInput.addEventListener('blur', () => cardScene.classList.remove('is-back'));

const locationStatus = document.getElementById('locationStatus');
const locationMap = L.map('locationMap').setView([30.0444, 31.2357], 11);
L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors · HOT / OSM France'
}).addTo(locationMap);
let selectedMarker = null, lookupTimer = null, lastLookup = 0, lookupController = null;

function setAddressFromMap(address) {
  const citySelect = document.querySelector('select[name="city"]');
  const areaInput = document.querySelector('input[name="area"]');
  const addressInput = document.getElementById('address');
  const values = Object.values(address || {});
  const searchText = values.join(' ').toLowerCase();
  const governorate = searchText.includes('cairo') || searchText.includes('القاهرة') ? 'القاهرة'
    : searchText.includes('giza') || searchText.includes('الجيزة') ? 'الجيزة'
    : searchText.includes('alexandria') || searchText.includes('الإسكندرية') || searchText.includes('الاسكندرية') ? 'الإسكندرية'
    : searchText.includes('qalyub') || searchText.includes('القليوبية') ? 'القليوبية'
    : 'محافظة أخرى';
  citySelect.value = governorate;
  const city = address.city || address.town || address.municipality || address.village || address.hamlet || '';
  areaInput.value = city;
  const neighborhood = address.neighbourhood || address.suburb || address.city_district || address.quarter || address.district || '';
  const street = [address.house_number, address.road || address.pedestrian || address.street].filter(Boolean).join(' ');
  addressInput.value = [neighborhood, street].filter(Boolean).join('، ') || address.amenity || address.building || neighborhood || '';
}

async function lookupAddress(latlng) {
  const elapsed = Date.now() - lastLookup;
  if (elapsed < 1100) await new Promise(resolve => setTimeout(resolve, 1100 - elapsed));
  lastLookup = Date.now();
  if (lookupController) lookupController.abort();
  const controller = new AbortController();
  lookupController = controller;
  const lookupTimeout = setTimeout(() => controller.abort(), 8000);
  const query = new URLSearchParams({format:'jsonv2', lat:latlng.lat, lon:latlng.lng, zoom:'18', addressdetails:'1', 'accept-language':'ar'});
  try {
    const response = await fetch('https://nominatim.openstreetmap.org/reverse?' + query, {signal:controller.signal, headers:{'Accept':'application/json'}});
    if (!response.ok) throw new Error('تعذر قراءة عنوان هذه النقطة.');
    const result = await response.json();
    if (!result.address) throw new Error('لم نجد عنواناً لهذه النقطة. اختر مكاناً قريباً من شارع.');
    setAddressFromMap(result.address);
    locationStatus.textContent = '';
  } finally {
    clearTimeout(lookupTimeout);
  }
}

function selectMapPoint(latlng, isCurrentLocation = false) {
  if (selectedMarker) selectedMarker.setLatLng(latlng);
  else selectedMarker = L.marker(latlng).addTo(locationMap);
  selectedMarker.bindPopup(isCurrentLocation ? 'موقعك الحالي' : 'موقع التوصيل').openPopup();
  locationStatus.textContent = 'جارٍ تحديد عنوان المكان…';
  clearTimeout(lookupTimer);
  lookupTimer = setTimeout(() => lookupAddress(latlng).catch(error => {
    if (error.name !== 'AbortError') locationStatus.textContent = 'تعذر جلب عنوان هذه النقطة. يمكنك إدخال العنوان يدوياً.';
  }), 1200);
}
locationMap.on('click', event => selectMapPoint(event.latlng));
function requestCurrentLocation() {
  if (!navigator.geolocation) { locationStatus.textContent = 'تعذر الوصول إلى موقع الجهاز. يمكنك اختيار مكانك على الخريطة.'; return; }
  locationStatus.textContent = 'جارٍ تحديد موقعك تلقائياً…';
  navigator.geolocation.getCurrentPosition(position => {
    const latlng = L.latLng(position.coords.latitude, position.coords.longitude);
    locationMap.setView(latlng, 16);
    selectMapPoint(latlng, true);
  }, error => {
    if (error.code === 1) {
      locationStatus.textContent = 'لم يسمح المتصفح بالوصول للموقع. فعّل إذن الموقع لـEdge وخدمات الموقع في Windows ثم أعد فتح الصفحة.';
    } else if (error.code === 3) {
      locationStatus.textContent = 'لم يصل الموقع خلال ١٥ ثانية. اختر مكانك على الخريطة أو أعد فتح الصفحة بعد تفعيل خدمات الموقع.';
    } else {
      locationStatus.textContent = 'خدمة الموقع غير متاحة الآن. اختر مكانك على الخريطة أو أعد فتح الصفحة لاحقاً.';
    }
  }, {enableHighAccuracy:false, timeout:15000, maximumAge:600000});
}
if (window.isSecureContext) requestCurrentLocation();
else locationStatus.textContent = 'لتحديد موقعك الفعلي شغّل start-site.bat من مجلد المتجر وافتح الصفحة التي تظهر، أو اختر مكانك يدوياً على الخريطة.';





