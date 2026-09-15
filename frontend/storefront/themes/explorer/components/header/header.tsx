"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Menu, X } from "lucide-react";
import { useHeaderScroll } from "@/hooks/use-header-scroll";
import type { HeaderProps } from "./types";

const OVERLAY_UNTIL = 32;

function MenuIcon({ open }: { open: boolean }) {
  return open ? (
    <X className="h-6 w-6" strokeWidth={1.8} />
  ) : (
    <Menu className="h-6 w-6" strokeWidth={1.8} />
  );
}

function ArrowIcon({ className }: { className?: string }) {
  return <ArrowRight className={className} strokeWidth={2} />;
}

export default function Header({
  agencyName,
  logo,
  navLinks,
  ctaLabel = "Explore Tours",
  ctaHref,
}: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  const { scrolled } = useHeaderScroll(OVERLAY_UNTIL);

  const toursLink = navLinks.find(
    (link) => link.label.trim().toLowerCase() === "tours",
  );
  const lastLinkHref = navLinks[navLinks.length - 1]?.href;
  const toursHref = ctaHref ?? toursLink?.href ?? lastLinkHref ?? "#";

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  const overHero = !scrolled;
  const focusOutline = overHero ? "rgba(255, 255, 255, 0.85)" : "var(--primary)";

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ease-out ${
        overHero
          ? "bg-transparent shadow-none"
          : "bg-background/95 shadow-[0_1px_0_rgba(0,0,0,0.06)] backdrop-blur supports-[backdrop-filter]:bg-background/80"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-4 px-5 sm:px-8 lg:h-[96px] lg:px-10">
        <Link
          href="/"
          className="flex min-w-0 shrink-0 items-center rounded-md transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
          style={{ outlineColor: focusOutline }}
          aria-label={`${agencyName} — Home`}
          onClick={() => setMenuOpen(false)}
        >
          {logo?.src ? (
            <Image
              src={logo.src}
              alt={logo.alt || agencyName}
              width={logo.width}
              height={logo.height}
              loading="eager"
              sizes="(max-width: 640px) 114px, (max-width: 1024px) 124px, 220px"
              className="h-11 w-auto sm:h-12 lg:h-[86px]"
            />
          ) : (
            <>
              <span
                aria-hidden="true"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-base font-bold text-white lg:h-11 lg:w-11"
              >
                {agencyName.slice(0, 1)}
              </span>
              <span
                className={`truncate text-lg font-semibold tracking-tight transition-colors duration-500 ${
                  overHero ? "text-white" : "text-foreground"
                }`}
              >
                {agencyName}
              </span>
            </>
          )}
        </Link>

        <nav aria-label="Main" className="hidden lg:block">
          <ul className="flex items-center gap-10">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={`rounded-sm text-[16px] font-medium tracking-[0.01em] transition-colors duration-500 focus-visible:outline-2 focus-visible:outline-offset-4 ${
                    overHero
                      ? "text-white/90 hover:text-white"
                      : "text-foreground/75 hover:text-foreground"
                  }`}
                  style={{ outlineColor: focusOutline }}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href={toursHref}
            className="hidden h-[54px] items-center gap-2.5 rounded-full bg-primary px-8 text-[16px] font-semibold text-white transition-[transform,background-color] duration-300 hover:-translate-y-0.5 hover:brightness-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white lg:inline-flex"
          >
            {ctaLabel}
            <ArrowIcon className="h-[18px] w-[18px]" />
          </Link>

          <button
            ref={menuButtonRef}
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-controls="mobile-nav-menu"
            className={`inline-flex h-11 w-11 items-center justify-center rounded-md transition-[transform,color] duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 lg:hidden ${
              overHero ? "text-white" : "text-foreground"
            } ${menuOpen ? "rotate-90" : ""}`}
            style={{ outlineColor: focusOutline }}
          >
            <MenuIcon open={menuOpen} />
          </button>
        </div>
      </div>

      <div
        id="mobile-nav-menu"
        inert={!menuOpen}
        className={`overflow-hidden transition-[max-height,opacity] duration-500 ease-in-out lg:hidden ${
          menuOpen ? "max-h-[80vh] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <nav
          aria-label="Mobile menu"
          className="border-t border-slate-100 bg-background px-5 pb-10 pt-4 sm:px-8 lg:px-10"
        >
          <ul className="flex flex-col overflow-y-auto">
            {navLinks.map((link) => (
              <li key={link.href} className="border-b border-slate-100 last:border-0">
                <Link
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className="flex h-14 items-center text-base font-medium text-foreground transition-colors"
                  style={{ outlineColor: "var(--primary)" }}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
          <Link
            href={toursHref}
            onClick={() => setMenuOpen(false)}
            className="mt-7 flex h-12 w-full items-center justify-center rounded-full bg-primary text-[16px] font-semibold text-white transition-all duration-300 hover:brightness-105"
          >
            {ctaLabel}
          </Link>
        </nav>
      </div>
    </header>
  );
}