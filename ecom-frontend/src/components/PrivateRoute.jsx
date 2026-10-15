import React from 'react'
import { useSelector } from 'react-redux'
import { Navigate, Outlet, useLocation } from 'react-router-dom';

const PrivateRoute = ({ publicPage = false, adminOnly = false }) => {
    const { user } = useSelector((state) => state.auth);
    const isAdmin = user && user?.roles?.includes("ROLE_ADMIN");
    const isSeller = user && user?.roles.includes("ROLE_SELLER");
    const location = useLocation();
    if (publicPage) {
        return user ? <Navigate to="/" /> : <Outlet />
    }

    if (!user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (adminOnly) {
        if (isAdmin) {
            return <Outlet />;
        }

        if (isSeller) {
            const sellerAllowedPaths = ["/admin/orders", "/admin/products"];
            const sellerAllowed = sellerAllowedPaths.some(path =>
                location.pathname.startsWith(path)
            );

            if (sellerAllowed) {
                return <Outlet />;
            }
        }

        return <Navigate to="/" replace />;
    }

    return <Outlet />;
}

export default PrivateRoute;