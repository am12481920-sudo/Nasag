(() => {
  const key = 'nusj-cart';
  const read = () => {
    try { return JSON.parse(localStorage.getItem(key) || '[]'); }
    catch { return []; }
  };
  const write = cart => {
    localStorage.setItem(key, JSON.stringify(cart));
    updateBadges();
    window.dispatchEvent(new CustomEvent('nusj-cart-changed'));
  };
  const itemId = item => item.id || `${item.name}::${item.size || ''}::${item.color || ''}`;
  const updateBadges = () => {
    const count = read().reduce((sum, item) => sum + item.qty, 0);
    document.querySelectorAll('.cart-count').forEach(node => node.textContent = count);
  };
  window.NusjCart = {
    read,
    add(product) {
      const cart = read();
      const id = itemId(product);
      const existing = cart.find(item => itemId(item) === id);
      if (existing) existing.qty += 1;
      else cart.push({ ...product, id, qty: 1 });
      write(cart);
    },
    change(id, delta) {
      write(read().map(item => itemId(item) === id ? { ...item, qty: item.qty + delta } : item).filter(item => item.qty > 0));
    },
    remove(id) { write(read().filter(item => itemId(item) !== id)); },
    clear() { write([]); }
  };
  document.addEventListener('DOMContentLoaded', updateBadges);
})();
