import React from 'react';
import './globals.css';
import 'react-toastify/dist/ReactToastify.css';
import { AuthProvider } from '@/context/AuthContext';
import { ToastContainer } from 'react-toastify';

export const metadata = {
  title: 'InvoiceMaker — Billing & Invoice SaaS',
  description: 'Production-quality billing and invoice management platform for modern businesses.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-warm-bg text-warm-text min-h-screen antialiased selection:bg-warm-accent/20 selection:text-warm-accent">
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
      </body>
    </html>
  );
}
