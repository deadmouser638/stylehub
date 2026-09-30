import React, { useState, useEffect, useContext, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CircleCheck, CreditCard, Smartphone, Banknote, MapPin, Plus, ShieldCheck, Check, ArrowRight, Truck, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { CartContext } from '../context/CartContext';
import AddressForm from '../components/AddressForm';
import PriceSummary from '../components/PriceSummary';
import UpiPayment from '../components/UpiPayment';
import { Spinner } from '../components/ui/Skeletons';
import { getCartSummary } from '../utils/pricing';
import { addDays, formatPrice } from '../utils/format';
import api from '../utils/api';

const STEPS = ['Bag', 'Address', 'Payment'];

const loadRazorpay = () => new Promise((resolve, reject) => {
  if (window.Razorpay) return resolve();
  const script = document.createElement('script');
  script.src = 'https://checkout.razorpay.com/v1/checkout.js';
  script.onload = resolve;
  script.onerror = () => reject(new Error('Could not load the card payment window'));
  document.body.appendChild(script);
});
const PAYMENT_METHODS = [
  { value: 'UPI', label: 'UPI', hint: 'Google Pay, PhonePe, Paytm & more', icon: Smartphone },
  { value: 'Card', label: 'Credit / Debit card', hint: 'Visa, Mastercard, RuPay', icon: CreditCard },
  { value: 'COD', label: 'Cash on delivery', hint: 'Pay when your order arrives', icon: Banknote },
];

const Checkout = () => {
  const [placed, setPlaced] = useState(() => {
    try {
      const saved = sessionStorage.getItem('last_placed_order');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [paymentState, setPaymentState] = useState(() => {
    try {
      return sessionStorage.getItem('last_payment_state') || null;
    } catch {
      return null;
    }
  });
  const [step, setStep] = useState(() => (placed ? 3 : 1)); // 1 = address, 2 = payment, 3 = confirmed
  const [addresses, setAddresses] = useState([]);
  const [addressesLoading, setAddressesLoading] = useState(true);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [placing, setPlacing] = useState(false);
  const [payConfig, setPayConfig] = useState({ upi: { enabled: true }, card: { enabled: false }, cod: { enabled: true } });

  const { cart, cartLoading, fetchCart, appliedCoupon, setAppliedCoupon } = useContext(CartContext);
  const navigate = useNavigate();

  const loadAddresses = useCallback(async (preferredId) => {
    try {
      const res = await api.get('/addresses');
      const list = res.data.data;
      setAddresses(list);
      setShowAddressForm(list.length === 0);
      const preferred = list.find(a => a.id === preferredId) || list.find(a => a.is_default) || list[0];
      setSelectedAddress(preferred ? preferred.id : null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not load addresses');
    } finally {
      setAddressesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAddresses();
    api.get('/payments/config').then(res => setPayConfig(res.data.data)).catch(() => {});
  }, [loadAddresses]);

  const payByCard = async (order) => {
    try {
      await loadRazorpay();
      const res = await api.post(`/payments/razorpay/${order.orderId}`);
      const rz = res.data.data;
      const checkout = new window.Razorpay({
        key: rz.keyId,
        amount: rz.amount,
        currency: rz.currency,
        name: rz.name,
        description: `Order #${order.orderId}`,
        order_id: rz.razorpayOrderId,
        prefill: rz.prefill,
        theme: { color: '#e11d48' },
        handler: async (response) => {
          try {
            await api.post(`/payments/razorpay/${order.orderId}/verify`, response);
            setPaymentState('paid');
          } catch (err) {
            toast.error(err.response?.data?.message || 'Payment verification failed');
            setPaymentState('failed');
          }
        },
        modal: { ondismiss: () => setPaymentState(s => (s === 'paid' ? s : 'failed')) },
      });
      checkout.open();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
      setPaymentState('failed');
    }
  };

  useEffect(() => {
    if (!cartLoading && cart.length === 0 && !placed && step !== 3) {
      navigate('/cart', { replace: true });
    }
  }, [cart.length, cartLoading, navigate, placed, step]);

  const handlePlaceOrder = async () => {
    if (!selectedAddress && addresses.length > 0) {
      setSelectedAddress(addresses[0].id);
    }
    const targetAddressId = selectedAddress || (addresses[0]?.id ?? null);

    setPlacing(true);
    try {
      const res = await api.post('/orders', {
        address_id: targetAddressId,
        payment_method: paymentMethod,
        coupon_code: appliedCoupon?.code,
      });
      const order = res.data.data;
      const initialPState = order.paymentMethod === 'COD' ? 'cod' : 'awaiting';
      setPlaced(order);
      setPaymentState(initialPState);
      setStep(3);
      try {
        sessionStorage.setItem('last_placed_order', JSON.stringify(order));
        sessionStorage.setItem('last_payment_state', initialPState);
      } catch {}
      if (order.paymentMethod === 'Card') payByCard(order);
      setAppliedCoupon(null);
      fetchCart();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error placing order');
    } finally {
      setPlacing(false);
    }
  };

  const handleUpiSubmitted = () => {
    setPaymentState('verifying');
    try {
      sessionStorage.setItem('last_payment_state', 'verifying');
    } catch {}
  };

  const handleCancelUpiAndGoBack = () => {
    try {
      sessionStorage.removeItem('last_placed_order');
      sessionStorage.removeItem('last_payment_state');
    } catch {}
    setPlaced(null);
    setPaymentState(null);
    setStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const summary = getCartSummary(cart, appliedCoupon);

  if (cartLoading || addressesLoading) return <Spinner />;

  if ((step === 3 || placed) && placed) {
    const eta = addDays(new Date(), 5).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });

    if (placed.paymentMethod === 'UPI' && paymentState === 'awaiting') {
      return (
        <div className="container-x py-8 md:py-12">
          <div className="card mx-auto max-w-3xl p-5 animate-slide-up sm:p-8">
            <div className="mb-4 flex items-center justify-between">
              <p className="eyebrow">Order #{placed.orderId} reserved</p>
              <button
                onClick={handleCancelUpiAndGoBack}
                className="btn-ghost flex items-center gap-1.5 text-xs font-bold text-muted hover:text-fg"
              >
                ← Choose another payment method
              </button>
            </div>
            <h1 className="mt-1 font-display text-3xl font-semibold">Complete your UPI payment</h1>
            <p className="mb-6 mt-1 text-sm text-muted">Pay {formatPrice(placed.amount)} to confirm your order, or switch to Cash on Delivery / Card.</p>
            <UpiPayment payment={placed.upi} onSubmitted={handleUpiSubmitted} />
            <div className="mt-6 border-t border-line pt-4 text-center">
              <button
                onClick={handleCancelUpiAndGoBack}
                className="btn-outline text-xs font-extrabold"
              >
                Change Payment Method (Pay via Cash on Delivery or Card)
              </button>
            </div>
          </div>
        </div>
      );
    }

    const views = {
      cod: { icon: CircleCheck, tone: 'bg-success-soft text-success', title: 'Order confirmed!', text: `Pay ${formatPrice(placed.amount)} in cash or UPI when your order arrives.` },
      paid: { icon: CircleCheck, tone: 'bg-success-soft text-success', title: 'Payment successful!', text: 'Your payment was received and your order is confirmed.' },
      verifying: { icon: Clock, tone: 'bg-accent-soft text-accent-text', title: 'Payment submitted', text: "Thanks! We're verifying your UPI payment and will confirm your order shortly." },
      awaiting: { icon: Clock, tone: 'bg-accent-soft text-accent-text', title: 'Complete your payment', text: 'The card payment window is open. Finish paying there to confirm your order.' },
      failed: { icon: Clock, tone: 'bg-accent-soft text-accent-text', title: 'Payment not completed', text: 'Your order is saved. You can complete the payment from My Orders, or cancel it there.' },
    };
    const view = views[paymentState] || views.cod;
    const Icon = view.icon;
    const retryCard = placed.paymentMethod === 'Card' && paymentState === 'failed' && payConfig.card.enabled;
    return (
      <div className="container-x py-12">
        <div className="card mx-auto max-w-xl px-6 py-12 text-center animate-slide-up">
          <span className={`mx-auto grid h-20 w-20 place-items-center rounded-full ${view.tone}`}><Icon size={42} /></span>
          <h1 className="mt-6 font-display text-4xl font-semibold">{view.title}</h1>
          <p className="mt-2 text-muted">Order <strong className="text-fg">#{placed.orderId}</strong> · {view.text}</p>
          {paymentState !== 'failed' && (
            <div className="mx-auto mt-6 flex max-w-sm items-center gap-3 rounded-2xl bg-surface-2 p-4 text-left">
              <Truck size={22} className="shrink-0" />
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-muted">Estimated delivery</p>
                <p className="font-extrabold">{eta}</p>
              </div>
            </div>
          )}
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {retryCard && <button onClick={() => { setPaymentState('awaiting'); payByCard(placed); }} className="btn-primary">Try paying again</button>}
            <button onClick={() => navigate('/orders')} className={retryCard ? 'btn-outline' : 'btn-primary'}>View my orders</button>
            <Link to="/products" className="btn-outline">Continue shopping</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-x py-8 md:py-12">
      {/* Stepper */}
      <ol className="mx-auto mb-10 flex max-w-lg items-center" aria-label="Checkout progress">
        {STEPS.map((s, i) => {
          const done = step > i;
          const current = step === i;
          return (
            <li key={s} className="flex flex-1 items-center last:flex-none">
              <span className={`flex items-center gap-2 text-sm font-extrabold ${done || current ? 'text-fg' : 'text-muted'}`} aria-current={current ? 'step' : undefined}>
                <span className={`grid h-8 w-8 place-items-center rounded-full text-xs ${done ? 'bg-success text-on-success' : current ? 'bg-ink text-on-ink' : 'bg-surface-3 text-muted'}`}>
                  {done ? <Check size={15} strokeWidth={3} /> : i + 1}
                </span>
                {s}
              </span>
              {i < STEPS.length - 1 && <span className={`mx-3 h-0.5 flex-1 rounded ${step > i ? 'bg-success' : 'bg-surface-3'}`} aria-hidden="true" />}
            </li>
          );
        })}
      </ol>

      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        <div>
          {step === 1 && (
            <section className="animate-fade-in">
              <h1 className="mb-5 font-display text-2xl font-semibold">Where should we deliver?</h1>
              <div className="grid gap-4 sm:grid-cols-2">
                {addresses.map(addr => {
                  const active = selectedAddress === addr.id;
                  return (
                    <button key={addr.id} onClick={() => setSelectedAddress(addr.id)} className={`card relative p-5 text-left transition ${active ? 'border-fg ring-2 ring-fg' : 'hover:border-line-strong'}`} aria-pressed={active}>
                      {active && <span className="absolute right-4 top-4 grid h-6 w-6 place-items-center rounded-full bg-ink text-on-ink"><Check size={14} strokeWidth={3} /></span>}
                      <p className="flex items-center gap-2 font-extrabold">
                        {addr.name}
                        <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-bold">{addr.type}</span>
                        {addr.is_default ? <span className="text-[11px] font-bold text-accent-text">DEFAULT</span> : null}
                      </p>
                      <p className="mt-2 text-sm text-muted">{addr.address_line}</p>
                      <p className="text-sm text-muted">{addr.city}, {addr.state} – {addr.pincode}</p>
                      <p className="mt-2 text-sm">Mobile: <strong>{addr.phone}</strong></p>
                    </button>
                  );
                })}
                {!showAddressForm && (
                  <button onClick={() => setShowAddressForm(true)} className="flex min-h-36 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line-strong p-5 font-bold transition hover:border-fg">
                    <Plus size={22} /> Add new address
                  </button>
                )}
              </div>

              {showAddressForm && (
                <div className="mt-5">
                  <AddressForm onSaved={(id) => loadAddresses(id)} onCancel={addresses.length > 0 ? () => setShowAddressForm(false) : undefined} />
                </div>
              )}

              <button onClick={() => { setStep(2); window.scrollTo({ top: 0, behavior: 'smooth' }); }} disabled={!selectedAddress} className="btn-primary mt-8 w-full py-4 text-base sm:w-auto sm:px-12">
                Continue to payment <ArrowRight size={18} />
              </button>
            </section>
          )}

          {step === 2 && (
            <section className="animate-fade-in">
              <div className="mb-5 flex items-center justify-between gap-4">
                <h1 className="font-display text-2xl font-semibold">How would you like to pay?</h1>
                <button onClick={() => setStep(1)} className="link flex shrink-0 items-center gap-1 text-sm"><MapPin size={15} /> Change address</button>
              </div>
              <div className="space-y-3" role="radiogroup" aria-label="Payment method">
                {PAYMENT_METHODS.map(({ value, label, hint, icon: Icon }) => {
                  const active = paymentMethod === value;
                  const unavailable = value === 'Card' && !payConfig.card.enabled;
                  return (
                    <button type="button" key={value} role="radio" aria-checked={active} disabled={unavailable} onClick={() => setPaymentMethod(value)} className={`card flex w-full items-center gap-4 p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-55 sm:p-5 ${active ? 'border-fg ring-2 ring-fg' : 'hover:border-line-strong'}`}>
                      <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${active ? 'bg-ink text-on-ink' : 'bg-surface-2'}`}><Icon size={22} /></span>
                      <span className="flex-1">
                        <span className="block font-extrabold">{label}</span>
                        <span className="block text-sm text-muted">{unavailable ? 'Not available right now' : hint}</span>
                      </span>
                      <span className={`grid h-6 w-6 place-items-center rounded-full border-2 ${active ? 'border-fg' : 'border-line-strong'}`}>{active && <span className="h-3 w-3 rounded-full bg-fg" />}</span>
                    </button>
                  );
                })}
              </div>
              <p className="mt-4 flex items-start gap-2 text-xs text-muted"><ShieldCheck size={15} className="shrink-0 text-success" /> {paymentMethod === 'UPI' ? "After placing the order you'll get a UPI QR code for the exact amount." : paymentMethod === 'Card' ? 'Card payments are processed securely by Razorpay. We never see your card details.' : 'Pay in cash or by UPI to the delivery partner.'}</p>
              <button type="button" onClick={handlePlaceOrder} disabled={placing} className="btn-primary mt-8 w-full py-4 text-base sm:w-auto sm:px-12">
                {placing ? 'Placing order…' : paymentMethod === 'COD' ? `Confirm Cash on Delivery Order` : `Pay ₹${summary.total.toLocaleString('en-IN')}`}
              </button>
            </section>
          )}
        </div>

        <aside className="card h-fit p-5 lg:sticky lg:top-36">
          <h2 className="mb-4 text-sm font-extrabold uppercase tracking-wider">Order summary</h2>
          <ul className="mb-5 max-h-64 space-y-3 overflow-y-auto border-b border-line pb-5">
            {cart.map(item => (
              <li key={item.id} className="flex items-center gap-3">
                <img src={item.images[0]?.replace('w=800', 'w=160')} alt="" className="h-16 w-12 shrink-0 rounded-lg object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{item.brand}</p>
                  <p className="text-xs text-muted">{item.size ? `Size ${item.size} · ` : ''}Qty {item.quantity}</p>
                </div>
              </li>
            ))}
          </ul>
          <PriceSummary summary={summary} itemCount={cart.length} couponCode={appliedCoupon?.code} />
        </aside>
      </div>
    </div>
  );
};

export default Checkout;
