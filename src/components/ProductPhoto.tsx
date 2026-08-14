type ProductPhotoProps = {
  src: string
  alt: string
  className?: string
  /** sm = kits/cart thumbs, md = cards, lg = PDP hero */
  size?: "sm" | "md" | "lg" | "thumb"
  loading?: "lazy" | "eager"
}

const frameBySize: Record<NonNullable<ProductPhotoProps["size"]>, string> = {
  sm: "aspect-[4/5] w-full rounded-xl bg-sand p-2",
  md: "aspect-[4/5] w-full rounded-xl bg-sand p-3",
  lg: "aspect-[4/5] w-full rounded-2xl bg-sand p-4 sm:aspect-square",
  thumb: "size-12 shrink-0 overflow-hidden rounded-lg bg-sand p-1",
}

/**
 * Sempre object-contain + padding pra potes/frascos não ficarem cortados.
 */
export function ProductPhoto({
  src,
  alt,
  className = "",
  size = "md",
  loading = "lazy",
}: ProductPhotoProps) {
  return (
    <div className={`${frameBySize[size]} ${className}`.trim()}>
      <img
        src={src}
        alt={alt}
        loading={loading}
        className="size-full object-contain object-center"
      />
    </div>
  )
}
