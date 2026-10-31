import { Link } from "react-router-dom";
import { Compass } from "lucide-react";
import { CrownLogo } from "../components/ui/CrownLogo";

export default function NotFound() {
  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-4 px-4 text-center">
      <CrownLogo size={52} />
      <h1 className="gold-text font-display text-4xl font-black">404</h1>
      <p className="flex items-center gap-2 text-gray-400">
        <Compass size={16} /> This road leads beyond the empire's borders.
      </p>
      <Link to="/dashboard" className="btn-primary mt-2">
        Return to the Dashboard
      </Link>
    </div>
  );
}
