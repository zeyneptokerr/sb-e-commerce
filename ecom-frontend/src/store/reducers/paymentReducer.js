const initialState = {
    payload: null,
};

export const paymentReducer = (state = initialState, action) => {
    switch (action.type) {
        case "ADD_PAYMENT":
            return {
                ...state,
                payload: action.payload,
            };
        default:
            return state;
    }
};