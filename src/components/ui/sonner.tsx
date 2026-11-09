"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";

/*
  Toasts are charcoal at one fixed width so a stack aligns. The success toast
  carries a 3px side-text edge; the error toast one coral for its edge and
  icon. Actions are white-bordered 28px buttons pinned right.
*/
export function Toaster(props: ToasterProps) {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      style={
        {
          "--width": "440px",
          "--border-radius": "3px",
          "--normal-bg": "#1f2220",
          "--normal-border": "#1f2220",
          "--normal-text": "#ffffff",
          "--success-bg": "#1f2220",
          "--success-border": "#1f2220",
          "--success-text": "#ffffff",
          "--error-bg": "#1f2220",
          "--error-border": "#1f2220",
          "--error-text": "#ffffff",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast:
            "group toast !rounded-md !font-sans !text-sm !font-medium shadow-[inset_3px_0_0_#d9dbd5,0_12px_32px_rgba(0,0,0,.28)]",
          error:
            "shadow-[inset_3px_0_0_#f08a7e,0_12px_32px_rgba(0,0,0,.28)] [&_[data-icon]]:text-[#f08a7e]",
          description: "!text-[#d9dbd5]",
          actionButton:
            "!ml-auto !h-7 !rounded-md !border-[1.5px] !border-white !bg-transparent !px-2.5 !font-semibold !text-white",
          cancelButton: "!bg-transparent !text-[#d9dbd5]",
          closeButton:
            "!border-[#33372f] !bg-[#1f2220] !text-[#d9dbd5] hover:!bg-[#2a2d2a]",
        },
      }}
      {...props}
    />
  );
}
