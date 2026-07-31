import { useEffect } from 'react'

export const APP_NAME = 'Sentinel'

/**
 * Sets the browser tab title. The tab is visible whenever the product is screen-shared,
 * so every route states what it is rather than inheriting a generic app name.
 */
export function useDocumentTitle(title: string) {
  useEffect(() => {
    document.title = `${title} · ${APP_NAME}`
  }, [title])
}
