import { useState } from "react";
import { HiOutlineTrash } from "react-icons/hi";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import SetQuantity from "./SetQuantity";
import { decreaseCartQuantity, increaseCartQuantity, removeFromCart } from "../../store/actions";
import { formatPrice } from "../../utils/formatPrice";
import truncateText from "../../utils/truncateText";
import { productImageUrl } from "../../utils/productImageUrl";

const ItemContent = ({ productId, productName, image, description, quantity, price, specialPrice, sellerName, sellerId, selected = true }) => {
    const [currentQuantity, setCurrentQuantity] = useState(quantity);
    const dispatch = useDispatch();
    const cart = useSelector((state) => state.carts.cart);
    const unitPrice = Number(specialPrice ?? price);
    const itemData = { productId, productName, image, description, price, specialPrice, quantity: currentQuantity, sellerName, sellerId, selected };

    const toggleSelected = () => {
        dispatch({ type: "TOGGLE_CART_ITEM_SELECTED", payload: { productId } });
        localStorage.setItem("cartItems", JSON.stringify(cart.map((item) => item.productId === productId
            ? { ...item, selected: !(item.selected ?? true) }
            : item)));
    };

    const handleQtyIncrease = () => dispatch(increaseCartQuantity(itemData, toast, currentQuantity, setCurrentQuantity));
    const handleQtyDecrease = () => {
        if (currentQuantity <= 1) return;
        const newQuantity = currentQuantity - 1;
        setCurrentQuantity(newQuantity);
        dispatch(decreaseCartQuantity(itemData, newQuantity));
    };
    const removeItem = () => dispatch(removeFromCart(itemData, toast));

    return <article className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:gap-4">
        <input type="checkbox" checked={selected} onChange={toggleSelected} aria-label={`${productName} ürününü seç`} className="h-5 w-5 shrink-0 accent-orange-500" />
        <img src={productImageUrl(image)} alt={productName} className="h-24 w-24 shrink-0 rounded-md border border-slate-100 object-contain sm:h-28 sm:w-28" />
        <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-slate-800" title={productName}>{truncateText(productName, 80)}</h3>
            <p className="mt-1 line-clamp-2 text-xs text-slate-500">{description}</p>
            {sellerName && <p className="mt-2 text-xs text-slate-500">Satıcı: {sellerName}</p>}
            <button type="button" onClick={removeItem} className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-rose-600 hover:text-rose-700">
                <HiOutlineTrash size={15} /> Sepetten kaldır
            </button>
        </div>
        <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end">
            <SetQuantity quantity={currentQuantity} cardCounter handeQtyIncrease={handleQtyIncrease} handleQtyDecrease={handleQtyDecrease} />
            <div className="text-right">
                <p className="font-bold text-slate-900">{formatPrice(unitPrice * currentQuantity)}</p>
                <p className="text-xs text-slate-500">{formatPrice(unitPrice)} / adet</p>
            </div>
        </div>
    </article>;
};

export default ItemContent;
