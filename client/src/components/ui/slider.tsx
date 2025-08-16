import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"

import { cn } from "@/lib/utils"

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn(
      "relative flex w-full touch-none select-none items-center",
      // Mobile responsive padding and sizing
      "px-2 sm:px-3 md:px-4",
      // Touch-friendly on mobile
      "min-h-[44px] sm:min-h-[48px]",
      className
    )}
    {...props}
  >
    <SliderPrimitive.Track className={cn(
      "relative w-full grow overflow-hidden rounded-full bg-secondary",
      // Responsive track height
      "h-1.5 sm:h-2 md:h-2.5 lg:h-3",
      // Better visibility on mobile
      "shadow-sm"
    )}>
      <SliderPrimitive.Range className="absolute h-full bg-primary transition-all duration-200" />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb className={cn(
      "block rounded-full border-2 border-primary bg-background ring-offset-background transition-all duration-200",
      // Responsive thumb sizing
      "h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6",
      // Touch-friendly on mobile devices
      "touch-manipulation",
      // Enhanced focus states
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      // Hover effects (only on devices that support hover)
      "hover:scale-110 hover:border-primary/80",
      // Active state for better feedback
      "active:scale-95 active:ring-2 active:ring-primary/50",
      // Disabled state
      "disabled:pointer-events-none disabled:opacity-50",
      // Better shadow for depth
      "shadow-md hover:shadow-lg"
    )} />
  </SliderPrimitive.Root>
))
Slider.displayName = SliderPrimitive.Root.displayName

export { Slider }