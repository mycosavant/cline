import { Inter } from 'next/font/google'; // Using Inter for a more modern UI feel
import './globals.css';
import { cn } from '@/lib/utils';
import { Toaster } from "@/components/ui/toaster"; // Import Toaster
import { SettingsProvider } from '@/contexts/settings-context'; // Import SettingsProvider
import { AiSettingsDialog } from '@/components/settings/ai-settings-dialog'; // Import Settings Dialog
const inter = Inter({
    subsets: ['latin'],
    variable: '--font-sans',
});
export const metadata = {
    title: 'AI PairProgrammer',
    description: 'Pair-program with AI agents using Gemini or OpenRouter.', // Updated description
};
export default function RootLayout({ children, }) {
    return (<html lang="en" suppressHydrationWarning>
      <body className={cn('min-h-screen bg-background font-sans antialiased dark', // Apply dark mode by default
        inter.variable)}>
        <SettingsProvider> {/* Wrap with SettingsProvider */}
          <main className="flex flex-1 flex-col">{children}</main>
          <AiSettingsDialog /> {/* Add Settings Dialog */}
          <Toaster /> {/* Add Toaster component */}
        </SettingsProvider>
      </body>
    </html>);
}
//# sourceMappingURL=layout.js.map