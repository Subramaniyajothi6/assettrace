"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: (
          <CircleCheckIcon className="size-4" />
        ),
        info: (
          <InfoIcon className="size-4" />
        ),
        warning: (
          <TriangleAlertIcon className="size-4" />
        ),
        error: (
          <OctagonXIcon className="size-4" />
        ),
        loading: (
          <Loader2Icon className="size-4 animate-spin" />
        ),
      }}
      // Dark "hero" card from the skin (inverts in dark mode); details in globals.css (.at-toast).
      style={
        {
          "--normal-bg": "var(--at-hd)",
          "--normal-text": "var(--at-hd-ink)",
          "--normal-border": "transparent",
          "--border-radius": "var(--at-r2)",
          "--width": "380px",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "at-toast",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
