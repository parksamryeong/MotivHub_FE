import type { ReactElement } from 'react'

export function PencilIcon({ className = 'h-4 w-4' }: { className?: string }): ReactElement {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <path
        d="M14.5 3.5a1.5 1.5 0 0 1 2.12 2.12l-9 9-3 .88.88-3 9-9Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function TrashIcon({ className = 'h-4 w-4' }: { className?: string }): ReactElement {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <path
        d="M4 6h12M8 6V4.5A1.5 1.5 0 0 1 9.5 3h1A1.5 1.5 0 0 1 12 4.5V6m-6 0 .6 9.2A1.5 1.5 0 0 0 8.1 16.6h3.8a1.5 1.5 0 0 0 1.5-1.4L14 6"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function LightbulbIcon({ className = 'h-3.5 w-3.5' }: { className?: string }): ReactElement {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <path
        d="M10 2.5a5 5 0 0 0-2.7 9.2c.44.29.7.78.7 1.3v.5h4v-.5c0-.52.26-1.01.7-1.3A5 5 0 0 0 10 2.5Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <path d="M8 16h4M8.5 17.5h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}
