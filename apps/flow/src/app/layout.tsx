import "./globals.css";

export const metadata = {
  title: "AI-Esnaf Dashboard Command Center",
  description: "Web frontend for Flow AI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@600;700&family=Inter:wght@400&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body-md text-body-md h-screen overflow-hidden flex">
        {children}
      </body>
    </html>
  );
}

