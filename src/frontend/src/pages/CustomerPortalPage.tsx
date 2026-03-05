import { Leaf, Mail, MapPin, Phone } from "lucide-react";

interface Props {
  customerId: string;
}

export function CustomerPortalPage({ customerId: _customerId }: Props) {
  // Read company info from localStorage settings if available
  let companyName = "Your Service Provider";
  let companyPhone = "";
  let companyEmail = "";
  try {
    const raw = window.localStorage.getItem("app_settings");
    if (raw) {
      const parsed = JSON.parse(raw) as {
        companyName?: string;
        companyPhone?: string;
        companyEmail?: string;
      };
      if (parsed.companyName) companyName = parsed.companyName;
      if (parsed.companyPhone) companyPhone = parsed.companyPhone;
      if (parsed.companyEmail) companyEmail = parsed.companyEmail;
    }
  } catch {
    // ignore
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-lg text-center space-y-6">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center shadow-lg">
            <Leaf className="w-6 h-6 text-primary-foreground" />
          </div>
          <div className="text-left">
            <p className="font-display font-bold text-lg text-foreground">
              {companyName}
            </p>
            <p className="text-xs text-muted-foreground">Customer Portal</p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-8 shadow-card space-y-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <MapPin className="w-8 h-8 text-primary" />
          </div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            Your Customer Portal
          </h1>
          <p className="text-muted-foreground leading-relaxed">
            Your service provider will share job updates, invoices, and upcoming
            visit details here. Check back soon for your latest job status and
            service history.
          </p>

          {(companyPhone || companyEmail) && (
            <div className="border-t border-border pt-4 space-y-2">
              <p className="text-sm font-medium text-foreground">
                Contact {companyName}
              </p>
              {companyPhone && (
                <a
                  href={`tel:${companyPhone}`}
                  className="flex items-center gap-2 text-sm text-primary hover:underline justify-center"
                >
                  <Phone className="w-4 h-4" />
                  {companyPhone}
                </a>
              )}
              {companyEmail && (
                <a
                  href={`mailto:${companyEmail}`}
                  className="flex items-center gap-2 text-sm text-primary hover:underline justify-center"
                >
                  <Mail className="w-4 h-4" />
                  {companyEmail}
                </a>
              )}
            </div>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()}.{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground transition-colors"
          >
            Built with caffeine.ai
          </a>
        </p>
      </div>
    </div>
  );
}
