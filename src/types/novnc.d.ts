declare module '@novnc/novnc' {
  export default class RFB extends EventTarget {
    constructor(target: HTMLElement, url: string, options?: Record<string, unknown>)

    background: string
    clipViewport: boolean
    dragViewport: boolean
    focusOnClick: boolean
    resizeSession: boolean
    scaleViewport: boolean

    disconnect(): void
  }
}
