const initialState = {
    cart: [],
    totalPrice: 0,
    cartId: null,
}

export const cartReducer = (state = initialState, action) => {
    switch (action.type) {
        case "ADD_CART":
            const productToAdd = action.payload;
            const existingProduct = state.cart.find(
                (item) => item.productId === productToAdd.productId
            );

            if(existingProduct) {
                const updatedCart = state.cart.map((item) => {
                    if (item.productId === productToAdd.productId) {
                        return {
                            ...productToAdd,
                            selected: productToAdd.selected ?? item.selected ?? true,
                        };
                    } else {
                        return item;
                    }
                });

                return {
                    ...state,
                    cart: updatedCart,
                };
            } else {
                const newCart = [...state.cart, { ...productToAdd, selected: productToAdd.selected ?? true }];
                return {
                    ...state,
                    cart: newCart,
                };
            }
        case "REMOVE_CART":
            return {
                ...state,
                cart: state.cart.filter(
                    (item) => item.productId !== action.payload.productId
                ),
            };
        case "TOGGLE_CART_ITEM_SELECTED":
            return {
                ...state,
                cart: state.cart.map((item) => item.productId === action.payload.productId
                    ? { ...item, selected: !(item.selected ?? true) }
                    : item),
            };
        case "SET_CART_ITEM_SELECTION":
            return {
                ...state,
                cart: state.cart.map((item) => action.payload.productIds.includes(item.productId)
                    ? { ...item, selected: action.payload.selected }
                    : item),
            };
        case "SET_CART_ITEMS":
            return {
                ...state,
                cart: action.payload,
                totalPrice: action.payload.reduce((sum, item) => sum + Number(item.specialPrice) * Number(item.quantity), 0),
                cartId: null,
            };
        case "GET_USER_CART_PRODUCTS":
            return {
                ...state,
                cart: action.payload.map((item) => ({ ...item, selected: item.selected ?? true })),
                totalPrice: action.totalPrice,
                cartId: action.cartId,
            };
        case "CLEAR_CART":
            return { cart:[], totalPrice: 0, cartId: null};
        default:
            return state;
    }
    return state;
}