import TeamMember from "@/components/TeamMember";

export default function About() {
  const teamMembers = [
    {
      name: "Hisham Ata",
      role: "Founder - Technical Director",
      bio: "Hisham founded Cat Splat Studios in 2015. His background is in programming, IT and project management. In his free time, he loves playing fighting games, being a competitor and a commentator for the Canadian fighting game community.",
    },
    {
      name: "Kyle Skidmore",
      role: "Project Manager - Game Designer",
      bio: "Kyle is a designer and art director who also takes the project management role at Cat Splat. He's loved video games since he could hold a controller. His passion for games and the systems behind them makes him the de facto Dungeon Master of the team, as well.",
    },
    {
      name: "Vader",
      role: "Team Mascot",
      bio: "Vader is an adventurous fluffy cat who continues to motivate us with his enthusiasm and attention to detail when reviewing our work. His furrvourite games involved the kitty post and laser (pointer) tag!",
      image: "/assets/vader-cat.webp",
    },
  ];

  return (
    <div className="cosmic-bg min-h-screen">
      {/* Hero Section */}
      <section className="py-20 relative">
        <div className="hero-gradient absolute inset-0" />
        <div className="container relative z-10">
          <div className="text-center mb-16 animate-fade-in">
            <div className="mb-8">
              <img
                src="/assets/cat-splat-logo.webp"
                alt="Cat Splat Studios"
                className="w-full max-w-xl mx-auto"
              />
            </div>
            <h1 className="text-5xl md:text-6xl font-bold mb-6 gradient-text">
              Our Team
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              Meet the passionate individuals behind Cat Splat Studios. We're a small but dedicated team of game developers, designers, and one very important cat, all working together to create amazing gaming experiences.
            </p>
          </div>
        </div>
      </section>

      {/* Team Members Section */}
      <section className="py-20">
        <div className="container">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {teamMembers.map((member, index) => (
              <div
                key={member.name}
                className="animate-fade-in"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <TeamMember {...member} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team Photo Section */}
      <section className="py-20 bg-card/50">
        <div className="container">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold mb-8 text-center gradient-text">
              Behind the Scenes
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="rounded-lg overflow-hidden border-2 border-border hover:border-primary transition-all glow-primary">
                <img
                  src="/assets/team-photo.webp"
                  alt="Cat Splat Studios Team"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="rounded-lg overflow-hidden border-2 border-border hover:border-secondary transition-all glow-secondary">
                <img
                  src="/assets/vader-cat.webp"
                  alt="Vader - Team Mascot"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-20">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center bg-gradient-to-br from-primary/20 to-secondary/20 rounded-2xl p-12 border-2 border-primary/30 glow-primary">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 gradient-text">
              Our Mission
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              At Cat Splat Studios, we're committed to creating innovative and engaging gaming experiences that bring joy to players around the world. Based in Toronto, we combine technical expertise with creative passion to develop games that stand out in the indie gaming scene.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
