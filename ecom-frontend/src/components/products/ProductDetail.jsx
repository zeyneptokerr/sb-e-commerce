import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { FaArrowLeft, FaShoppingCart } from "react-icons/fa";
import { MdDone, MdClose } from "react-icons/md";
import { useDispatch } from "react-redux";
import toast from "react-hot-toast";
import api from "../../api/api";
import { addToCart } from "../../store/actions";
import { productImageUrl } from "../../utils/productImageUrl";
import Loader from "../shared/Loader";

const ProductDetail = () => {
    const { productId } = useParams();
    const dispatch = useDispatch();
    const [product, setProduct] = useState(null);
    const [comments, setComments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        let active = true;
        setLoading(true);
        api.get(`/public/products/${productId}`)
            .then(async ({ data }) => {
                if (!active) return;
                setProduct(data);
                try {
                    const commentsResponse = await api.get(`/public/products/${productId}/comments`);
                    if (active) setComments(commentsResponse.data);
                } catch { if (active) setComments([]); }
            })
            .catch((err) => { if (active) setError(err?.response?.data?.message || "Ürün bilgileri yüklenemedi."); })
            .finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, [productId]);

    if (loading) return <div className="py-20"><Loader text="Ürün yükleniyor..." /></div>;
    if (error || !product) return <main className="mx-auto max-w-5xl px-4 py-16 text-center">
        <p className="mb-5 text-lg text-slate-700">{error || "Ürün bulunamadı."}</p>
        <Link to="/products" className="text-blue-600 hover:underline">Ürünlere dön</Link>
    </main>;

    const available = Number(product.quantity) > 0;
    const currentPrice = product.specialPrice ?? product.price;

    return <main className="mx-auto max-w-6xl px-4 py-8 sm:px-8 lg:py-14">
        <Link to="/products" className="mb-6 inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900">
            <FaArrowLeft /> Ürünlere dön
        </Link>
        <section className="grid overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:grid-cols-2">
            <div className="flex min-h-[320px] items-center justify-center bg-slate-50 p-5 sm:min-h-[520px] sm:p-10">
                <img src={productImageUrl(product.image)} alt={product.productName} className="max-h-[520px] w-full object-contain" />
            </div>
            <div className="flex flex-col p-6 sm:p-10">
                <p className="mb-3 text-sm font-medium uppercase tracking-wide text-slate-500">Ürün detayı</p>
                <h1 className="text-2xl font-bold leading-tight text-slate-900 sm:text-3xl">{product.productName}</h1>
                <div className="mt-6 flex flex-wrap items-center gap-3">
                    {product.specialPrice != null && Number(product.specialPrice) < Number(product.price) && <span className="text-lg text-slate-400 line-through">${Number(product.price).toFixed(2)}</span>}
                    <span className="text-3xl font-bold text-slate-900">${Number(currentPrice).toFixed(2)}</span>
                </div>
                <div className={`mt-5 inline-flex w-fit items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold ${available ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                    {available ? <MdDone /> : <MdClose />}
                    {available ? `Stokta (${product.quantity} adet)` : "Stokta yok"}
                </div>
                <div className="my-7 border-t border-slate-200" />
                <h2 className="mb-2 text-lg font-semibold text-slate-900">Ürün açıklaması</h2>
                <p className="whitespace-pre-line leading-7 text-slate-600">{product.description || "Bu ürün için açıklama girilmemiş."}</p>
                <button disabled={!available} onClick={() => dispatch(addToCart({ ...product, productId: product.productId ?? Number(productId) }, 1, toast))}
                    className="mt-auto flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300 md:mt-10">
                    <FaShoppingCart /> {available ? "Sepete ekle" : "Stokta yok"}
                </button>
            </div>
        </section>
        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-xl font-bold text-slate-900">Ürün yorumları <span className="text-base font-normal text-slate-500">({comments.length})</span></h2>
            {comments.length === 0 ? <p className="mt-4 text-sm text-slate-500">Bu ürün için henüz yorum yapılmamış.</p> : <div className="mt-5 divide-y divide-slate-200">
                {comments.map((comment) => <article key={comment.commentId} className="py-5 first:pt-0 last:pb-0">
                    <div className="flex flex-wrap items-center justify-between gap-2"><p className="font-semibold text-slate-800">{comment.userName}</p><time className="text-sm text-slate-500">{new Date(comment.createdAt).toLocaleDateString("tr-TR")}</time></div>
                    <p className="mt-2 whitespace-pre-line text-slate-700">{comment.commentText}</p>
                    {comment.images?.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{comment.images.map((image, index) => <img key={`${comment.commentId}-${index}`} src={productImageUrl(image)} alt="Yorum görseli" className="h-20 w-20 rounded border border-slate-200 object-cover" />)}</div>}
                </article>)}
            </div>}
        </section>
    </main>;
};

export default ProductDetail;
