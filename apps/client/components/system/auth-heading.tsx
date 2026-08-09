interface AuthHeadingProps {
  title: string;
  description: string;
}

export function AuthHeading({ title, description }: AuthHeadingProps) {
  return (
    <header className="space-y-3">
      <h1 className="font-display text-4xl font-semibold tracking-[-0.025em]">
        {title}
      </h1>
      <p className="text-sm leading-6 text-muted-foreground">{description}</p>
    </header>
  );
}
