
import * as React from "react"

const MOBILE_BREAKPOINT = 768
const SMALL_MOBILE_BREAKPOINT = 480
const TABLET_BREAKPOINT = 1024

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    mql.addEventListener("change", onChange)
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return !!isMobile
}

export function useIsSmallMobile() {
  const [isSmallMobile, setIsSmallMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${SMALL_MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsSmallMobile(window.innerWidth < SMALL_MOBILE_BREAKPOINT)
    }
    mql.addEventListener("change", onChange)
    setIsSmallMobile(window.innerWidth < SMALL_MOBILE_BREAKPOINT)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return !!isSmallMobile
}

export function useIsTablet() {
  const [isTablet, setIsTablet] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(min-width: ${MOBILE_BREAKPOINT}px) and (max-width: ${TABLET_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsTablet(window.innerWidth >= MOBILE_BREAKPOINT && window.innerWidth < TABLET_BREAKPOINT)
    }
    mql.addEventListener("change", onChange)
    setIsTablet(window.innerWidth >= MOBILE_BREAKPOINT && window.innerWidth < TABLET_BREAKPOINT)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return !!isTablet
}

export function useScreenSize() {
  const [screenSize, setScreenSize] = React.useState<'mobile' | 'smallMobile' | 'tablet' | 'desktop'>('desktop')

  React.useEffect(() => {
    const updateScreenSize = () => {
      const width = window.innerWidth
      if (width < SMALL_MOBILE_BREAKPOINT) {
        setScreenSize('smallMobile')
      } else if (width < MOBILE_BREAKPOINT) {
        setScreenSize('mobile')
      } else if (width < TABLET_BREAKPOINT) {
        setScreenSize('tablet')
      } else {
        setScreenSize('desktop')
      }
    }

    const mql = window.matchMedia('(max-width: 1024px)')
    mql.addEventListener('change', updateScreenSize)
    updateScreenSize()
    
    return () => mql.removeEventListener('change', updateScreenSize)
  }, [])

  return screenSize
}

export function useDeviceType() {
  const [deviceType, setDeviceType] = React.useState<'android' | 'ios' | 'desktop' | 'unknown'>('unknown')

  React.useEffect(() => {
    const userAgent = navigator.userAgent.toLowerCase()
    
    if (/android/.test(userAgent)) {
      setDeviceType('android')
    } else if (/iphone|ipad|ipod/.test(userAgent)) {
      setDeviceType('ios')
    } else if (window.innerWidth >= TABLET_BREAKPOINT) {
      setDeviceType('desktop')
    } else {
      setDeviceType('unknown')
    }
  }, [])

  return deviceType
}

export function useAndroidVersion() {
  const [androidVersion, setAndroidVersion] = React.useState<number | null>(null)

  React.useEffect(() => {
    const userAgent = navigator.userAgent
    const match = userAgent.match(/Android (\d+(?:\.\d+)?)/)
    
    if (match) {
      setAndroidVersion(parseFloat(match[1]))
    }
  }, [])

  return androidVersion
}

export function useIOSVersion() {
  const [iosVersion, setIOSVersion] = React.useState<number | null>(null)

  React.useEffect(() => {
    const userAgent = navigator.userAgent
    const match = userAgent.match(/OS (\d+)_(\d+)_?(\d+)?/)
    
    if (match) {
      const major = parseInt(match[1], 10)
      const minor = parseInt(match[2], 10)
      setIOSVersion(parseFloat(`${major}.${minor}`))
    }
  }, [])

  return iosVersion
}

export function useDeviceOrientation() {
  const [orientation, setOrientation] = React.useState<'portrait' | 'landscape'>('portrait')

  React.useEffect(() => {
    const updateOrientation = () => {
      setOrientation(window.innerHeight > window.innerWidth ? 'portrait' : 'landscape')
    }

    const mql = window.matchMedia('(orientation: landscape)')
    mql.addEventListener('change', updateOrientation)
    updateOrientation()
    
    return () => mql.removeEventListener('change', updateOrientation)
  }, [])

  return orientation
}

export function useViewportHeight() {
  const [vh, setVh] = React.useState(window.innerHeight)

  React.useEffect(() => {
    const updateVh = () => {
      setVh(window.innerHeight)
      // Set CSS custom property for viewport height
      document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`)
    }

    window.addEventListener('resize', updateVh)
    window.addEventListener('orientationchange', updateVh)
    updateVh()

    return () => {
      window.removeEventListener('resize', updateVh)
      window.removeEventListener('orientationchange', updateVh)
    }
  }, [])

  return vh
}
