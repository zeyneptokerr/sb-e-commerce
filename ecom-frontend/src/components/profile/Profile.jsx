import { useEffect, useState } from "react";
import { FaRegUserCircle } from "react-icons/fa";
import { useSelector } from "react-redux";
import api from "../../api/api";

const Profile = () => {
    const cachedUser = useSelector((state) => state.auth.user);
    const [profile, setProfile] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        let isMounted = true;

        const loadProfile = async () => {
            try {
                const { data } = await api.get("/auth/user");
                if (isMounted) setProfile(data);
            } catch (requestError) {
                if (isMounted) {
                    setProfile(cachedUser);
                    setError(requestError?.response?.data?.message || "Profil bilgileri yüklenemedi.");
                }
            } finally {
                if (isMounted) setIsLoading(false);
            }
        };

        loadProfile();
        return () => {
            isMounted = false;
        };
    }, [cachedUser]);

    const roles = profile?.roles || [];

    return (
        <main className="mx-auto min-h-[calc(100vh-70px)] max-w-4xl px-4 py-10 sm:px-8">
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-slate-800">My Profile</h1>
                <p className="mt-2 text-slate-500">Hesap bilgilerinizi görüntüleyin.</p>
            </header>

            {isLoading ? (
                <p className="py-12 text-center text-slate-500">Profil yükleniyor...</p>
            ) : (
                <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                    <div className="flex items-center gap-4 bg-custom-blue px-6 py-7 text-white">
                        <FaRegUserCircle className="text-5xl" />
                        <div>
                            <h2 className="text-2xl font-semibold">{profile?.username || "Kullanıcı"}</h2>
                            <p className="mt-1 text-sm text-white/80">Hesap profiliniz</p>
                        </div>
                    </div>

                    <div className="grid gap-5 p-6 sm:grid-cols-2">
                        <div className="rounded-md bg-slate-50 p-4">
                            <p className="text-sm text-slate-500">Kullanıcı adı</p>
                            <p className="mt-1 font-semibold text-slate-800">{profile?.username || "—"}</p>
                        </div>
                        <div className="rounded-md bg-slate-50 p-4">
                            <p className="text-sm text-slate-500">E-posta</p>
                            <p className="mt-1 break-all font-semibold text-slate-800">{profile?.email || "—"}</p>
                        </div>
                        <div className="rounded-md bg-slate-50 p-4">
                            <p className="text-sm text-slate-500">Hesap numarası</p>
                            <p className="mt-1 font-semibold text-slate-800">{profile?.id ?? "—"}</p>
                        </div>
                        <div className="rounded-md bg-slate-50 p-4">
                            <p className="text-sm text-slate-500">Hesap türü</p>
                            <div className="mt-2 flex flex-wrap gap-2">
                                {roles.length > 0 ? roles.map((role) => (
                                    <span key={role} className="rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-800">
                                        {role.replace("ROLE_", "").toLowerCase()}
                                    </span>
                                )) : <span className="font-semibold text-slate-800">—</span>}
                            </div>
                        </div>
                    </div>
                    {error && <p className="px-6 pb-5 text-sm text-amber-700">{error} Önbellekteki bilgiler gösteriliyor.</p>}
                </section>
            )}
        </main>
    );
};

export default Profile;
