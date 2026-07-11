import Link from "next/link";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Inter } from "next/font/google";
import "../app/globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} h-full antialiased font-sans`}
    >
      <body className="min-h-full flex flex-col">
        <TooltipProvider>
          <SidebarProvider>
            <Sidebar>
              {/* Brand header */}
              <div className="flex items-center gap-2.5 px-5 py-5 border-b border-sidebar-border">
                <div className="size-7 rounded-md bg-highlight flex items-center justify-center shrink-0">
                  <span className="text-highlight-foreground text-xs font-bold leading-none">G</span>
                </div>
                <span className="font-semibold text-sm tracking-tight text-foreground">
                  GrowEasy
                </span>
              </div>

              <SidebarContent className="p-3 pt-4">
                <SidebarGroup>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      <SidebarMenuItem>
                        <Link href="/">
                          <SidebarMenuButton className="h-9 px-3 text-sm font-medium">
                            All Leads
                          </SidebarMenuButton>
                        </Link>
                      </SidebarMenuItem>
                      <SidebarMenuItem>
                        <Link href="/imports">
                          <SidebarMenuButton className="h-9 px-3 text-sm font-medium">
                            Upload Leads
                          </SidebarMenuButton>
                        </Link>
                      </SidebarMenuItem>
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              </SidebarContent>
            </Sidebar>
            <main className="flex-1 min-w-0 p-6 overflow-x-hidden">
              {children}
            </main>
          </SidebarProvider>
        </TooltipProvider>
      </body>
    </html>
  );
}
