import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Brand */}
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-primary text-primary-foreground text-xs font-bold">
              CM
            </div>
            <span className="font-semibold">CrowdMantle</span>
            <span className="text-xs text-muted-foreground">
              | Securities Crowdfunding
            </span>
          </div>

          {/* Links */}
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <Link href="/projects" className="hover:text-foreground transition-colors">
              Invest
            </Link>
            <Link href="/dashboard" className="hover:text-foreground transition-colors">
              My Portfolio
            </Link>
            <a
              href="https://explorer.sepolia.mantle.xyz"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
            >
              Explorer
            </a>
          </div>

          {/* Hackathon Badge */}
          <div className="text-sm text-muted-foreground">
            Built for{" "}
            <a
              href="https://www.hackquest.io/ko/hackathons/Mantle-Global-Hackathon-2025"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-foreground hover:underline"
            >
              Mantle Global Hackathon 2025
            </a>
          </div>
        </div>

        {/* Copyright & Disclaimer */}
        <div className="mt-6 pt-6 border-t text-center space-y-2">
          <p className="text-xs text-muted-foreground">
            Powered by Mantle Network | RWA/RealFi Track
          </p>
          <p className="text-xs text-muted-foreground/70">
            This platform is for demonstration purposes only and is not an actual investment service. All data is used for testing purposes only.
          </p>
        </div>
      </div>
    </footer>
  );
}
