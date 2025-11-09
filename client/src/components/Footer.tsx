import { Facebook, Instagram, Twitter, Mail } from "lucide-react";
import { Link } from "wouter";

export default function Footer() {
  const socialLinks = [
    { icon: Facebook, href: "https://facebook.com/catsplatstudios", label: "Facebook" },
    { icon: Instagram, href: "https://instagram.com/catsplatstudios", label: "Instagram" },
    { icon: Twitter, href: "https://twitter.com/catsplatstudios", label: "Twitter" },
    { icon: Mail, href: "mailto:info@catsplatstudios.com", label: "Email" },
  ];

  return (
    <footer className="bg-card border-t border-border">
      <div className="container py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Information */}
          <div>
            <h3 className="text-lg font-bold mb-4 gradient-text">Information</h3>
            <div className="flex flex-col gap-2">
              <a 
                href="#" 
                className="text-muted-foreground hover:text-foreground transition-colors text-sm"
              >
                Privacy Policy
              </a>
              <a 
                href="#" 
                className="text-muted-foreground hover:text-foreground transition-colors text-sm"
              >
                Terms and Conditions
              </a>
            </div>
          </div>

          {/* Find us on */}
          <div>
            <h3 className="text-lg font-bold mb-4 gradient-text">Find us on</h3>
            <div className="flex gap-4">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-muted flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-all hover:scale-110"
                  aria-label={social.label}
                >
                  <social.icon className="h-5 w-5" />
                </a>
              ))}
            </div>
          </div>

          {/* Copyright */}
          <div className="flex flex-col justify-end">
            <p className="text-muted-foreground text-sm">
              © 2014-2025 Cat Splat Studios Inc
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
