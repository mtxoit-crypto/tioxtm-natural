import { Suspense, lazy, useState } from "react";
import { ClientOnly } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

const JarScene = lazy(() => import("./JarScene"));

type Props = {
  jarColor: string;
  lidColor: string;
  capsuleColor: string;
  capsuleCount: number;
  name?: string | undefined;
  dosage?: string | undefined;
  subtitle?: string | undefined;
  imageUrl?: string | undefined;
  className?: string;
};



function Placeholder() {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="h-40 w-28 animate-pulse rounded-2xl bg-muted" />
    </div>
  );
}

export function JarViewer({ className, ...scene }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className={className}>
      <div className="relative mx-auto h-[220px] w-full max-w-[220px] touch-pan-y overflow-hidden rounded-3xl bg-sand grain-bg sm:h-[360px] sm:max-w-none md:h-[460px]">
        <ClientOnly fallback={<Placeholder />}>
          <Suspense fallback={<Placeholder />}>
            <JarScene open={open} {...scene} />
          </Suspense>
        </ClientOnly>
        <span className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-card/80 px-3 py-1 text-[11px] text-muted-foreground backdrop-blur sm:bottom-4 sm:text-xs">
          Deslize para o lado para girar
        </span>
      </div>
      <div className="mt-4 flex justify-center">
        <Button size="lg" variant={open ? "secondary" : "default"} onClick={() => setOpen(!open)}>
          {open ? "Fechar a tampa" : "Abrir a tampa e ver as cápsulas"}
        </Button>
      </div>
    </div>
  );
}
