import { useRouter } from 'vue-router'
import type { Router, RouteComponent, RouteLocationRaw } from 'vue-router'
import prefetch from './prefetch'

export function usePrefetch() {
  const router = useRouter()
  function perfetchRoute(link: RouteLocationRaw) {
    const route = router.resolve(link)

    if (route.meta.__prefetched) return

    route.meta.__prefetched = true

    if (route.meta.prefetch !== false) {
      // Prefetch route component
      const components = getRouteComponents(route)
      for (const Component of components) {
        try {
          Component()
        } catch (e) {
          console.error(e)
        }
      }
    }

    if (typeof route.meta.prefetch === 'function') {
      route.meta.prefetch(route)
    }

    // Prefetch addtional files
    prefetchFiles((route.meta.prefetchFiles as string[]) || [])
  }

  function prefetchFiles(files: string[]) {
    for (const file of files) {
      prefetch(file)
    }
  }

  return { perfetchRoute, prefetchFiles }
}

function getRouteComponents(route: ReturnType<Router['resolve']>) {
  return route.matched
    .map((record) => {
      if (record.components) {
        return Object.values(record.components)
      }
    })
    .flat()
    .filter((Component) => {
      return typeof Component === 'function' && !('cid' in Component)
    }) as (() => Promise<RouteComponent>)[]
}
