
import React, { useEffect, useRef, useState } from 'react'
import Skeleton from '../shared/Skeleton';
import { FaEdit, FaMapMarkerAlt, FaPlus, FaTrash } from 'react-icons/fa';
import AddressInfoModal from './AddressInfoModal';
import AddAddressForm from './AddAddressForm';
import { useDispatch, useSelector } from 'react-redux';
import AddressList from './AddressList';
import { DeleteModal } from './DeleteModal';
import toast from 'react-hot-toast';
import { deleteUserAddress, selectUserCheckoutAddress } from '../../store/actions';
import { formatPriceCalculation } from '../../utils/formatPrice';
import { productImageUrl } from '../../utils/productImageUrl';

const AddressInfo = ({ address, cart = [], total = 0 }) => {
    const [openAddressModal, setOpenAddressModal] = useState(false);
    const [openDeleteModal, setOpenDeleteModal] = useState(false);
    const [selectedAddress, setSelectedAddress] = useState("");
    const [showAddressPicker, setShowAddressPicker] = useState(false);
    const autoOpened = useRef(false);
    const addNewAddressHandler = () => {
        setSelectedAddress("");
        setOpenAddressModal(true);
    };

    const dispatch = useDispatch();

    const deleteAddressHandler = () => {
        dispatch(deleteUserAddress(
            toast,
            selectedAddress?.addressId,
            setOpenDeleteModal
        ))
    };

    const noAddressExist = !address || address.length === 0;
    const { isLoading, btnLoader } = useSelector((state) => state.errors);
    const selectedUserCheckoutAddress = useSelector((state) => state.auth.selectedUserCheckoutAddress);
    useEffect(() => {
        if (noAddressExist && !autoOpened.current) {
            autoOpened.current = true;
            setOpenAddressModal(true);
        }
    }, [noAddressExist]);

    useEffect(() => {
        if (address?.length && !address.some((item) => item.addressId === selectedUserCheckoutAddress?.addressId)) {
            dispatch(selectUserCheckoutAddress(address[0]));
        }
    }, [address, dispatch, selectedUserCheckoutAddress]);

  return (
    <div className='pt-4'>
        <div className='mx-auto max-w-6xl px-4'>
                <div className='grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_280px]'>
                    <div className='space-y-4'>
                        <section className='overflow-hidden rounded-lg border border-slate-200 bg-white'>
                            <div className='flex items-center justify-between bg-slate-100 px-4 py-3'>
                                <h2 className='font-semibold text-slate-800'>Sepetimdeki Ürünler ({cart.length})</h2>
                                <div className='flex -space-x-2'>
                                    {cart.slice(0, 3).map((item) => <img key={item.productId} src={productImageUrl(item.image)} alt={item.productName} className='h-8 w-8 rounded-full border-2 border-white object-cover' />)}
                                </div>
                            </div>
                            <div className='border-t border-slate-200 px-4 py-5'>
                                <h3 className='font-semibold text-slate-800'>Teslimat Adresi</h3>
                                <div className='mt-5 flex items-center gap-2 text-sm font-semibold text-orange-600'>
                                    <FaMapMarkerAlt /> Adrese Teslim Edilsin
                                </div>
                                <div className='mt-5 flex flex-wrap items-center justify-between gap-3 text-sm font-semibold text-slate-700'>
                                    <span>Teslimat Adresi</span>
                                    <button
                                        onClick={() => noAddressExist ? addNewAddressHandler() : setShowAddressPicker((open) => !open)}
                                        className='rounded border border-orange-400 px-3 py-1.5 text-orange-600 hover:bg-orange-50'>
                                        + Adres Ekle / Değiştir
                                    </button>
                                </div>
                                {noAddressExist ? (
                                    <button onClick={addNewAddressHandler} className='mt-3 flex w-full max-w-sm items-center justify-center gap-2 rounded bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-200'>
                                        <FaPlus className='text-orange-500' /> Yeni Adres Ekle
                                    </button>
                                ) : isLoading ? (
                                    <div className='py-4'><Skeleton /></div>
                                ) : showAddressPicker ? (
                                    <div className='mt-3 max-w-2xl'>
                                        <AddressList
                                            addresses={address}
                                            setSelectedAddress={setSelectedAddress}
                                            setOpenAddressModal={setOpenAddressModal}
                                            setOpenDeleteModal={setOpenDeleteModal}
                                            onSelect={() => setShowAddressPicker(false)}
                                        />
                                        <button onClick={addNewAddressHandler} className='mt-3 flex w-full items-center justify-center gap-2 rounded bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-200'>
                                            <FaPlus className='text-orange-500' /> Yeni Adres Ekle
                                        </button>
                                    </div>
                                ) : (
                                    <div
                                        className='mt-3 flex w-full max-w-sm items-start justify-between gap-4 rounded border border-orange-400 bg-orange-50 px-3 py-2.5 text-xs text-slate-700'>
                                        <div className='min-w-0'>
                                            <span className='block truncate font-semibold'>
                                                {selectedUserCheckoutAddress?.buildingName || 'Teslimat adresi'}
                                                {[selectedUserCheckoutAddress?.neighborhood, selectedUserCheckoutAddress?.city, selectedUserCheckoutAddress?.state]
                                                    .filter(Boolean).length > 0 && ` (${[selectedUserCheckoutAddress?.neighborhood, selectedUserCheckoutAddress?.city, selectedUserCheckoutAddress?.state].filter(Boolean).join(' / ')})`}
                                            </span>
                                            <span className='mt-1 block truncate'>{selectedUserCheckoutAddress?.street}</span>
                                        </div>
                                        <div className='flex shrink-0 items-center gap-3'>
                                            <button
                                                type='button'
                                                onClick={() => { setSelectedAddress(selectedUserCheckoutAddress); setOpenAddressModal(true); }}
                                                aria-label='Teslimat adresini düzenle'
                                                className='text-teal-700 hover:text-teal-900'>
                                                <FaEdit size={16} />
                                            </button>
                                            <button
                                                type='button'
                                                onClick={() => { setSelectedAddress(selectedUserCheckoutAddress); setOpenDeleteModal(true); }}
                                                aria-label='Teslimat adresini sil'
                                                className='text-rose-600 hover:text-rose-800'>
                                                <FaTrash size={15} />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </section>
                    </div>
                    <aside className='h-fit rounded-lg border border-slate-200 bg-white p-4'>
                        <h2 className='mb-4 text-lg font-semibold text-slate-800'>Sipariş Özeti</h2>
                        <div className='flex justify-between border-b border-slate-100 pb-3 text-sm text-slate-600'>
                            <span>Ara Toplam</span><span>{formatPriceCalculation(total, 1)} TL</span>
                        </div>
                        <div className='flex justify-between py-3 font-semibold text-slate-800'>
                            <span>Toplam</span><span className='text-orange-600'>{formatPriceCalculation(total, 1)} TL</span>
                        </div>
                        <p className='text-xs text-slate-500'>{noAddressExist ? 'Siparişinizi tamamlamak için teslimat adresi ekleyin.' : 'Seçili adresinize teslim edilecektir.'}</p>
                    </aside>
                </div>
        </div>


        <AddressInfoModal
            open={openAddressModal}
            setOpen={setOpenAddressModal}>
                <AddAddressForm 
                    address={selectedAddress}
                    setOpenAddressModal={setOpenAddressModal}/>
        </AddressInfoModal>

        <DeleteModal 
            open={openDeleteModal}
            loader={btnLoader}
            setOpen={setOpenDeleteModal}
            title="Delete Address"
            onDeleteHandler={deleteAddressHandler}
        />
    </div>
  )
}

export default AddressInfo;
