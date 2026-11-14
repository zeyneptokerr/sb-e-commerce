import { useMemo } from "react";
import { MdArrowBack, MdShoppingCart } from "react-icons/md";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import CartEmpty from "./CartEmpty";
import ItemContent from "./ItemContent";
import { formatPrice } from "../../utils/formatPrice";

const Cart = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { cart } = useSelector((state) => state.carts);

    const groups = useMemo(() => {
        const grouped = new Map();
        cart.forEach((item) => {
            const key = item.sellerId ?? item.sellerName ?? "unknown-seller";
            if (!grouped.has(key)) grouped.set(key, { key, sellerName: item.sellerName || "Satıcı bilgisi yok", items: [] });
            grouped.get(key).items.push(item);
        });
        return [...grouped.values()];
    }, [cart]);

    const selectedItems = cart.filter((item) => item.selected !== false);
    const selectedTotal = selectedItems.reduce((sum, item) => sum + Number(item.specialPrice ?? item.price) * Number(item.quantity), 0);
    const toggleGroup = (group) => {
        const shouldSelect = !group.items.every((item) => item.selected !== false);
        const productIds = group.items.map((item) => item.productId);
        dispatch({ type: "SET_CART_ITEM_SELECTION", payload: { productIds, selected: shouldSelect } });
        localStorage.setItem("cartItems", JSON.stringify(
            cart.map((item) => productIds.includes(item.productId) ? { ...item, selected: shouldSelect } : item)
        ));
    };

    if (!cart || cart.length === 0) return <CartEmpty />;

    return <main className="mx-auto min-h-[calc(100vh-70px)] max-w-7xl px-4 py-8 sm:px-8">
        <header className="mb-6 flex items-center gap-3">
            <MdShoppingCart size={30} className="text-slate-700" />
            <div><h1 className="text-2xl font-bold text-slate-900">Sepetim</h1><p className="text-sm text-slate-500">{cart.length} ürün</p></div>
        </header>

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
            <section className="space-y-4">
                {groups.map((group) => {
                    const allSelected = group.items.every((item) => item.selected !== false);
                    const selectedCount = group.items.filter((item) => item.selected !== false).length;
                    return <article key={group.key} className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                        <header className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
                            <label className="flex cursor-pointer items-center gap-3">
                                <input type="checkbox" checked={allSelected} onChange={() => toggleGroup(group)} className="h-5 w-5 accent-orange-500" />
                                <span className="text-sm font-semibold text-slate-800">Satıcı: {group.sellerName}</span>
                                <span className="rounded bg-emerald-600 px-2 py-0.5 text-xs font-bold text-white">{selectedCount}/{group.items.length}</span>
                            </label>
                            <span className="hidden text-xs text-slate-500 sm:inline">{formatPrice(group.items.filter((item) => item.selected !== false).reduce((sum, item) => sum + Number(item.specialPrice ?? item.price) * Number(item.quantity), 0))}</span>
                        </header>
                        <div className="divide-y divide-slate-100 px-3 sm:px-4">
                            {group.items.map((item) => <ItemContent key={item.productId} {...item} />)}
                        </div>
                    </article>;
                })}
                <Link className="inline-flex items-center gap-2 pt-1 text-sm text-slate-500 hover:text-slate-800" to="/products">
                    <MdArrowBack /> Alışverişe devam et
                </Link>
            </section>

            <aside className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm lg:sticky lg:top-24">
                <h2 className="mb-4 text-xl font-bold text-slate-900">Sepet Özeti</h2>
                <div className="space-y-3 border-b border-slate-200 pb-4 text-sm">
                    <div className="flex justify-between gap-3 text-slate-600"><span>Seçili ürün ({selectedItems.length})</span><span>{formatPrice(selectedTotal)}</span></div>
                    <div className="flex justify-between gap-3 text-slate-500"><span>Seçilmeyen ürün</span><span>{cart.length - selectedItems.length}</span></div>
                </div>
                <div className="flex justify-between py-4 text-base font-bold text-slate-900"><span>Toplam</span><span className="text-orange-600">{formatPrice(selectedTotal)}</span></div>
                <button type="button" disabled={!selectedItems.length} onClick={() => navigate("/checkout")}
                    className="w-full rounded-md bg-orange-500 px-4 py-3 font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-slate-300">
                    Seçili ürünleri onayla
                </button>
                {!selectedItems.length && <p className="mt-2 text-center text-xs text-slate-500">Devam etmek için en az bir ürün seçin.</p>}
            </aside>
        </div>
    </main>;
};

export default Cart;