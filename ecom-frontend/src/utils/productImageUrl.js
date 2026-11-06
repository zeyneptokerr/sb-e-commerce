export const productImageUrl = (image) => {
    if (!image) return "";
    const backendUrl = (import.meta.env.VITE_BACK_END_URL || "").replace(/\/$/, "");
    if (/^https?:\/\//i.test(image)) {
        const parsedImageUrl = new URL(image);
        if (["localhost", "127.0.0.1"].includes(parsedImageUrl.hostname)) {
            return `${backendUrl}${parsedImageUrl.pathname}${parsedImageUrl.search}`;
        }
        return image;
    }

    if (image.startsWith("/images/")) return `${backendUrl}${image}`;

    const imagePath = image.replace(/^\/+/, "");
    return `${backendUrl}/images/${imagePath}`;
};
