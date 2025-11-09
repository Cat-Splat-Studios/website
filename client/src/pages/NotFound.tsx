import { Button } from "@/components/ui/button";
import { Home, ArrowLeft } from "lucide-react";
import { Link, useLocation } from "wouter";

export default function NotFound() {
  const [, setLocation] = useLocation();

  return (
    <div className="cosmic-bg min-h-screen flex items-center justify-center">
      <div className="container">
        <div className="max-w-2xl mx-auto text-center animate-fade-in">
          <div className="mb-8">
            <h1 className="text-9xl font-bold gradient-text mb-4">404</h1>
            <h2 className="text-4xl font-bold mb-4">Page Not Found</h2>
            <p className="text-xl text-muted-foreground mb-8">
              Looks like this page got lost in space. Let's get you back on track!
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              onClick={() => setLocation("/")}
              className="group"
            >
              <Home className="mr-2 h-5 w-5" />
              Go Home
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => window.history.back()}
              className="group"
            >
              <ArrowLeft className="mr-2 h-5 w-5" />
              Go Back
            </Button>
          </div>

          <div className="mt-16">
            <img
              src="/assets/shifter-ship.webp"
              alt="Lost in Space"
              className="w-64 h-64 mx-auto opacity-50 animate-float"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
