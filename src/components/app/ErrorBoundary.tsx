import React from "react";
import { Button } from "@/components/ui/button";

type Props = {
  children: React.ReactNode;
};

type State = {
  hasError: boolean;
  message?: string;
};

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: unknown): State {
    const msg = error instanceof Error ? error.message : "Erreur inconnue";
    return { hasError: true, message: msg };
  }

  componentDidCatch(error: unknown, info: unknown) {
    // Important: log to help debug blank screens in preview
    // eslint-disable-next-line no-console
    console.error("App crashed:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
          <div className="w-full max-w-lg rounded-lg border border-border bg-card p-6 space-y-3">
            <h1 className="font-serif text-2xl font-bold">Oups, une erreur est survenue</h1>
            <p className="text-sm text-muted-foreground">
              La page n’a pas pu se charger. Vous pouvez réessayer en rechargeant.
            </p>
            {this.state.message && (
              <pre className="text-xs whitespace-pre-wrap rounded-md bg-muted p-3 overflow-auto max-h-40">
                {this.state.message}
              </pre>
            )}
            <div className="flex gap-2">
              <Button onClick={() => window.location.reload()}>Recharger</Button>
              <Button
                variant="outline"
                onClick={() => this.setState({ hasError: false, message: undefined })}
              >
                Réessayer
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
