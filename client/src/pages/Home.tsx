import { Button } from "@/components/ui/button";
import GameCard from "@/components/GameCard";
import { ArrowRight, Gamepad2, Users, Rocket } from "lucide-react";
import { Link } from "wouter";

export default function Home() {
  return (
    <div className="cosmic-bg">
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
        <div className="hero-gradient absolute inset-0" />
        <div className="container relative z-10">
          <div className="max-w-4xl mx-auto text-center animate-fade-in">
            <div className="mb-8">
              <img
                src="/assets/cat-splat-logo.webp"
                alt="Cat Splat Studios"
                className="w-full max-w-2xl mx-auto animate-float"
              />
            </div>
            <h1 className="text-4xl md:text-6xl font-bold mb-6 gradient-text">
              Indie Game Studio from Toronto
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground mb-8 leading-relaxed">
              We are an indie game studio developing fun and exciting games that push the boundaries of creativity and innovation
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/games">
                <Button size="lg" className="text-lg px-8 group">
                  Explore Our Game
                  <Gamepad2 className="ml-2 h-5 w-5 transition-transform group-hover:scale-110" />
                </Button>
              </Link>
              <Link href="/about">
                <Button size="lg" variant="outline" className="text-lg px-8 group">
                  Meet the Team
                  <Users className="ml-2 h-5 w-5 transition-transform group-hover:scale-110" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Game Section */}
      <section className="py-20 relative">
        <div className="container">
          <div className="text-center mb-16 animate-fade-in">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 gradient-text">
              Featured Game
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Experience our flagship title - a thrilling space adventure
            </p>
          </div>

          <div className="max-w-2xl mx-auto animate-fade-in">
            <GameCard
              title="Codename: Shifter"
              image="/assets/shifter-ship.webp"
              description="A top-down arcade shooter that focuses on customization and replay value. Take control of Shifter and gun down the invaders!"
              href="/games"
            />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-card/50">
        <div className="container">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center p-8 rounded-lg border border-border hover:border-primary transition-all hover:glow-primary group">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/20 flex items-center justify-center group-hover:bg-primary/30 transition-colors">
                <Gamepad2 className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-2">Innovative Gameplay</h3>
              <p className="text-muted-foreground">
                Unique mechanics and engaging experiences that keep players coming back
              </p>
            </div>

            <div className="text-center p-8 rounded-lg border border-border hover:border-secondary transition-all hover:glow-secondary group">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-secondary/20 flex items-center justify-center group-hover:bg-secondary/30 transition-colors">
                <Users className="h-8 w-8 text-secondary" />
              </div>
              <h3 className="text-xl font-bold mb-2">Passionate Team</h3>
              <p className="text-muted-foreground">
                Dedicated developers and designers working together to create amazing games
              </p>
            </div>

            <div className="text-center p-8 rounded-lg border border-border hover:border-primary transition-all hover:glow-primary group">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/20 flex items-center justify-center group-hover:bg-primary/30 transition-colors">
                <Rocket className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-2">Continuous Innovation</h3>
              <p className="text-muted-foreground">
                Always pushing boundaries and exploring new ideas in game development
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center bg-gradient-to-br from-primary/20 to-secondary/20 rounded-2xl p-12 border-2 border-primary/30 glow-primary">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 gradient-text">
              Join Our Journey
            </h2>
            <p className="text-xl text-muted-foreground mb-8">
              Follow us on social media to stay updated on our latest projects and announcements
            </p>
            <Link href="/about">
              <Button size="lg" variant="secondary" className="text-lg px-8 group">
                Learn More About Us
                <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
