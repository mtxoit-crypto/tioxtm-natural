import { Suspense, lazy } from "react";
import { ClientOnly } from "@tanstack/react-router";

const ModelScene = lazy(() => import("./ModelScene"));

function Placeholder() {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="h-40 w-28 animate-pulse rounded-2xl bg-muted" />
    </div>
  );
}

export function ModelViewer({ url, className }: { url: string; className?: string }) {
  return (
    <div className={className}>
      <div className="relative h-[380px] w-full overflow-hidden rounded-3xl bg-sand grain-bg sm:h-[460px]">
        <ClientOnly fallback={<Placeholder />}>
          <Suspense fallback={<Placeholder />}>
            <ModelScene url={url} />
          </Suspense>
        </ClientOnly>
        <span className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-card/80 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
          Arraste para girar · role para aproximar
        </span>
      </div>
    </div>
  );
}
