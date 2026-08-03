type StatusBannerProps = {
  tone?: 'info' | 'error' | 'warning'
  children: string
}

export function StatusBanner({ tone = 'info', children }: StatusBannerProps) {
  return (
    <div className={`status-banner ${tone}`} role="status">
      {children}
    </div>
  )
}
