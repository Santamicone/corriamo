/**
 * Link e identificativi degli store. Unico punto di verità: la pagina /app,
 * il Smart App Banner (layout.tsx) e i CTA nel sito leggono da qui.
 *
 * Il QR in `public/app-store/qr-app-store.svg` punta a APP_STORE_URL:
 * se questo URL cambia, va rigenerato.
 */
export const APP_STORE_ID = '6837730922'
export const APP_STORE_URL = `https://apps.apple.com/it/app/id${APP_STORE_ID}`

/** Google Play non è ancora disponibile: quando lo sarà, valorizzare l'URL. */
export const PLAY_STORE_URL: string | null = null
