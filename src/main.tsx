import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ClerkProvider } from "@clerk/clerk-react";
import App from "./App";
import "./styles/index.css";

const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined;
const rootElement = document.getElementById("root");
const hasPublishableKey =
  /^pk_(test|live)_\S+$/.test(publishableKey ?? "") &&
  !/your_publishable_key|placeholder/i.test(publishableKey ?? "");

if (!rootElement) {
  throw new Error("Application root element #root was not found.");
}

const root = createRoot(rootElement);

if (!hasPublishableKey) {
  root.render(
    <main className="flex min-h-full items-center justify-center bg-[#0a0c0b] px-6 py-12 text-gray-100">
      <section
        aria-labelledby="configuration-title"
        className="w-full max-w-xl rounded-2xl border border-amber-300/20 bg-[#111715] p-8 shadow-2xl"
        role="alert"
      >
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-300">
          Setup required
        </p>
        <h1 id="configuration-title" className="mt-3 font-display text-3xl font-bold">
          Fitness Messer needs Clerk configuration
        </h1>
        <p className="mt-4 leading-7 text-gray-300">
          Sign-in is required to use the application. The Clerk publishable key is
          missing or invalid, so the app has not started authentication.
        </p>
        <ol className="mt-5 list-decimal space-y-2 pl-5 text-sm leading-6 text-gray-300">
          <li>
            Add your Clerk publishable key to a root-level <code>.env.local</code> file
            as <code>VITE_CLERK_PUBLISHABLE_KEY=pk_test_...</code>.
          </li>
          <li>Restart the Vite development server so it loads the new setting.</li>
        </ol>
        <p className="mt-5 text-sm text-gray-400">
          Get the key from your Clerk dashboard. Do not share secret keys or tokens.
        </p>
      </section>
    </main>,
  );
} else if (publishableKey) {
  root.render(
    <StrictMode>
      <ClerkProvider publishableKey={publishableKey}>
        <App />
      </ClerkProvider>
    </StrictMode>,
  );
}
