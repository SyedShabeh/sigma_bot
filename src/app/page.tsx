import SplashCursor from "../../components/SplashCursor";
import { logout } from "./logout/actions";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 font-sans bg-white dark:bg-black">
      <SplashCursor/>
      {/* Heading */}
      <h1 className="text-4xl font-bold text-center mb-8">
        Welcome to Sigma bot
      </h1>

      {/* Buttons */}
      <div className="flex gap-4">
        <a
          href="/chat"
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          New Chat
        </a>
        <form action={logout}>
          <button
            type="submit"
            className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            Logout
          </button>
        </form>
      </div>
    </div>
  );
}
