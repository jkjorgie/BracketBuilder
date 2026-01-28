export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer
      className="bg-surface border-t border-border mt-auto"
      role="contentinfo"
    >
      <div className="container py-8">
        <p className="text-sm text-text/60 text-center">
          © {currentYear} Gideon Taylor Consulting, LLC. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
