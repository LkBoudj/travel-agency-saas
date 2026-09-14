import type { HTMLAttributes, ReactNode } from "react"

type BidiTextProps = HTMLAttributes<HTMLElement> & {
  children: ReactNode
}

/**
 * Bidi isolation for user-generated named content rendered inside a UI with
 * a fixed direction (e.g. an English trip name inside the Arabic dashboard).
 * `dir="auto"` lets the isolated text keep its own reading order, so logical
 * runs like "Tadrart Desert Circuit" never inherit broken RTL wrapping.
 */
export function BidiText({ children, ...props }: BidiTextProps) {
  return (
    <bdi dir="auto" {...props}>
      {children}
    </bdi>
  )
}