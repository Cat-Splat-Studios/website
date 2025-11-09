import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { Link } from "wouter";

interface GameCardProps {
  title: string;
  image: string;
  description: string;
  href: string;
}

export default function GameCard({ title, image, description, href }: GameCardProps) {
  return (
    <Card className="group overflow-hidden border-2 border-border hover:border-primary transition-all duration-300 glow-primary hover:scale-105">
      <CardContent className="p-0">
        <div className="relative aspect-square overflow-hidden">
          <img
            src={image}
            alt={title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </div>
        <div className="p-6">
          <h3 className="text-2xl font-bold mb-3 gradient-text">{title}</h3>
          <p className="text-muted-foreground mb-4 line-clamp-2">{description}</p>
          <Link href={href}>
            <Button className="w-full group/btn">
              Learn More
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
