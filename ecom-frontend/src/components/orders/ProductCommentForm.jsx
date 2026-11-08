import { useEffect, useState } from "react";
import { FaRegStar, FaStar } from "react-icons/fa";
import { MdClose } from "react-icons/md";
import { toast } from "react-hot-toast";
import api from "../../api/api";
import { productImageUrl } from "../../utils/productImageUrl";

const PendingImagePreview = ({ image, onRemove, onPreview }) => {
    const [previewUrl, setPreviewUrl] = useState("");

    useEffect(() => {
        const url = URL.createObjectURL(image);
        setPreviewUrl(url);
        return () => URL.revokeObjectURL(url);
    }, [image]);

    return <div className="relative h-20 w-20 overflow-hidden rounded border border-slate-200 bg-white">
        {previewUrl && <button type="button" onClick={() => onPreview(previewUrl)} aria-label={`${image.name} görselini büyüt`} className="h-full w-full cursor-zoom-in">
            <img src={previewUrl} alt={`${image.name} önizlemesi`} className="h-full w-full object-cover" />
        </button>}
        <button type="button" onClick={onRemove} aria-label={`${image.name} görselini eklemekten vazgeç`}
            className="absolute right-1 top-1 rounded-full bg-black/75 p-1 text-white hover:bg-red-600">
            <MdClose size={16} />
        </button>
        <span className="absolute inset-x-0 bottom-0 truncate bg-black/60 px-1 py-0.5 text-[10px] text-white">{image.name}</span>
    </div>;
};

const ProductCommentForm = ({ deliveryNo, productId, existingComment, onSubmitted, onDeleted, onCancel }) => {
    const [comment, setComment] = useState(existingComment?.commentText || "");
    const [images, setImages] = useState([]);
    const [rating, setRating] = useState(existingComment?.rating || 0);
    const [usernameVisible, setUsernameVisible] = useState(existingComment?.usernameVisible || false);
    const [removeImageIds, setRemoveImageIds] = useState([]);
    const [hoverRating, setHoverRating] = useState(0);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [previewImageUrl, setPreviewImageUrl] = useState(null);

    useEffect(() => {
        setComment(existingComment?.commentText || "");
        setRating(existingComment?.rating || 0);
        setUsernameVisible(existingComment?.usernameVisible || false);
        setRemoveImageIds([]);
    }, [existingComment]);

    useEffect(() => {
        if (!previewImageUrl) return undefined;
        const closeOnEscape = (event) => event.key === "Escape" && setPreviewImageUrl(null);
        window.addEventListener("keydown", closeOnEscape);
        return () => window.removeEventListener("keydown", closeOnEscape);
    }, [previewImageUrl]);

    const submit = async (event) => {
        event.preventDefault();
        if (!comment.trim()) return toast.error("Lütfen yorumunuzu yazın.");
        const formData = new FormData();
        formData.append("comment", comment.trim());
        if (rating) formData.append("rating", String(rating));
        formData.append("usernameVisible", String(usernameVisible));
        images.forEach((image) => formData.append("images", image));
        removeImageIds.forEach((imageId) => formData.append("removeImageIds", String(imageId)));
        setSaving(true);
        try {
            const response = existingComment
                ? await api.put(`/comments/${existingComment.commentId}`, formData)
                : await api.post(`/comments/orders/${deliveryNo}/products/${productId}`, formData);
            toast.success(existingComment ? "Yorumunuz güncellendi." : "Yorumunuz eklendi.");
            onSubmitted(response.data);
        } catch (error) {
            toast.error(error?.response?.data?.message || (existingComment ? "Yorum güncellenemedi." : "Yorum eklenemedi."));
        } finally {
            setSaving(false);
        }
    };

    const deleteReview = async () => {
        if (!existingComment || !window.confirm("Yorumunuzu ve eklediğiniz görselleri silmek istiyor musunuz?")) return;
        setDeleting(true);
        try {
            await api.delete(`/comments/${existingComment.commentId}`);
            toast.success("Yorumunuz silindi.");
            onDeleted();
        } catch (error) {
            toast.error(error?.response?.data?.message || "Yorum silinemedi.");
        } finally {
            setDeleting(false);
        }
    };

    const existingImages = existingComment?.imageDetails || (existingComment?.images || []).map((imageUrl) => ({ imageUrl, imageId: null }));
    const remainingExistingImages = existingImages.filter((image) => !image.imageId || !removeImageIds.includes(image.imageId));
    const availableImageSlots = Math.max(0, 5 - remainingExistingImages.length);
    const selectImages = (event) => {
        const selectedImages = Array.from(event.target.files || []);
        const slotsForSelection = Math.max(0, availableImageSlots - images.length);
        if (selectedImages.length > slotsForSelection) {
            toast.error(`Yorumda toplam en fazla 5 görsel olabilir. ${slotsForSelection} görsel daha seçebilirsiniz.`);
        }
        setImages((current) => [...current, ...selectedImages.slice(0, slotsForSelection)]);
        event.target.value = "";
    };

    return <form onSubmit={submit} className="mt-3 w-full basis-full rounded-md border border-slate-200 bg-slate-50 p-4">
        <label className="mb-2 block text-sm font-semibold text-slate-700" htmlFor={`comment-${deliveryNo}-${productId}`}>Ürün yorumunuz</label>
        <textarea id={`comment-${deliveryNo}-${productId}`} value={comment} onChange={(event) => setComment(event.target.value)} maxLength={4000} rows={4}
            className="w-full rounded-md border border-slate-300 bg-white p-3 text-sm outline-none focus:border-orange-500" placeholder="Ürün deneyiminizi paylaşın..." />
        <fieldset className="mt-4">
            <legend className="mb-2 text-sm font-semibold text-slate-700">Ürüne puan verin <span className="font-normal text-slate-500">(isteğe bağlı)</span></legend>
            <div className="flex items-center gap-1" onMouseLeave={() => setHoverRating(0)}>
                {[1, 2, 3, 4, 5].map((value) => <button key={value} type="button" aria-label={`${value} yıldız`} aria-pressed={rating === value}
                    onMouseEnter={() => setHoverRating(value)} onFocus={() => setHoverRating(value)} onBlur={() => setHoverRating(0)} onClick={() => setRating(value)}
                    className="rounded p-1 text-2xl text-amber-400 focus:outline-2 focus:outline-orange-500">
                    {(hoverRating || rating) >= value ? <FaStar /> : <FaRegStar />}
                </button>)}
                <span className="ml-2 text-sm text-slate-600">{rating ? `${rating}/5` : "Puan seçin"}</span>
                {rating > 0 && <button type="button" onClick={() => setRating(0)} className="ml-2 text-xs text-slate-500 underline">Puanı kaldır</button>}
            </div>
        </fieldset>
        <label className="mt-4 flex w-fit cursor-pointer items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={usernameVisible} onChange={(event) => setUsernameVisible(event.target.checked)} className="h-4 w-4 accent-orange-500" />
            Kullanıcı adım görünebilir
        </label>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <label aria-disabled={!availableImageSlots} className={`rounded border px-3 py-2 text-sm ${availableImageSlots ? "cursor-pointer border-slate-300 bg-white text-slate-700 hover:bg-slate-100" : "pointer-events-none cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400 opacity-60"}`}>
                {existingComment ? "Yeni görsel ekle" : "Görsel ekle"}
                <input type="file" accept="image/*" multiple disabled={!availableImageSlots} className="sr-only" onChange={selectImages} />
            </label>
            <span className="text-xs text-slate-500">{images.length ? `${images.length} yeni görsel seçildi` : `${availableImageSlots} görsel ekleyebilirsiniz (en fazla 5)`}</span>
        </div>
        {existingImages.length > 0 && <div className="mt-3">
            <p className="mb-2 text-xs font-medium text-slate-600">Mevcut görseller (kaldırmak için × düğmesine basın)</p>
            <div className="flex flex-wrap gap-2">{existingImages.map((image, index) => {
                const markedForRemoval = image.imageId && removeImageIds.includes(image.imageId);
                return <div key={`${existingComment.commentId}-${image.imageId || index}`} className={`relative h-16 w-16 overflow-hidden rounded border ${markedForRemoval ? "border-red-400 opacity-40" : "border-slate-200"}`}>
                    <button type="button" onClick={() => setPreviewImageUrl(productImageUrl(image.imageUrl))} aria-label="Önceki yorum görselini büyüt" className="h-full w-full cursor-zoom-in">
                        <img src={productImageUrl(image.imageUrl)} alt="Yoruma eklenmiş görsel" className="h-full w-full object-cover" />
                    </button>
                    {image.imageId && <button type="button" aria-label={markedForRemoval ? "Görseli koru" : "Görseli kaldır"} onClick={() => setRemoveImageIds((current) => markedForRemoval ? current.filter((id) => id !== image.imageId) : [...current, image.imageId])}
                        className={`absolute right-0 top-0 rounded-bl px-1 text-white ${markedForRemoval ? "bg-slate-600" : "bg-red-600"}`}><MdClose /></button>}
                    {markedForRemoval && <span className="absolute inset-x-0 bottom-0 bg-red-600/90 text-center text-[9px] text-white">Kaldırılacak</span>}
                </div>;
            })}</div>
        </div>}
        {images.length > 0 && <div className="mt-3 flex flex-wrap gap-2" aria-label="Eklenecek görsellerin önizlemesi">
            {images.map((image, index) => <PendingImagePreview key={`${image.name}-${image.lastModified}-${index}`} image={image} onPreview={setPreviewImageUrl} onRemove={() => setImages((current) => current.filter((_, imageIndex) => imageIndex !== index))} />)}
        </div>}
        <div className="mt-4 flex justify-end gap-2">
            {existingComment && <button type="button" onClick={deleteReview} disabled={saving || deleting} className="mr-auto rounded border border-red-300 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60">{deleting ? "Siliniyor..." : "Yorumu sil"}</button>}
            <button type="button" onClick={onCancel} className="rounded px-4 py-2 text-sm text-slate-600 hover:bg-slate-200">Vazgeç</button>
            <button type="submit" disabled={saving || deleting} className="rounded bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-60">{saving ? "Kaydediliyor..." : existingComment ? "Yorumu güncelle" : "Yorumu gönder"}</button>
        </div>
        {previewImageUrl && <div role="dialog" aria-modal="true" aria-label="Görsel önizlemesi" onClick={() => setPreviewImageUrl(null)} className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4 sm:p-8">
            <button type="button" aria-label="Görseli kapat" onClick={() => setPreviewImageUrl(null)} className="absolute right-4 top-4 rounded-full bg-white/15 p-3 text-white hover:bg-white/25"><MdClose size={26} /></button>
            <img src={previewImageUrl} alt="Büyütülmüş yorum görseli" onClick={(event) => event.stopPropagation()} className="max-h-[85vh] max-w-[90vw] rounded object-contain" />
        </div>}
    </form>;
};

export default ProductCommentForm;
