import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useSearchParams } from "react-router-dom";
import { FaBoxOpen } from "react-icons/fa";
import { getUserOrders } from "../../store/actions";
import { formatPrice } from "../../utils/formatPrice";
import Paginations from "../shared/Paginations";
import { productImageUrl } from "../../utils/productImageUrl";
import ProductCommentForm from "./ProductCommentForm";
import api from "../../api/api";

const UserOrders = () => {
    const dispatch = useDispatch();
    const [searchParams] = useSearchParams();
    const { userOrders, userOrderPagination } = useSelector((state) => state.order);
    const { isLoading, errorMessage } = useSelector((state) => state.errors);
    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const [expandedOrders, setExpandedOrders] = useState({});
    const [reviewExpandedOrders, setReviewExpandedOrders] = useState({});
    const [reviewingProduct, setReviewingProduct] = useState(null);
    const [existingComments, setExistingComments] = useState({});

    useEffect(() => {
        const params = new URLSearchParams({
            pageNumber: String(page - 1),
            pageSize: "10",
        });
        dispatch(getUserOrders(params.toString()));
    }, [dispatch, page]);

    useEffect(() => {
        let active = true;
        if (!userOrders.length) {
            setExistingComments({});
            return () => { active = false; };
        }
        Promise.all(userOrders.map((order) => api.get(`/comments/orders/${order.orderId}`)
            .then(({ data }) => data)
            .catch(() => [])))
            .then((ordersComments) => {
                if (!active) return;
                const mappedComments = {};
                ordersComments.flat().forEach((comment) => {
                    mappedComments[`${comment.deliveryNo}-${comment.productId}`] = comment;
                });
                setExistingComments(mappedComments);
            });
        return () => { active = false; };
    }, [userOrders]);

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
                    <div className="space-y-4">
                        {userOrders.map((order) => (
                            <article key={order.orderId} className="overflow-hidden rounded-lg border border-stone-200 bg-white">
                                <div className="grid grid-cols-2 gap-4 bg-stone-100 px-5 py-4 text-sm md:grid-cols-[1fr_1fr_1.4fr_1fr_auto] md:items-center">
                                    <div><p className="font-semibold text-slate-700">Sipariş Tarihi</p><p className="mt-0.5 text-slate-600">{order.orderDate || "—"}</p></div>
                                    <div><p className="font-semibold text-slate-700">Sipariş Özeti</p><p className="mt-0.5 text-slate-600">{(order.orderItems || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0)} Ürün</p></div>
                                    <div><p className="font-semibold text-slate-700">Alıcı</p><p className="mt-0.5 truncate text-slate-600">{order.email || "Sipariş sahibi"}</p></div>
                                    <div><p className="font-semibold text-slate-700">Toplam</p><p className="mt-0.5 font-medium text-orange-600">{formatPrice(order.totalAmount)}</p></div>
                                    <button type="button" onClick={() => setExpandedOrders((current) => ({ ...current, [order.orderId]: !current[order.orderId] }))}
                                        className="col-span-2 rounded bg-orange-500 px-5 py-2 font-semibold text-white hover:bg-orange-600 md:col-span-1">{expandedOrders[order.orderId] ? "Gizle" : "Detaylar"}</button>
                                </div>

                                <div className="m-4 flex flex-wrap items-center justify-between gap-4 rounded-lg border border-stone-200 px-5 py-4">
                                    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-4">
                                        <div className="min-w-52">
                                            <p className="flex items-center gap-2 font-semibold text-emerald-700"><span aria-hidden="true">✓</span>{order.orderStatus || "Sipariş alındı"}</p>
                                            <p className="mt-1 text-sm text-slate-600">Ödeme: {order.payment?.paymentMethod || "—"}</p>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {(order.orderItems || []).map((item) => {
                                                const product = item.product;
                                                return product?.productId ? <Link key={item.orderItemId} to={`/products/${product.productId}`} aria-label={`${product.productName} ürün detayına git`}
                                                    className="flex h-16 w-14 items-center justify-center overflow-hidden rounded border border-slate-200 bg-white p-1 hover:border-orange-400">
                                                    <img src={productImageUrl(product.image)} alt={product.productName || "Sipariş ürünü"} className="h-full w-full object-contain" />
                                                </Link> : <div key={item.orderItemId} className="flex h-16 w-14 items-center justify-center rounded border border-slate-200 bg-slate-50 text-xs text-slate-400">Ürün</div>;
                                            })}
                                        </div>
                                    </div>
                                    <button type="button" aria-expanded={Boolean(reviewExpandedOrders[order.orderId])}
                                        onClick={() => setReviewExpandedOrders((current) => ({ ...current, [order.orderId]: !current[order.orderId] }))}
                                        className="rounded border border-orange-500 px-5 py-2 text-sm font-semibold text-orange-600 hover:bg-orange-50">
                                        {reviewExpandedOrders[order.orderId] ? "Değerlendirmeyi kapat" : "Değerlendir"}
                                    </button>
                                </div>

                                {expandedOrders[order.orderId] && <section className="border-t border-slate-200 bg-slate-50/60 p-4 sm:p-5">
                                    <div className="mb-4 grid gap-3 rounded-md border border-slate-200 bg-white p-4 text-sm sm:grid-cols-3">
                                        <div><p className="text-xs text-slate-500">Sipariş No</p><p className="mt-1 font-medium text-slate-800">#{order.orderId}</p></div>
                                        <div><p className="text-xs text-slate-500">Sipariş Tarihi</p><p className="mt-1 font-medium text-slate-800">{order.orderDate || "—"}</p></div>
                                        <div><p className="text-xs text-slate-500">Paket Detayları</p><p className="mt-1 font-medium text-slate-800">{(order.orderItems || []).length} ürün, {(order.orderItems || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0)} adet</p></div>
                                    </div>
                                    <div className="mb-4 flex flex-wrap items-center gap-2 rounded-md bg-white px-4 py-3 text-sm">
                                        <span className="text-slate-500">Durum:</span>
                                        <span className="rounded border border-emerald-300 bg-emerald-50 px-3 py-1 font-semibold text-emerald-700">{order.orderStatus || "Sipariş alındı"}</span>
                                        <span className="rounded border border-slate-200 px-3 py-1 text-slate-600">Ödeme: {order.payment?.paymentMethod || "—"}</span>
                                    </div>
                                    {order.deliveryAddress && <section className="mb-4 rounded-md border border-slate-200 bg-white">
                                        <h3 className="border-b border-slate-200 bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">Teslimat Adresi</h3>
                                        <div className="grid gap-x-6 gap-y-1 px-4 py-3 text-sm text-slate-600 sm:grid-cols-2">
                                            <p>{order.deliveryAddress.buildingName}</p>
                                            <p>{order.deliveryAddress.street}</p>
                                            <p>{[order.deliveryAddress.city, order.deliveryAddress.state].filter(Boolean).join(", ")}</p>
                                            <p>{[order.deliveryAddress.pincode, order.deliveryAddress.country].filter(Boolean).join(" ")}</p>
                                        </div>
                                    </section>}
                                    <div className="space-y-3">
                                        {(order.orderItems || []).map((item) => {
                                            const product = item.product;
                                            const productHref = product?.productId ? `/products/${product.productId}` : null;
                                            return <article key={item.orderItemId} className="flex flex-col gap-4 rounded-md border border-slate-200 bg-white p-3 sm:flex-row sm:items-center">
                                                {productHref ? <Link to={productHref} aria-label={`${product.productName} ürün detayına git`} className="h-24 w-20 shrink-0 overflow-hidden rounded border border-slate-200 p-1">
                                                    <img src={productImageUrl(product.image)} alt={product.productName || "Sipariş ürünü"} className="h-full w-full object-contain" />
                                                </Link> : <div className="flex h-24 w-20 shrink-0 items-center justify-center rounded border border-slate-200 bg-slate-50 text-xs text-slate-400">Görsel yok</div>}
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{product?.productName || "Ürün bilgisi mevcut değil"}</p>
                                                    <p className="mt-1 line-clamp-2 text-sm text-slate-700">{product?.description || ""}</p>
                                                    <p className="mt-2 text-sm text-slate-600">Adet: <span className="font-medium text-slate-800">{item.quantity}</span></p>
                                                    <p className="mt-1 text-sm text-slate-600">Satıcı: <span className="font-medium text-slate-800">{product?.sellerName || "Belirtilmemiş"}</span></p>
                                                    <p className="mt-1 font-semibold text-orange-600">{formatPrice(Number(item.orderedProductPrice) * Number(item.quantity))}</p>
                                                </div>
                                                {productHref && <Link to={productHref} className="shrink-0 rounded border border-orange-500 px-4 py-2 text-center text-sm font-semibold text-orange-600 hover:bg-orange-50">Ürüne git</Link>}
                                            </article>;
                                        })}
                                    </div>
                                    <div className="mt-4 flex justify-end rounded-md border border-slate-200 bg-white px-4 py-3 text-sm">
                                        <span className="text-slate-600">Sipariş toplamı&nbsp;</span><strong className="text-slate-900">{formatPrice(order.totalAmount)}</strong>
                                    </div>
                                </section>}
                                {reviewExpandedOrders[order.orderId] && <section className="border-t border-slate-200 bg-slate-50/60 p-4 sm:p-5">
                                    <h3 className="mb-3 text-base font-semibold text-slate-800">Sipariş ürünleri</h3>
                                    {order.orderStatus?.toLowerCase() !== "delivered" && <p className="mb-3 rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-800">Ürünleri teslim aldıktan sonra değerlendirebilirsiniz.</p>}
                                    <div className="space-y-3">
                                        {(order.orderItems || []).map((item) => {
                                            const product = item.product;
                                            const productHref = product?.productId ? `/products/${product.productId}` : null;
                                            const reviewKey = `${order.orderId}-${product?.productId}`;
                                            const isDelivered = order.orderStatus?.toLowerCase() === "delivered";
                                            return <article key={item.orderItemId} className="flex flex-wrap items-center gap-4 rounded-md border border-slate-200 bg-white p-3">
                                                {productHref ? <Link to={productHref} className="h-20 w-16 shrink-0 rounded border border-slate-200 p-1" aria-label={`${product.productName} ürün detayına git`}>
                                                    <img src={productImageUrl(product.image)} alt={product.productName || "Sipariş ürünü"} className="h-full w-full object-contain" />
                                                </Link> : <div className="h-20 w-16 shrink-0 rounded border border-slate-200 bg-slate-50" />}
                                                <div className="min-w-0 flex-1">
                                                    <p className="font-medium text-slate-800">{product?.productName || "Ürün bilgisi mevcut değil"}</p>
                                                    <p className="mt-1 text-sm text-slate-500">Adet: {item.quantity}</p>
                                                    <p className="mt-1 font-semibold text-orange-600">{formatPrice(Number(item.orderedProductPrice) * Number(item.quantity))}</p>
                                                </div>
                                                {existingComments[reviewKey] && reviewingProduct !== reviewKey ? <span className="text-sm font-medium text-emerald-700">Yorumunuz mevcut</span> : null}
                                                <button type="button" disabled={!isDelivered || !product?.productId}
                                                    onClick={() => setReviewingProduct(reviewingProduct === reviewKey ? null : reviewKey)}
                                                    className="rounded border border-orange-500 px-4 py-2 text-sm font-semibold text-orange-600 hover:bg-orange-50 disabled:cursor-not-allowed disabled:border-slate-300 disabled:text-slate-400">
                                                    {reviewingProduct === reviewKey ? "Yorumu kapat" : existingComments[reviewKey] ? "Yorumunu düzenle" : "Ürünü değerlendir"}
                                                </button>
                                                {isDelivered && reviewingProduct === reviewKey && <ProductCommentForm key={`${reviewKey}-${existingComments[reviewKey]?.commentId || "new"}`} deliveryNo={order.orderId} productId={product.productId} existingComment={existingComments[reviewKey]}
                                                    onCancel={() => setReviewingProduct(null)}
                                                    onSubmitted={(savedComment) => { setExistingComments((current) => ({ ...current, [reviewKey]: savedComment })); setReviewingProduct(null); }}
                                                    onDeleted={() => { setExistingComments((current) => { const next = { ...current }; delete next[reviewKey]; return next; }); setReviewingProduct(null); }} />}
                                            </article>;
                                        })}
                                    </div>
                                </section>}
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
