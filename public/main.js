async function fetchStatus() {
  const res = await fetch('/api/status');
  if (!res.ok) throw new Error('Failed to load status');
  return res.json();
}

function show(el, visible) { el.style.display = visible ? '' : 'none'; }

async function refreshUI() {
  try {
    const data = await fetchStatus();
    const status = document.getElementById('status');
    const product = document.getElementById('product');
    const noProduct = document.getElementById('noProduct');
    const btnAdd = document.getElementById('btnAdd');
    const btnOOS = document.getElementById('btnOOS');

    status.textContent = data.saleActive
      ? `Flash sale đang diễn ra (còn ${data.remaining}/${data.maxStock})`
      : `Flash sale chỉ mở từ ${data.window.startHour}h - ${data.window.endHour}h`;

    if (data.saleActive) {
      show(product, true);
      show(noProduct, false);
      if (data.remaining > 0) {
        show(btnAdd, true);
        show(btnOOS, false);
      } else {
        show(btnAdd, false);
        show(btnOOS, true);
      }
    } else {
      show(product, false);
      show(noProduct, true);
    }
  } catch (e) {
    document.getElementById('status').textContent = 'Lỗi tải trạng thái';
  }
}

async function submitOrder(e) {
  e.preventDefault();
  const phone = document.getElementById('phone').value.trim();
  const message = document.getElementById('message');
  message.textContent = '';
  if (!phone) {
    message.textContent = 'Vui lòng nhập số điện thoại';
    return;
  }
  if (phone.length > 20) {
    message.textContent = 'Số điện thoại tối đa 20 ký tự';
    return;
  }
  const btnAdd = document.getElementById('btnAdd');
  btnAdd.disabled = true;
  try {
    const res = await fetch('/api/order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone })
    });
    const data = await res.json();
    if (!res.ok) {
      message.textContent = data.error || 'Đặt hàng thất bại';
    } else {
      message.textContent = 'Đặt hàng thành công!';
      document.getElementById('orderForm').reset();
    }
    await refreshUI();
  } catch (e) {
    message.textContent = 'Có lỗi xảy ra';
  } finally {
    btnAdd.disabled = false;
  }
}

window.addEventListener('DOMContentLoaded', () => {
  document.getElementById('orderForm').addEventListener('submit', submitOrder);
  refreshUI();
  // Poll every 5s to update stock / window
  setInterval(refreshUI, 5000);
});

