import {configureStore} from '@reduxjs/toolkit';
import { productReducer } from './ProductReducer';
import { errorReducer } from './errorReducer';
import { cartReducer } from './cartReducer';

const cartItems = localStorage.getItem('cartItems') 
    ? JSON.parse(localStorage.getItem('cartItems')) 
    : [];

export const store = configureStore({
    reducer: {
        products: productReducer,
        error: errorReducer,
        carts: cartReducer,
    },
    preloadedState: {},
});

export default store;