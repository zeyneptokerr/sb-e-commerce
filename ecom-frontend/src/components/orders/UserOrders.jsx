import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useSearchParams } from "react-router-dom";
import { FaBoxOpen } from "react-icons/fa";
import { getUserOrders } from "../../store/actions";
import { formatPrice } from "../../utils/formatPrice";
import Paginations from "../shared/Paginations";

const UserOrders = () => {
    const dispatch = useDispatch();
    const [searchParams] = useSearchParams();
    const { userOrders, userOrderPagination } = useSelector((state) => state.order);
    const { isLoading, errorMessage } = useSelector((state) => state.errors);
    const page = Math.max(1, Number(searchParams.get("page") || 1));

    useEffect(() => {
        const params = new URLSearchParams({
            pageNumber: String(page - 1),
            pageSize: "10",
        });
        dispatch(getUserOrders(params.toString()));
    }, [dispatch, page]);

    return (
        <main className="mx-auto min-h-[calc(100vh-70px)] max-w-5xl px-4 py-10 sm:px-8">
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-slate-800">My Orders</h1>
                <p className="mt-2 text-slate-500">Sipariş geçmişinizi ve durumlarını görüntüleyin.</p>
            </header>

            {isLoading ? (
                <p className="py-12 text-center text-slate-500">Siparişler yükleniyor...</p>
            ) : errorMessage ? (
                <p className="rounded-md bg-red-50 p-4 text-center text-red-700">{errorMessage}</p>
            ) : userOrders.length === 0 ? (
                <section className="flex flex-col items-center rounded-lg border border-slate-200 bg-white px-6 py-14 text-center shadow-sm">
                    <FaBoxOpen className="mb-4 text-5xl text-slate-400" />
                    <h2 className="text-xl font-semibold text-slate-700">Henüz siparişiniz yok</h2>
                    <p className="mt-2 text-slate-500">Ürünleri keşfedip ilk siparişinizi oluşturabilirsiniz.</p>
                    <Link to="/products" className="mt-6 rounded-md bg-custom-blue px-5 py-2 font-semibold text-white">
                        Ürünleri keşfet
                    </Link>
                </section>
            ) : (
                <>
                    <div className="space-y-5">
                        {userOrders.map((order) => (
                            <article key={order.orderId} className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 bg-slate-50 px-5 py-4">
                                    <div>
                                        <p className="font-semibold text-slate-800">Sipariş #{order.orderId}</p>
                                        <p className="mt-1 text-sm text-slate-500">Tarih: {order.orderDate || "—"}</p>
                                    </div>
                                    <div className="text-left sm:text-right">
                                        <p className="text-sm text-slate-500">Durum</p>
                                        <p className="font-semibold text-slate-800">{order.orderStatus || "Güncelleniyor"}</p>
                                    </div>
                                </div>

                                <div className="divide-y divide-slate-100 px-5">
                                    {(order.orderItems || []).map((item) => (
                                        <div key={item.orderItemId} className="flex flex-wrap items-center justify-between gap-3 py-4">
                                            <div>
                                                <p className="font-medium text-slate-800">{item.product?.productName || "Ürün bilgisi mevcut değil"}</p>
                                                <p className="mt-1 text-sm text-slate-500">Adet: {item.quantity}</p>
                                            </div>
                                            <p className="font-medium text-slate-700">
                                                {formatPrice(Number(item.orderedProductPrice) * Number(item.quantity))}
                                            </p>
                                        </div>
                                    ))}
                                </div>

                                <div className="flex flex-wrap justify-between gap-3 border-t border-slate-200 px-5 py-4">
                                    <p className="text-sm text-slate-500">
                                        Ödeme: {order.payment?.paymentMethod || "—"}
                                    </p>
                                    <p className="font-bold text-slate-800">Toplam: {formatPrice(order.totalAmount)}</p>
                                </div>
                            </article>
                        ))}
                    </div>

                    {userOrderPagination.totalPages > 1 && (
                        <div className="mt-8 flex justify-center">
                            <Paginations numberOfPage={userOrderPagination.totalPages} totalProducts={userOrderPagination.totalElements} />
                        </div>
                    )}
                </>
            )}
        </main>
    );
};

export default UserOrders;
