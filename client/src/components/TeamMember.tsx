import { Card, CardContent } from "@/components/ui/card";

interface TeamMemberProps {
  name: string;
  role: string;
  bio: string;
  image?: string;
}

export default function TeamMember({ name, role, bio, image }: TeamMemberProps) {
  return (
    <Card className="group overflow-hidden border-2 border-border hover:border-secondary transition-all duration-300 glow-secondary hover:scale-105">
      <CardContent className="p-6">
        <div className="text-center mb-4">
          {image && (
            <div className="w-32 h-32 mx-auto mb-4 rounded-full overflow-hidden border-4 border-primary/20 group-hover:border-primary transition-colors">
              <img
                src={image}
                alt={name}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <h3 className="text-2xl font-bold mb-1">{name}</h3>
          <p className="text-sm font-semibold text-primary uppercase tracking-wider">
            {role}
          </p>
        </div>
        <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent mb-4" />
        <p className="text-muted-foreground text-sm leading-relaxed">
          {bio}
        </p>
      </CardContent>
    </Card>
  );
}
