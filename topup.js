const amount = 50000;
fetch('http://127.0.0.1:1337/api/payment/top-up', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ amount }),
})
  .then((res) => res.json())
  .then((data) => console.log('✅ Баланс пополнен:', data))
  .catch((err) => console.error('❌ Ошибка:', err));
