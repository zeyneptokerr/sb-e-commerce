import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { FaArrowLeft, FaShoppingCart } from "react-icons/fa";
import { MdDone, MdClose } from "react-icons/md";
import { FaChevronLeft, FaChevronRight, FaRegStar, FaStar } from "react-icons/fa";
import { useDispatch } from "react-redux";
import toast from "react-hot-toast";
import api from "../../api/api";
import { addToCart } from "../../store/actions";
import { productImageUrl } from "../../utils/productImageUrl";
import Loader from "../shared/Loader";

const HighlightedText = ({ text, query }) => {
    const value = String(text || "");
    const searchTerm = query.trim();
    if (!searchTerm) return value;

    const escapedTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const parts = value.split(new RegExp(`(${escapedTerm})`, "giu"));
    const normalizedTerm = searchTerm.toLocaleLowerCase("tr-TR");

    return parts.map((part, index) => part.toLocaleLowerCase("tr-TR") === normalizedTerm
        ? <mark key={index} className="rounded bg-amber-200 px-0.5 text-slate-900">{part}</mark>
        : part);
};

const ProductDetail = () => {
    const { productId } = useParams();
    const dispatch = useDispatch();
    const [product, setProduct] = useState(null);
    const [comments, setComments] = useState([]);
    const [commentSearch, setCommentSearch] = useState("");
    const [commentRatingFilter, setCommentRatingFilter] = useState("all");
    const [commentSort, setCommentSort] = useState("newest");
    const [activeReviewImageIndex, setActiveReviewImageIndex] = useState(null);
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

    useEffect(() => {
        if (activeReviewImageIndex === null) return undefined;
        const imageCount = comments.reduce((count, comment) => count + (comment.images?.length || 0), 0);
        if (!imageCount) return undefined;
        const handleKeyDown = (event) => {
            if (event.key === "Escape") setActiveReviewImageIndex(null);
            if (event.key === "ArrowRight") setActiveReviewImageIndex((index) => (index + 1) % imageCount);
            if (event.key === "ArrowLeft") setActiveReviewImageIndex((index) => (index - 1 + imageCount) % imageCount);
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [activeReviewImageIndex, comments]);

    if (loading) return <div className="py-20"><Loader text="Ürün yükleniyor..." /></div>;
    if (error || !product) return <main className="mx-auto max-w-5xl px-4 py-16 text-center">
        <p className="mb-5 text-lg text-slate-700">{error || "Ürün bulunamadı."}</p>
        <Link to="/products" className="text-blue-600 hover:underline">Ürünlere dön</Link>
    </main>;

    const available = Number(product.quantity) > 0;
    const currentPrice = product.specialPrice ?? product.price;
    const reviewImages = comments.flatMap((comment) => (comment.images || []).map((image) => ({
        image,
        commentId: comment.commentId,
        userName: comment.userName,
    })));
    const ratedComments = comments.filter((comment) => Number(comment.rating) > 0);
    const averageRating = ratedComments.length
        ? ratedComments.reduce((sum, comment) => sum + Number(comment.rating), 0) / ratedComments.length
        : 0;
    const visibleComments = comments
        .filter((comment) => {
            const query = commentSearch.trim().toLocaleLowerCase("tr-TR");
            const matchesSearch = !query || `${comment.userName || ""} ${comment.commentText || ""}`.toLocaleLowerCase("tr-TR").includes(query);
            const matchesRating = commentRatingFilter === "all"
                || (commentRatingFilter === "unrated" && !comment.rating)
                || Number(comment.rating) === Number(commentRatingFilter);
            return matchesSearch && matchesRating;
        })
        .sort((first, second) => {
            if (commentSort === "oldest") return new Date(first.createdAt) - new Date(second.createdAt);
            if (commentSort === "rating-high") return Number(second.rating || 0) - Number(first.rating || 0) || new Date(second.createdAt) - new Date(first.createdAt);
            if (commentSort === "rating-low") return Number(first.rating || 0) - Number(second.rating || 0) || new Date(second.createdAt) - new Date(first.createdAt);
            return new Date(second.createdAt) - new Date(first.createdAt);
        });
    const changeReviewImage = (direction) => setActiveReviewImageIndex((index) => (index + direction + reviewImages.length) % reviewImages.length);

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
            <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-xl font-bold text-slate-900">Ürün yorumları <span className="text-base font-normal text-slate-500">({comments.length})</span></h2>
                {ratedComments.length > 0 && <div className="flex items-center gap-2" aria-label={`${averageRating.toFixed(1)} üzerinden 5 yıldız`}>
                    <span className="flex text-amber-400">{[1, 2, 3, 4, 5].map((star) => averageRating >= star ? <FaStar key={star} /> : <FaRegStar key={star} />)}</span>
                    <span className="text-sm text-slate-600">{averageRating.toFixed(1)} / 5</span>
                </div>}
            </div>
            {comments.length > 0 && <div className="mt-5 grid gap-3 sm:grid-cols-[minmax(200px,1fr)_180px_220px]">
                <input type="search" value={commentSearch} onChange={(event) => setCommentSearch(event.target.value)} aria-label="Yorumlarda ara" placeholder="Yorumlarda ara..."
                    className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-orange-500" />
                <select value={commentRatingFilter} onChange={(event) => setCommentRatingFilter(event.target.value)} aria-label="Puana göre filtrele"
                    className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-orange-500">
                    <option value="all">Tüm puanlar</option>
                    {[5, 4, 3, 2, 1].map((rating) => <option key={rating} value={rating}>{rating} yıldız</option>)}
                    <option value="unrated">Puan verilmemiş</option>
                </select>
                <select value={commentSort} onChange={(event) => setCommentSort(event.target.value)} aria-label="Yorumları sırala"
                    className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-orange-500">
                    <option value="newest">Tarihe göre: yeni → eski</option>
                    <option value="oldest">Tarihe göre: eski → yeni</option>
                    <option value="rating-high">Puana göre: yüksek → düşük</option>
                    <option value="rating-low">Puana göre: düşük → yüksek</option>
                </select>
            </div>}
            {comments.length === 0 ? <p className="mt-4 text-sm text-slate-500">Bu ürün için henüz yorum yapılmamış.</p> : visibleComments.length === 0 ? <p className="mt-5 rounded-md bg-slate-50 p-4 text-sm text-slate-500">Arama ve filtrelerle eşleşen yorum yok.</p> : <div className="mt-5 divide-y divide-slate-200">
                {visibleComments.map((comment) => <article key={comment.commentId} className="py-5 first:pt-0 last:pb-0">
                    <div className="flex flex-wrap items-center justify-between gap-2"><p className="font-semibold text-slate-800">{comment.userName}</p><time className="text-sm text-slate-500">{new Date(comment.createdAt).toLocaleDateString("tr-TR")}</time></div>
                    {comment.rating && <div className="mt-1 flex items-center gap-2" aria-label={`${comment.rating} yıldız`}><span className="flex text-amber-400">{[1, 2, 3, 4, 5].map((star) => star <= Number(comment.rating) ? <FaStar key={star} /> : <FaRegStar key={star} />)}</span><span className="text-xs text-slate-500">{comment.rating}/5</span></div>}
                    <p className="mt-2 whitespace-pre-line text-slate-700"><HighlightedText text={comment.commentText} query={commentSearch} /></p>
                    {comment.images?.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{comment.images.map((image, index) => {
                        const imageIndex = reviewImages.findIndex((entry) => entry.commentId === comment.commentId && entry.image === image);
                        return <button key={`${comment.commentId}-${index}`} type="button" onClick={() => setActiveReviewImageIndex(imageIndex)} aria-label={`Yorum görselini büyüt, ${imageIndex + 1}. görsel`}
                            className="h-20 w-20 overflow-hidden rounded border border-slate-200 focus:outline-2 focus:outline-orange-500">
                            <img src={productImageUrl(image)} alt="Yorum görseli" className="h-full w-full object-cover transition-transform hover:scale-110" />
                        </button>;
                    })}</div>}
                </article>)}
            </div>}
        </section>
        {activeReviewImageIndex !== null && reviewImages[activeReviewImageIndex] && <div role="dialog" aria-modal="true" aria-label="Yorum görsel galerisi"
            onClick={() => setActiveReviewImageIndex(null)} className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 sm:p-8">
            <button type="button" aria-label="Galeriyi kapat" onClick={() => setActiveReviewImageIndex(null)} className="absolute right-4 top-4 rounded-full bg-white/15 p-3 text-white hover:bg-white/25"><MdClose size={26} /></button>
            {reviewImages.length > 1 && <button type="button" aria-label="Önceki görsel" onClick={(event) => { event.stopPropagation(); changeReviewImage(-1); }} className="absolute left-3 rounded-full bg-white/15 p-3 text-white hover:bg-white/25 sm:left-8"><FaChevronLeft size={24} /></button>}
            <figure onClick={(event) => event.stopPropagation()} className="flex max-h-full max-w-full flex-col items-center gap-3">
                <img src={productImageUrl(reviewImages[activeReviewImageIndex].image)} alt={`${reviewImages[activeReviewImageIndex].userName} kullanıcısının ürün yorumu görseli`}
                    className="max-h-[78vh] max-w-[82vw] rounded object-contain" />
                <figcaption className="text-sm text-white/80">{reviewImages[activeReviewImageIndex].userName} · {activeReviewImageIndex + 1} / {reviewImages.length}</figcaption>
            </figure>
            {reviewImages.length > 1 && <button type="button" aria-label="Sonraki görsel" onClick={(event) => { event.stopPropagation(); changeReviewImage(1); }} className="absolute right-3 rounded-full bg-white/15 p-3 text-white hover:bg-white/25 sm:right-8"><FaChevronRight size={24} /></button>}
        </div>}
    </main>;
};

export default ProductDetail;
