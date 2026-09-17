import { colorFor, initials } from '../lib/utils'
import { cx } from '../lib/utils'

export default function Avatar({
  name, url, size = 40, className, online,
}: { name?: string | null; url?: string | null; size?: number; className?: string; online?: boolean }) {
  return (
    <div className={cx('relative shrink-0', className)} style={{ width: size, height: size }}>
      {url ? (
        <img src={url} alt={name ?? ''} className="w-full h-full rounded-full object-cover" />
      ) : (
        <div
          className="w-full h-full rounded-full flex items-center justify-center text-white font-medium uppercase"
          style={{ background: colorFor(name), fontSize: size * 0.4 }}
        >
          {initials(name)}
        </div>
      )}
      {online && (
        <span className="absolute bottom-0 right-0 block rounded-full bg-wa-green ring-2 ring-white dark:ring-wa-dpanel"
          style={{ width: size * 0.28, height: size * 0.28 }} />
      )}
    </div>
  )
}
