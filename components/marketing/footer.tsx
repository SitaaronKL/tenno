import { GithubIcon } from "@/components/icons/github";

export function Footer() {
  return (
    <footer className="px-6 py-10">
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 text-sm text-muted-foreground sm:flex-row">
        <p>Voidwatch is a fan project and is not affiliated with Digital Extremes.</p>
        <a
          href="https://github.com/SitaaronKL/tenno"
          className="inline-flex items-center gap-2 rounded-lg hover:text-foreground"
          target="_blank"
          rel="noopener noreferrer"
        >
          <GithubIcon size={16} aria-hidden="true" /> GitHub
        </a>
      </div>
    </footer>
  );
}
