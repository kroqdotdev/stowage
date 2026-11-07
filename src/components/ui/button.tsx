import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";

import { cn } from "@/lib/utils";

/*
  One primary per screen (amber). Secondaries come in two weights:
  - `outline`: a 1.5px ink border, for actions that sit next to the thing
    they act on (inside cards and dialogs).
  - `secondary`: a quiet control border at 500 weight, for page-header and
    hero actions so they recede.
*/
const buttonVariants = cva(
  "inline-flex shrink-0 cursor-pointer items-center justify-center gap-[7px] whitespace-nowrap rounded-md border-[1.5px] text-[13px] font-semibold transition-colors outline-none disabled:pointer-events-none disabled:opacity-50 active:translate-y-px [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-[15px] aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default:
          "border-primary bg-primary text-primary-foreground hover:border-primary-hover hover:bg-primary-hover",
        destructive:
          "border-destructive bg-destructive text-white hover:opacity-90",
        outline: "border-foreground bg-card text-foreground hover:bg-secondary",
        secondary:
          "border-input bg-card font-medium text-foreground hover:bg-secondary",
        ghost:
          "border-transparent bg-transparent text-foreground hover:bg-secondary",
        link: "h-auto border-0 bg-transparent px-0 font-medium text-ink-2 underline underline-offset-[3px] hover:text-foreground",
      },
      size: {
        default: "h-9 px-3.5",
        xs: "h-7 gap-1 px-2 text-[13px] [&_svg:not([class*='size-'])]:size-3.5",
        sm: "h-8 gap-1.5 px-2.5",
        lg: "h-11 px-4 text-sm",
        icon: "size-9",
        "icon-xs": "size-7 [&_svg:not([class*='size-'])]:size-3.5",
        "icon-sm": "size-8",
        "icon-lg": "size-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot.Root : "button";

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
