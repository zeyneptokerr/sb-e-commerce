import React, { useEffect } from 'react'
import { useForm } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import Spinners from '../shared/Spinners';
import toast from 'react-hot-toast';
import { addUpdateUserAddress } from '../../store/actions';

const Field = ({ label, id, register, errors, placeholder, type = 'text', required = true, ...inputProps }) => (
    <div className="min-w-0">
        {label && <label htmlFor={id} className="mb-1.5 block text-xs font-semibold text-slate-800">{label}{required && ' *'}</label>}
        <input
            id={id}
            type={type}
            placeholder={placeholder}
            className={`h-10 w-full rounded border bg-white px-2.5 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-orange-400 ${errors[id] ? 'border-red-500' : 'border-slate-200'}`}
            {...register(id, { required: required ? `${label || 'Bu alan'} zorunludur` : false })}
            {...inputProps}
        />
        {errors[id]?.message && <p className="mt-1 text-xs text-red-600">{errors[id].message}</p>}
    </div>
);

const AddAddressForm = ({ address, setOpenAddressModal }) => {
    const dispatch = useDispatch();
    const { btnLoader } = useSelector((state) => state.errors);
    const { register, handleSubmit, reset, formState: { errors } } = useForm({ mode: 'onTouched' });

    const onSaveAddressHandler = (data) => {
        dispatch(addUpdateUserAddress(
            { ...data, country: 'Türkiye', pincode: data.pincode || null },
            toast,
            address?.addressId,
            setOpenAddressModal
        ));
    };

    useEffect(() => {
        reset(address?.addressId ? {
            firstName: address.firstName || '',
            lastName: address.lastName || '',
            phone: address.phone || '',
            state: address.state || '',
            city: address.city || '',
            neighborhood: address.neighborhood || '',
            street: address.street || '',
            buildingName: address.buildingName || '',
            addressType: address.addressType || 'Bireysel',
            pincode: address.pincode || '',
        } : { addressType: 'Bireysel' });
    }, [address, reset]);

    return (
        <form onSubmit={handleSubmit(onSaveAddressHandler)} className="text-slate-800">
            <h2 className="mb-6 pr-8 text-base font-semibold">{address?.addressId ? 'Adresi düzenle' : 'Adres ekle'}</h2>
            <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field label="Ad" id="firstName" placeholder="Adınızı giriniz" register={register} errors={errors} />
                    <Field label="Soyad" id="lastName" placeholder="Soyadınızı giriniz" register={register} errors={errors} />
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-[106px_minmax(0,1fr)] sm:items-end">
                    <div>
                        <label className="mb-1.5 block text-xs font-semibold">Telefon *</label>
                        <div className="flex h-10 items-center rounded border border-slate-200 bg-slate-100 px-2 text-sm text-slate-500">+90</div>
                    </div>
                    <Field label="" id="phone" placeholder="(5__) ___ __ __" register={register} errors={errors} type="tel" />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field label="İl" id="state" placeholder="İl seçiniz" register={register} errors={errors} />
                    <Field label="İlçe" id="city" placeholder="İlçe seçiniz" register={register} errors={errors} />
                </div>
                <Field label="Mahalle" id="neighborhood" placeholder="Mahalle giriniz" register={register} errors={errors} />

                <div className="rounded-md bg-orange-50 px-3 py-2.5 text-xs leading-4 text-slate-700">
                    <span className="mr-2 font-bold text-orange-500">ⓘ</span>
                    Kargonuzun size sorunsuz bir şekilde ulaşabilmesi için mahalle, cadde, sokak, bina gibi detay bilgileri eksiksiz girdiğinizden emin olun.
                </div>

                <div>
                    <label htmlFor="street" className="mb-1.5 block text-xs font-semibold">Adres *</label>
                    <textarea
                        id="street"
                        placeholder="Cadde, mahalle, sokak ve diğer bilgileri giriniz."
                        className={`min-h-[76px] w-full resize-y rounded border bg-white px-2.5 py-2 text-sm outline-none placeholder:text-slate-400 focus:border-orange-400 ${errors.street ? 'border-red-500' : 'border-slate-200'}`}
                        {...register('street', { required: 'Adres zorunludur' })}
                    />
                    {errors.street?.message && <p className="mt-1 text-xs text-red-600">{errors.street.message}</p>}
                </div>

                <Field label="Adres Başlığı" id="buildingName" placeholder="Adres Başlığı Giriniz" register={register} errors={errors} />
                <div>
                    <p className="mb-1.5 text-xs font-semibold">Fatura Türü</p>
                    <div className="grid grid-cols-2 overflow-hidden rounded-md border border-slate-200 bg-slate-100">
                        {['Bireysel', 'Kurumsal'].map((type) => (
                            <label key={type} className="cursor-pointer">
                                <input type="radio" value={type} className="peer sr-only" {...register('addressType')} />
                                <span className="block border border-transparent py-2.5 text-center text-xs text-slate-500 peer-checked:rounded-md peer-checked:border-orange-400 peer-checked:bg-white peer-checked:font-semibold peer-checked:text-orange-600">{type}</span>
                            </label>
                        ))}
                    </div>
                </div>
            </div>
            <div className="-mx-6 mt-4 border-t border-slate-200 px-6 pt-3">
                <button disabled={btnLoader} className="flex h-10 w-full items-center justify-center rounded bg-orange-500 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-60" type="submit">
                    {btnLoader ? <><Spinners /> Kaydediliyor...</> : 'Kaydet'}
                </button>
            </div>
        </form>
    );
};

export default AddAddressForm;