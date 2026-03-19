/** Dispatch a toast notification from any client component. */
export function toast(message: string, type: 'success' | 'error' = 'success') {
  if (typeof window === 'undefined') return
  window.dispatchEvent(
    new CustomEvent('bondtrack:toast', { detail: { message, type } })
  )
}
