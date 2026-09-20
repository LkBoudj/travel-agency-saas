import Image from "next/image";
import Link from "next/link";
import type {
  FooterLink,
  FooterProps,
} from "./types";

const isExternal = (href: string) => /^(https?:|mailto:|tel:)/.test(href);

function FooterLinkItem({ link }: { link: FooterLink }) {
  return (
    <Link
      href={link.href}
      className="rounded-sm text-[14.5px] font-normal tracking-[0.01em] text-white/70 transition-colors duration-200 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
    >
      {link.label}
    </Link>
  );
}

export default function Footer({
  agencyName,
  logo,
  footer,
  currentYear = new Date().getFullYear(),
}: FooterProps) {
  const { description } = footer;
  const { explore, company } = footer.navigation;
  const contact = footer.contact;

  return (
    <footer className="relative overflow-hidden bg-surface-inverse text-white">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 flex justify-center overflow-hidden"
      >
        <span className="select-none whitespace-nowrap font-display text-[clamp(7rem,24vw,26rem)] font-semibold leading-[0.78] text-white/[0.05]">
          {agencyName}
        </span>
      </div>

      <div className="relative mx-auto max-w-[1440px] px-5 pb-14 pt-20 sm:px-8 lg:px-10 lg:pb-[72px] lg:pt-24">
        <div className="grid grid-cols-1 gap-y-12 sm:grid-cols-2 sm:gap-x-8 lg:grid-cols-12 lg:gap-x-6 xl:gap-x-10">
          {/* Brand column */}
          <div className="flex flex-col sm:col-span-2 lg:col-span-5">
            <Link
              href="/"
              aria-label={`${agencyName} — Home`}
              className="w-fit rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
            >
              {logo ? (
                <Image
                  src={logo.src}
                  alt={logo.alt || agencyName}
                  width={logo.width}
                  height={logo.height}
                  className="h-11 w-auto lg:h-12"
                  sizes="(max-width: 1024px) 176px, 192px"
                />
              ) : (
                <span className="text-[24px] font-bold tracking-tight text-white">
                  {agencyName}
                </span>
              )}
            </Link>

            {description && (
              <p className="mt-6 max-w-[340px] text-[15px] leading-[1.65] text-white/70">
                {description}
              </p>
            )}

            {footer.socialLinks.length > 0 && (
              <nav
                aria-label="Social media"
                className="mt-8 flex flex-wrap items-center gap-3"
              >
                {footer.socialLinks.map((social) => (
                  <a
                    key={social.id}
                    href={social.href}
                    target={isExternal(social.href) ? "_blank" : undefined}
                    rel={
                      isExternal(social.href)
                        ? "noopener noreferrer"
                        : undefined
                    }
                    aria-label={social.label}
                    className="inline-flex h-11 items-center rounded-full border border-white/10 bg-white/[0.06] px-4 text-[13px] font-medium text-white/75 transition-colors duration-200 hover:border-white/25 hover:bg-white/[0.12] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                  >
                    {social.label}
                  </a>
                ))}
              </nav>
            )}
          </div>

          {/* Explore + Company */}
          {[explore, company].map((column) => (
            <nav
              key={column.heading}
              aria-label={column.ariaLabel}
              className="flex flex-col lg:col-span-2"
            >
              <h3 className="text-[13px] font-semibold uppercase tracking-[0.14em] text-white">
                {column.heading}
              </h3>
              <ul className="mt-6 flex flex-col gap-3.5">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <FooterLinkItem link={link} />
                  </li>
                ))}
              </ul>
            </nav>
          ))}

          {/* Contact */}
          <address className="flex flex-col not-italic sm:col-span-2 lg:col-span-3">
            <h3 className="text-[13px] font-semibold uppercase tracking-[0.14em] text-white">
              Contact
            </h3>
            <ul className="mt-6 flex flex-col gap-4">
              {contact.map((item) => {
                const Icon = item.icon;
                const Row = (
                  <>
                    <Icon
                      aria-hidden="true"
                      className="mt-0.5 h-[18px] w-[18px] shrink-0 text-white/60"
                      strokeWidth={1.8}
                    />
                    <span className="text-[14.5px] leading-relaxed text-white/75">
                      {item.value}
                    </span>
                  </>
                );

                const rowClass =
                  "flex items-start gap-3 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white";

                return (
                  <li key={item.id}>
                    {item.href && isExternal(item.href) ? (
                      <a
                        href={item.href}
                        className={`${rowClass} transition-colors duration-200 hover:text-white`}
                      >
                        {Row}
                      </a>
                    ) : item.href ? (
                      <Link
                        href={item.href}
                        className={`${rowClass} transition-colors duration-200 hover:text-white`}
                      >
                        {Row}
                      </Link>
                    ) : (
                      <div className={rowClass}>{Row}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          </address>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/[0.08]">
        <div className="mx-auto flex max-w-[1440px] flex-col items-center justify-between gap-4 px-5 py-6 text-center sm:px-8 md:flex-row md:text-left lg:px-10 lg:py-7">
          <p className="text-[13px] font-normal text-white/60">
            © {currentYear} {agencyName}. All rights reserved.
          </p>
          <nav aria-label="Legal">
            <ul className="flex items-center gap-4">
              {[
                { label: "Privacy Policy", href: footer.legalHrefs.privacy },
                { label: "Terms of Service", href: footer.legalHrefs.terms },
              ].map((link) => (
                <li key={link.href} className="flex items-center gap-4">
                  <Link
                    href={link.href}
                    className="rounded-sm text-[13px] font-normal text-white/60 transition-colors duration-200 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>
    </footer>
  );
}