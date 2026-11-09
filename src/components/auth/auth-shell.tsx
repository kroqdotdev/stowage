"use client";

import { useSyncExternalStore } from "react";
import { StowageWordmark } from "@/components/brand/stowage-mark";
import { PrintedLabel } from "@/components/labels/printed-label";

const DOCS_URL = "https://github.com/kroqdotdev/stowage#readme";
const LICENCE_URL = "https://github.com/kroqdotdev/stowage/blob/main/LICENSE";

function subscribe() {
  return () => {};
}

function useHost() {
  return useSyncExternalStore(
    subscribe,
    () => window.location.host,
    () => "",
  );
}

/*
  The auth split screen. A charcoal plate on the left holds one group: the
  wordmark, a real printed label rendered by the label engine, and the
  tagline. The form column on the right ends in a footer pinned to its foot:
  host · version, then Docs and the licence.
*/
export function AuthShell({ children }: { children: React.ReactNode }) {
  const host = useHost();
  const version = process.env.NEXT_PUBLIC_APP_VERSION ?? "";
  const origin = host ? `https://${host}` : "https://stowage.local";

  return (
    <div className="grid min-h-dvh grid-cols-1 bg-background md:grid-cols-[58fr_42fr]">
      <section className="on-charcoal relative flex flex-col items-center justify-center overflow-hidden bg-sidebar px-5 pt-6 pb-7 text-white md:min-h-dvh md:px-12 md:py-11">
        <div className="w-full max-w-[600px] md:-mt-36">
          <StowageWordmark size={28} className="mb-8 text-xl md:mb-10" />
          <PrintedLabel
            tag="ST-0001"
            name="Cordless drill, 18 V"
            topLeft="Stowage"
            topRight="Shelf A"
            url={`${origin}/assets/ST-0001`}
            className="mb-8 mr-[5px] w-[calc(100%-5px)] md:mr-0 md:mb-[34px] md:w-full"
          />
          <h2 className="wide text-2xl leading-[1.02] font-bold tracking-[-0.02em] text-balance md:text-[44px]">
            Every part accounted for.
          </h2>
          <p className="mt-2 max-w-[46ch] text-sm leading-normal text-[#c9ccc5] md:mt-4 md:text-base">
            <span className="hidden md:inline">
              Asset tracking for small teams.{" "}
            </span>
            Tag it, shelve it, service it on time. Runs on your own server.
          </p>
        </div>
        <div className="absolute bottom-6 left-[max(48px,calc(50%-300px))] hidden font-mono text-[13px] font-medium tracking-[0.04em] text-sidebar-muted md:block">
          Code 128 · Data Matrix
        </div>
      </section>

      <section className="flex flex-col items-center px-5 py-7 md:px-12 md:py-9">
        <div className="my-auto w-full max-w-[440px] md:mt-[18vh] md:mb-12">
          {children}
        </div>
        <footer className="mt-8 flex w-full max-w-[440px] flex-wrap gap-x-4 gap-y-2 border-t border-line-2 pt-3.5 text-[13px] text-muted-foreground md:mt-auto">
          <span className="mr-auto font-mono font-medium tracking-[0.04em] max-md:basis-full">
            {host}
            {host && version ? " · " : ""}
            {version ? `v${version}` : ""}
          </span>
          <a
            href={DOCS_URL}
            className="underline underline-offset-[3px] hover:text-foreground"
          >
            Docs
          </a>
          <span aria-hidden="true" className="md:hidden">
            ·
          </span>
          <a
            href={LICENCE_URL}
            className="underline underline-offset-[3px] hover:text-foreground"
          >
            MIT licence
          </a>
        </footer>
      </section>
    </div>
  );
}
