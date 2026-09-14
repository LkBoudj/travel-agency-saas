"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { HeaderBranding, HeaderNavLink } from "./types";

interface HeaderProps extends HeaderBranding {
  navLinks: HeaderNavLink[];
  ctaLabel?: string;
  ctaHref?: string;
}

const OVERLAY_UNTIL = 32;

function MenuIcon({ open }: { open: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    >
      {open ? (
        <path d="M6 6l12 12M18 6L6 18" />
      ) : (
        <path d="M4 7h16M4 12h16M4 17h16" />
      )}
    </svg>
  );
}

export default function Header({
  agencyName,
  logo,
  navLinks,
  primaryColor,
  ctaLabel = "Explore Tours",
  ctaHref,
}: HeaderProps) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  const toursLink = navLinks.find(
    (link) => link.label.trim().toLowerCase() === "tours",
  );
  const lastLinkHref = navLinks[navLinks.length - 1]?.href;
  const toursHref = ctaHref ?? toursLink?.href ?? lastLinkHref ?? "#";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > OVERLAY_UNTIL);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

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

  const brandColor = primaryColor ?? "#2563eb";
  const overHero = !scrolled;

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ease-out ${
        overHero
          ? "bg-transparent shadow-none"
          : "bg-background/95 shadow-[0_1px_0_rgba(0,0,0,0.06)] backdrop-blur supports-[backdrop-filter]:bg-background/80"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-5 sm:px-8 lg:h-20">
        <Link
          href="/"
          className={`flex min-w-0 items-center gap-2.5 rounded-md transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 ${
            overHero
              ? "focus-visible:outline-white"
              : "focus-visible:outline-sky-600"
          }`}
          aria-label={`${agencyName} — Home`}
        >
          {logo?.src ? (
            <Image
              className="max-h-9 w-auto"
              src={logo.src}
              alt={logo.alt || agencyName}
              width={36}
              height={36}
            />
          ) : (
            <span
              aria-hidden="true"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
              style={{ backgroundColor: brandColor }}
            >
              {agencyName.slice(0, 1)}
            </span>
          )}
          <span
            className={`truncate text-lg font-semibold tracking-tight transition-colors duration-500 ${
              overHero ? "text-white" : "text-foreground"
            }`}
          >
            {agencyName}
          </span>
        </Link>

        <nav aria-label="Main" className="hidden lg:block">
          <ul className="flex items-center gap-7">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={`rounded-sm text-sm font-medium tracking-wide transition-colors duration-500 focus-visible:outline-2 focus-visible:outline-offset-4 ${
                    overHero
                      ? "text-white/90 hover:text-white focus-visible:outline-white"
                      : "text-foreground/80 hover:text-foreground focus-visible:outline-sky-600"
                  }`}
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
            className="hidden h-11 items-center rounded-full px-6 text-sm font-semibold text-white transition-[transform,background-color,box-shadow] duration-200 hover:-translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white lg:inline-flex"
            style={{
              backgroundColor: brandColor,
              boxShadow: `0 8px 20px -8px ${brandColor}80`,
            }}
          >
            {ctaLabel}
          </Link>

          <button
            ref={menuButtonRef}
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-controls="mobile-nav-menu"
            className={`inline-flex h-11 w-11 items-center justify-center rounded-md transition-[transform,color] duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 lg:hidden ${
              overHero
                ? "text-white focus-visible:outline-white"
                : "text-foreground focus-visible:outline-sky-600"
            } ${menuOpen ? "rotate-90" : ""}`}
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
          className="border-t border-zinc-100 bg-background px-5 pb-8 pt-4 sm:px-8"
        >
          <ul className="flex flex-col overflow-y-auto">
            {navLinks.map((link) => (
              <li key={link.href} className="border-b border-zinc-100 last:border-0">
                <Link
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className="flex h-14 items-center text-base font-medium text-foreground transition-colors hover:text-sky-600"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
          <Link
            href={toursHref}
            onClick={() => setMenuOpen(false)}
            className="mt-6 flex h-12 w-full items-center justify-center rounded-full text-sm font-semibold text-white"
            style={{
              backgroundColor: brandColor,
              boxShadow: `0 12px 28px -10px ${brandColor}80`,
            }}
          >
            {ctaLabel}
          </Link>
        </nav>
      </div>
    </header>
  );
}