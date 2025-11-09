import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Zap, Target, Repeat, Github, Gamepad2 } from "lucide-react";

export default function Games() {
  const shifterFeatures = [
    {
      icon: Zap,
      title: "Power in Death",
      description: "Collect resources from fallen enemies to upgrade the ship, even after you 'die'. Swap weapons and parts for different strategies!",
      color: "primary",
    },
    {
      icon: Target,
      title: "Wicked Invaders",
      description: "Inspired by the many creatures of the oceans, the enemy comes in vast numbers but are backed by ruthless bosses and mini-bosses.",
      color: "secondary",
    },
    {
      icon: Repeat,
      title: "Procedural Levels",
      description: "Random generation of levels and enemy encounters mean the game is different each time, providing lots of replay opportunity.",
      color: "primary",
    },
  ];

  const pastProjects = [
    {
      title: "Infected",
      description: "A Global Game Jam 2018 submission. Fast-paced gameplay created during the 48-hour game jam challenge.",
      github: "https://github.com/AnagramMC/Infected",
      status: "GGJ 2018 Prototype",
    },
    {
      title: "Bathrobe Samurai",
      description: "An action hack and slash prototype exploring combat mechanics and player movement in a unique setting.",
      github: "https://github.com/AnagramMC/BS2.0",
      status: "Prototype",
    },
    {
      title: "Rocket Recover",
      description: "Previously published mobile game (Project ShipJump). May be re-released as a WebGL version in the future.",
      github: "https://github.com/Cat-Splat-Studios/Project_ShipJump",
      status: "Archived - Potential WebGL Release",
    },
  ];

  return (
    <div className="cosmic-bg min-h-screen">
      {/* Hero Section */}
      <section className="relative py-20 overflow-hidden">
        <div className="hero-gradient absolute inset-0" />
        <div className="container relative z-10">
          <div className="max-w-4xl mx-auto text-center animate-fade-in">
            <h1 className="text-5xl md:text-6xl font-bold mb-6 gradient-text">
              Our Games
            </h1>
            <p className="text-xl text-muted-foreground leading-relaxed">
              From game jam prototypes to published titles, explore our journey through game development
            </p>
          </div>
        </div>
      </section>

      {/* Featured Game: Codename Shifter */}
      <section className="py-20 bg-card/50">
        <div className="container">
          <div className="text-center mb-12">
            <div className="inline-block px-6 py-2 bg-primary/20 border border-primary rounded-full mb-6">
              <span className="text-primary font-bold uppercase tracking-wider text-sm">
                Featured - Currently in Development
              </span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold mb-4 gradient-text">
              Codename: Shifter
            </h2>
          </div>

          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-16">
              <div className="order-2 lg:order-1">
                <div className="space-y-6">
                  <h3 className="text-3xl font-bold">The Story So Far</h3>
                  <div className="space-y-4 text-muted-foreground leading-relaxed">
                    <p>
                      The Agonians have drained their planet of water and now roam space looking for planets rich with it, destroying any intelligent life present to use the resources as they see fit.
                    </p>
                    <p>
                      They've set their sights on Earth and pushed the Galactic Alliance to the brink of collapse! Combining human technology with reclaimed alien parts, the Alliance has created a powerful fighter craft designated <span className="text-primary font-bold">Codename: Shifter</span>.
                    </p>
                    <p className="text-lg font-semibold text-foreground">
                      Take control of Shifter and gun down the invaders! The Alliance depends on you!!
                    </p>
                  </div>
                </div>
              </div>
              <div className="order-1 lg:order-2">
                <div className="rounded-2xl overflow-hidden border-4 border-primary/30 glow-primary">
                  <img
                    src="/assets/shifter-hero.webp"
                    alt="Codename: Shifter"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>

            {/* Gameplay Features */}
            <div className="mb-12">
              <h3 className="text-3xl font-bold mb-8 text-center">Gameplay Features</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {shifterFeatures.map((feature, index) => (
                  <Card
                    key={feature.title}
                    className="group overflow-hidden border-2 border-border hover:border-primary transition-all duration-300 glow-primary hover:scale-105 animate-fade-in"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <CardContent className="p-8 text-center">
                      <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-primary/20 flex items-center justify-center group-hover:bg-primary/30 transition-colors">
                        <feature.icon className="h-8 w-8 text-primary" />
                      </div>
                      <h4 className="text-xl font-bold mb-4 gradient-text">
                        {feature.title}
                      </h4>
                      <p className="text-muted-foreground leading-relaxed text-sm">
                        {feature.description}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Ship Image */}
            <div className="max-w-2xl mx-auto">
              <div className="rounded-2xl overflow-hidden border-4 border-secondary/30 glow-secondary">
                <img
                  src="/assets/shifter-ship.webp"
                  alt="Shifter Spacecraft"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Past Projects */}
      <section className="py-20">
        <div className="container">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-center gradient-text">
              Past Projects
            </h2>
            <p className="text-xl text-muted-foreground text-center mb-12">
              Prototypes and experiments that helped shape our development journey
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {pastProjects.map((project, index) => (
                <Card
                  key={project.title}
                  className="group overflow-hidden border-2 border-border hover:border-primary transition-all duration-300 hover:scale-105 animate-fade-in"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <CardContent className="p-6">
                    <div className="mb-4">
                      <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                        <Gamepad2 className="h-6 w-6 text-primary" />
                      </div>
                      <h3 className="text-xl font-bold mb-2 text-center">{project.title}</h3>
                      <div className="inline-block w-full text-center mb-3">
                        <span className="text-xs font-semibold text-secondary uppercase tracking-wider px-3 py-1 bg-secondary/10 rounded-full">
                          {project.status}
                        </span>
                      </div>
                    </div>
                    <p className="text-muted-foreground text-sm leading-relaxed mb-4 text-center">
                      {project.description}
                    </p>
                    <a
                      href={project.github}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block"
                    >
                      <Button variant="outline" size="sm" className="w-full group/btn">
                        <Github className="mr-2 h-4 w-4" />
                        View on GitHub
                      </Button>
                    </a>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-card/50">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center bg-gradient-to-br from-primary/20 to-secondary/20 rounded-2xl p-12 border-2 border-primary/30 glow-primary">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 gradient-text">
              Stay Updated
            </h2>
            <p className="text-xl text-muted-foreground mb-8">
              Follow us on social media for the latest updates, development insights, and release announcements!
            </p>
            <Button size="lg" variant="secondary" className="text-lg px-8">
              Follow Our Journey
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
