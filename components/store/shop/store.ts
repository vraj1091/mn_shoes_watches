"use client";

import { useSyncExternalStore } from "react";
import { getCart, getWishlist, toggleWishlist } from "@/lib/actions/shop";
import type { CartView } from "@/lib/cart/cart";

/*
 * Bag and wishlist state shared by the header, the bag drawer, the buy box and every product card.
 * Small module-level stores read through useSyncExternalStore: the server renders the bag count
 * from the cookie; after that every change comes back from a server action.
 */

type CartState = { cart: CartView | null; drawerOpen: boolean; notice: string | null };
let cartState: CartState = { cart: null, drawerOpen: false, notice: null };
const cartListeners = new Set<() => void>();
const SERVER_CART: CartState = { cart: null, drawerOpen: false, notice: null };

export const cartStore = {
  get: () => cartState,
  subscribe(listener: () => void) {
    cartListeners.add(listener);
    return () => cartListeners.delete(listener);
  },
  set(patch: Partial<CartState>) {
    cartState = { ...cartState, ...patch };
    cartListeners.forEach((listener) => listener());
  },
  async refresh() {
    cartStore.set({ cart: await getCart() });
  },
  open(notice: string | null = null) {
    cartStore.set({ drawerOpen: true, notice });
    if (!cartState.cart) void cartStore.refresh();
  },
};

export const useCartState = () => useSyncExternalStore(cartStore.subscribe, cartStore.get, () => SERVER_CART);

// ─── Wishlist ───────────────────────────────────────────────────────────────

let wishlist: { ids: Set<string>; loaded: boolean } = { ids: new Set(), loaded: false };
const wishlistListeners = new Set<() => void>();
let loading: Promise<void> | null = null;
const SERVER_WISHLIST = { ids: new Set<string>(), loaded: false };

function setWishlist(ids: string[]) {
  wishlist = { ids: new Set(ids), loaded: true };
  wishlistListeners.forEach((listener) => listener());
}

export const wishlistStore = {
  get: () => wishlist,
  subscribe(listener: () => void) {
    wishlistListeners.add(listener);
    // Loaded once per page view, the first time any heart is on screen.
    if (!wishlist.loaded && !loading) loading = getWishlist().then(setWishlist, () => setWishlist([]));
    return () => wishlistListeners.delete(listener);
  },
  async toggle(productId: string) {
    const optimistic = new Set(wishlist.ids);
    if (optimistic.has(productId)) optimistic.delete(productId);
    else optimistic.add(productId);
    setWishlist([...optimistic]);
    try {
      setWishlist((await toggleWishlist(productId)).ids);
    } catch {
      loading = null;
      setWishlist([...wishlist.ids].filter((id) => id !== productId));
    }
  },
};

export const useWishlist = () => useSyncExternalStore(wishlistStore.subscribe, wishlistStore.get, () => SERVER_WISHLIST);
