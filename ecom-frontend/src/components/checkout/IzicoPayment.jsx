import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { createIzicoPayment, getIyzicoInstallments } from '../../store/actions';

const months = Array.from({ length: 12 }, (_, index) => String(index + 1).padStart(2, '0'));
const currentYear = new Date().getFullYear();
const years = Array.from({ length: 16 }, (_, index) => String(currentYear + index));
const formatTL = (amount) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(Number(amount || 0));

const Input = ({ label, id, value, onChange, placeholder, ...props }) => (
  <label htmlFor={id} className="block min-w-0">
    {label && <span className="mb-1.5 block text-xs font-semibold text-slate-700">{label}</span>}
    <input
      id={id}
      value={value}
      onChange={onChange}
      required
      placeholder={placeholder}
      className="h-10 w-full rounded border border-slate-200 bg-slate-50 px-2.5 text-sm text-slate-800 outline-none transition focus:border-orange-400 focus:bg-white"
      {...props}
    />
  </label>
);

const Select = ({ label, value, onChange, options, placeholder }) => (
  <label className="block min-w-0">
    {label && <span className="mb-1.5 block text-xs font-semibold text-slate-700">{label}</span>}
    <select
      value={value}
      onChange={onChange}
      required
      className="h-10 w-full rounded border border-slate-200 bg-slate-50 px-2.5 text-sm text-slate-800 outline-none focus:border-orange-400"
    >
      <option value="">{placeholder}</option>
      {options.map((option) => <option key={option} value={option}>{option}</option>)}
    </select>
  </label>
);

const IzicoPayment = ({ enabled = true }) => {
  const dispatch = useDispatch();
  const { cart } = useSelector((state) => state.carts);
  const { user, selectedUserCheckoutAddress } = useSelector((state) => state.auth);
  const [card, setCard] = useState({
    cardHolderName: '', cardNumber: '', expireMonth: '', expireYear: '', cvc: '', identityNumber: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [installmentOptions, setInstallmentOptions] = useState(null);
  const [selectedInstallment, setSelectedInstallment] = useState(1);
  const [installmentLoading, setInstallmentLoading] = useState(false);
  const [installmentError, setInstallmentError] = useState('');

  const selectedCart = cart.filter((item) => item.selected !== false);
  const totalPrice = selectedCart.reduce((sum, item) => sum + Number(item.specialPrice ?? item.price) * Number(item.quantity), 0);
  const binNumber = card.cardNumber.replace(/\D/g, '').slice(0, 8);

  React.useEffect(() => {
    let cancelled = false;
    let timer;
    setSelectedInstallment(1);
    setInstallmentOptions(null);
    setInstallmentError('');

    if (!enabled || binNumber.length !== 8) {
      setInstallmentLoading(false);
      return undefined;
    }

    setInstallmentLoading(true);
    timer = window.setTimeout(async () => {
      const result = await dispatch(getIyzicoInstallments(binNumber));
      if (cancelled) return;
      setInstallmentLoading(false);
      if (result?.options?.length) {
        setInstallmentOptions(result.options);
      } else {
        setInstallmentOptions(null);
        setInstallmentError(result?.error || 'Bu kart için taksit bilgisi alınamadı.');
      }
    }, 350);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [binNumber, dispatch, enabled, totalPrice]);

  const visibleInstallments = installmentOptions || [{
    installmentNumber: 1,
    installmentPrice: totalPrice,
    totalPrice,
  }];
  const selectedOption = visibleInstallments.find((option) => option.installmentNumber === selectedInstallment)
    || visibleInstallments[0];

  const updateCard = (field) => (event) => {
    const value = event.target.value;
    setCard((current) => ({ ...current, [field]: value }));
  };

  const updateCardNumber = (event) => {
    const digits = event.target.value.replace(/\D/g, '').slice(0, 19);
    setCard((current) => ({ ...current, cardNumber: digits.replace(/(.{4})/g, '$1 ').trim() }));
  };

  const updateIdentityNumber = (event) => {
    setCard((current) => ({ ...current, identityNumber: event.target.value.replace(/\D/g, '').slice(0, 11) }));
  };

  const submitPayment = async (event) => {
    event.preventDefault();
    if (!enabled || !selectedUserCheckoutAddress) return;
    setErrorMessage('');
    setSubmitting(true);

    const result = await dispatch(createIzicoPayment({
      addressId: selectedUserCheckoutAddress.addressId,
      cardHolderName: card.cardHolderName.trim(),
      cardNumber: card.cardNumber.replace(/\s/g, ''),
      expireMonth: card.expireMonth,
      expireYear: card.expireYear,
      cvc: card.cvc,
      identityNumber: card.identityNumber,
      installment: selectedInstallment,
    }));

    if (result?.htmlContent) {
      // iyzico returns the bank's 3DS challenge as an auto-submitting HTML form.
      // Displaying that response replaces this page and continues to the 3DS callback.
      document.open();
      document.write(result.htmlContent);
      document.close();
      return;
    }

    setErrorMessage(result?.error || 'Ödeme başlatılamadı. Kart bilgilerinizi kontrol edip tekrar deneyin.');
    setSubmitting(false);
  };

  return (
    <section className="mx-auto w-full max-w-6xl px-4 pb-8">
      <form onSubmit={submitPayment} className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <header className="border-b border-slate-200 bg-slate-100 px-4 py-3">
          <h2 className="font-semibold text-slate-800">Ödeme Seçenekleri</h2>
        </header>

        <div className="p-4 sm:p-5">
          <div className="mb-5 flex items-center gap-2 text-sm font-semibold text-orange-600">
            <span className="flex h-4 w-4 items-center justify-center rounded-full border-2 border-orange-500"><span className="h-1.5 w-1.5 rounded-full bg-orange-500" /></span>
            <span className="text-lg" aria-hidden="true">▰</span>
            Banka &amp; Kredi Kartı ile Öde
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <section className="overflow-hidden rounded-lg border border-slate-200">
              <h3 className="border-b border-slate-200 px-3 py-2.5 text-xs font-semibold text-slate-700">Kart Bilgileri</h3>
              <div className="space-y-4 p-3">
                <Input
                  id="card-holder-name"
                  label="Kart Üzerindeki Ad Soyad"
                  value={card.cardHolderName}
                  onChange={updateCard('cardHolderName')}
                  placeholder="Kart üzerindeki ad soyad"
                  autoComplete="cc-name"
                  required
                />
                <Input
                  id="card-number"
                  label="Kart Numarası"
                  value={card.cardNumber}
                  onChange={updateCardNumber}
                  placeholder="•••• •••• •••• ••••"
                  inputMode="numeric"
                  autoComplete="cc-number"
                  maxLength={23}
                  required
                />
                <div className="grid grid-cols-[minmax(0,1fr)_80px] items-end gap-4 sm:grid-cols-[minmax(0,1fr)_80px]">
                  <div>
                    <span className="mb-1.5 block text-xs font-semibold text-slate-700">Son Kullanma Tarihi</span>
                    <div className="grid grid-cols-2 gap-2">
                      <Select label="" value={card.expireMonth} onChange={updateCard('expireMonth')} options={months} placeholder="Ay" />
                      <Select label="" value={card.expireYear} onChange={updateCard('expireYear')} options={years} placeholder="Yıl" />
                    </div>
                  </div>
                  <Input
                    id="card-cvc"
                    label="CVV"
                    value={card.cvc}
                    onChange={(event) => setCard((current) => ({ ...current, cvc: event.target.value.replace(/\D/g, '').slice(0, 4) }))}
                    placeholder="•••"
                    inputMode="numeric"
                    autoComplete="cc-csc"
                    maxLength={4}
                    required
                  />
                </div>
                <Input
                  id="identity-number"
                  label="T.C. Kimlik No"
                  value={card.identityNumber}
                  onChange={updateIdentityNumber}
                  placeholder="11 haneli kimlik numarası"
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={11}
                  required
                />
                <p className="text-[11px] leading-4 text-slate-500">Kimlik numarası ve kart bilgileri ödeme isteği için iyzico’ya iletilir; uygulamada saklanmaz.</p>
              </div>
            </section>

            <section className="h-fit overflow-hidden rounded-lg border border-slate-200">
              <h3 className="border-b border-slate-200 px-3 py-2.5 text-xs font-semibold text-slate-700">Taksit Seçenekleri</h3>
              {visibleInstallments.map((option) => (
                <label key={option.installmentNumber} className={`flex cursor-pointer items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 text-xs text-slate-700 last:border-b-0 ${selectedInstallment === option.installmentNumber ? 'bg-sky-50' : 'bg-white'}`}>
                  <span className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="installment"
                      value={option.installmentNumber}
                      checked={selectedInstallment === option.installmentNumber}
                      onChange={() => setSelectedInstallment(option.installmentNumber)}
                      className="accent-orange-500"
                    />
                    {option.installmentNumber === 1 ? 'Tek Çekim' : `${option.installmentNumber} Taksit · ${formatTL(option.installmentPrice)} x ${option.installmentNumber}`}
                  </span>
                  <span className="shrink-0 font-semibold">{formatTL(option.totalPrice)}</span>
                </label>
              ))}
              <div aria-live="polite" className="border-t border-slate-100 px-4 py-3 text-xs text-slate-500">
                {installmentLoading ? 'Kartınıza uygun taksit seçenekleri sorgulanıyor…' : installmentError || (binNumber.length < 8 ? 'Taksit seçenekleri için kart numarasının ilk 8 hanesini girin.' : 'Taksit seçenekleri kartınız için iyzico tarafından listelenir.')}
              </div>
            </section>
          </div>

          {errorMessage && <p role="alert" className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{errorMessage}</p>}

          <button
            type="submit"
            disabled={!enabled || submitting || !user}
            className="mt-5 w-full rounded-md bg-orange-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-slate-300 sm:w-auto sm:min-w-64"
          >
            {submitting ? '3D Secure bağlantısı hazırlanıyor...' : `3D Secure ile Öde · ${formatTL(selectedOption?.totalPrice ?? totalPrice)}`}
          </button>
          {!enabled && <p className="mt-2 text-xs text-slate-500">Ödeme için sepet ve teslimat adresi hazır olmalıdır.</p>}
        </div>
      </form>
    </section>
  );
};

export default IzicoPayment;