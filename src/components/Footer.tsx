export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer
      className="bg-surface border-t border-border mt-auto"
      role="contentinfo"
    >
      <div className="container py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-text/60">
            © {currentYear} Bracket Builder. All rights reserved.
          </p>

          <nav aria-label="Footer navigation">
            <ul className="flex items-center gap-6">
              <li>
                <a
                  href="#"
                  className="text-sm text-text/60 hover:text-primary transition-colors"
                >
                  Privacy Policy
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-sm text-text/60 hover:text-primary transition-colors"
                >
                  Terms of Service
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-sm text-text/60 hover:text-primary transition-colors"
                >
                  Contact
                </a>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </footer>
  );
}
