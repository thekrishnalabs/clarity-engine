import { createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { BrandLayout } from "@/components/hiren/BrandLayout";
import { AuthProvider } from "@/contexts/AuthContext";
import appCss from "../styles.css?url";

function RootComponent() {
  return (
    <AuthProvider>
      <BrandLayout />
    </AuthProvider>
  );
}

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="hk-panel max-w-md rounded-3xl p-8 text-center">
        <p className="hk-eyebrow">404</p>
        <h1 className="hk-heading mt-3 text-4xl">Page not found</h1>
        <a href="/" className="hk-button-primary mt-6 inline-flex rounded-full px-5 py-3 font-semibold">Go home</a>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Hiren Kundli — Decision Clarity Engine" },
      { name: "description", content: "Hiren Kundli decodes patterns for structured decision clarity without prediction language." },
      { property: "og:title", content: "Hiren Kundli — Decision Clarity Engine" },
      { property: "og:description", content: "Decode patterns, understand direction, and make calmer decisions." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head><HeadContent /></head>
      <body>{children}<Scripts /></body>
    </html>
  );
}
