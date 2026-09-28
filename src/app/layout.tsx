import React from 'react';
import './globals.css';
import 'react-toastify/dist/ReactToastify.css';
import { AuthProvider } from '@/context/AuthContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { ToastContainer } from 'react-toastify';

import type { Viewport } from 'next';

export const metadata = {
  title: 'InvoiceMaker — Billing & Invoice SaaS',
  description: 'Production-quality billing and invoice management platform for modern businesses.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-warm-bg text-warm-text min-h-screen antialiased">
        <ThemeProvider>
          <AuthProvider>
            {children}
            <ToastContainer
              position="top-right"
              autoClose={3500}
              hideProgressBar
              newestOnTop
              closeOnClick
              rtl={false}
              pauseOnFocusLoss
              draggable
              pauseOnHover
              theme="light"
            />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
