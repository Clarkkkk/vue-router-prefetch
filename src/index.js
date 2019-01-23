import prefetch from './prefetch'
import { inBrowser } from './utils'

const supported = inBrowser && window.IntersectionObserver

export { prefetch }

export default (Vue, { componentName = 'RouterLink' } = {}) => {
  const observer =
    supported &&
    new window.IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target._linkPrefetch()
        }
      })
    })

  const RouterLink = Vue.component('RouterLink')

  if (process.env.NODE_ENV === 'development' && !RouterLink) {
    console.error(
      `[vue-router-prefetch] You need to call Vue.use(VueRouter) before this plugin!`
    )
  }

  const Link = {
    name: componentName,
    extends: RouterLink,
    props: {
      prefetch: {
        type: Boolean,
        default: true
      },
      prefetchFiles: {
        type: Array
      }
    },
    mounted() {
      const conn = navigator.connection
      const canPrefetch =
        !conn ||
        ((conn.effectiveType || '').indexOf('2g') === -1 && !conn.saveData)
      if (this.prefetch && observer && canPrefetch) {
        setTimeout(() => {
          this.observe()
        }, 1000)
      }
    },
    beforeDestory() {
      this.unobserve()
    },
    methods: {
      observe() {
        observer.observe(this.$el)
        this.$el._linkPrefetch = this.linkPrefetch
        this._linkObserved = true
      },
      unobserve() {
        if (this._linkObserved) {
          observer.unobserve(this.$el)
        }
      },
      getComponents() {
        return this.$router.getMatchedComponents(this.to).filter(Component => {
          return typeof Component === 'function' && !Component._prefetched
        })
      },
      linkPrefetch() {
        // Prefetch route component
        const components = this.getComponents()
        for (const Component of components) {
          this.$emit('prefetch', this.to)
          Component() // eslint-disable-line new-cap
          Component._prefetched = true
        }

        // Prefetch addtional files
        if (this.prefetchFiles) {
          for (const file of this.prefetchFiles) {
            prefetch(file)
          }
        }

        this.unobserve()
      }
    }
  }

  Vue.component(Link.name, Link)
}
