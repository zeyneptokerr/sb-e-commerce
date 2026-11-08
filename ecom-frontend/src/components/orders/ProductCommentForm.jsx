import { useState } from "react";
import { toast } from "react-hot-toast";
import api from "../../api/api";

const ProductCommentForm = ({ deliveryNo, productId, onSubmitted, onCancel }) => {
    const [comment, setComment] = useState("");
    const [images, setImages] = useState([]);
    const [saving, setSaving] = useState(false);

    const submit = async (event) => {
        event.preventDefault();
        if (!comment.trim()) return toast.error("Lütfen yorumunuzu yazın.");
        const formData = new FormData();
        formData.append("comment", comment.trim());
        images.forEach((image) => formData.append("images", image));
        setSaving(true);
        try {
            await api.post(`/comments/orders/${deliveryNo}/products/${productId}`, formData);
            toast.success("Yorumunuz eklendi.");
            onSubmitted();
        } catch (error) {
            toast.error(error?.response?.data?.message || "Yorum eklenemedi.");
        } finally {
            setSaving(false);
        }
    };

    return <form onSubmit={submit} className="mt-3 w-full basis-full rounded-md border border-slate-200 bg-slate-50 p-4">
        <label className="mb-2 block text-sm font-semibold text-slate-700" htmlFor={`comment-${deliveryNo}-${productId}`}>Ürün yorumunuz</label>
        <textarea id={`comment-${deliveryNo}-${productId}`} value={comment} onChange={(event) => setComment(event.target.value)} maxLength={4000} rows={4}
            className="w-full rounded-md border border-slate-300 bg-white p-3 text-sm outline-none focus:border-orange-500" placeholder="Ürün deneyiminizi paylaşın..." />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <label className="cursor-pointer rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-100">
                Görsel ekle
                <input type="file" accept="image/*" multiple className="sr-only" onChange={(event) => setImages(Array.from(event.target.files || []))} />
            </label>
            <span className="text-xs text-slate-500">{images.length ? `${images.length} görsel seçildi` : "Birden fazla görsel seçebilirsiniz"}</span>
        </div>
        {images.length > 0 && <ul className="mt-2 space-y-1 text-xs text-slate-600">{images.map((image) => <li key={`${image.name}-${image.lastModified}`}>{image.name}</li>)}</ul>}
        <div className="mt-4 flex justify-end gap-2">
            <button type="button" onClick={onCancel} className="rounded px-4 py-2 text-sm text-slate-600 hover:bg-slate-200">Vazgeç</button>
            <button type="submit" disabled={saving} className="rounded bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-60">{saving ? "Gönderiliyor..." : "Yorumu gönder"}</button>
        </div>
    </form>;
};

export default ProductCommentForm;
