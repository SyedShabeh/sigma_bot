"use client";
import Swal from 'sweetalert2';
import { useState } from "react";
import Image from 'next/image';
import { login, signup } from './actions';

export default function LoginPage() {
  const [loading, setLoading] = useState<null | 'login' | 'signup'>(null);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0a174e] via-[#1b2440] to-[#283655]">
      <div className="flex w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Left Side Image (hidden on small screens) */}
        <div className="hidden md:flex items-center justify-center bg-[#162447] w-1/2">
          <Image
            src="/Chatbot-amico.png"
            alt="Welcome"
            width={320}
            height={320}
            className="object-cover h-80 w-80 rounded-xl shadow-lg"
          />
        </div>
        {/* Form Card */}
        <div className="w-full md:w-1/2 p-10 flex flex-col justify-center">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <Image
              src="/logo.png"
              alt="Logo"
              width={56}
              height={56}
              className="h-14 w-14 rounded-full shadow-md border-2 border-purple-400"
            />
          </div>
          <h2 className="text-3xl font-bold text-center text-purple-700 mb-2 tracking-wide flex items-center justify-center gap-2">
            Welcome Back! <span>👋</span>
          </h2>
          <p className="text-center text-gray-500 mb-6 flex items-center justify-center gap-1">
            Please login to continue <span>🔐</span>
          </p>
          <form className="space-y-6" onSubmit={e => e.preventDefault()}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email Address <span>📧</span>
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 text-black focus:ring-purple-400 transition"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password <span>🔒</span>
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 text-black focus:ring-purple-400 transition"
                placeholder="••••••••"
              />
            </div>
            <div className="flex gap-4">
              <button
                type="button"
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 rounded-lg shadow transition"
                disabled={loading === 'login'}
                onClick={async (e) => {
                  setLoading('login');
                  const form = e.currentTarget.form;
                  if (!form) return;
                  const formData = new FormData(form);
                  const result = await login(formData);
                  if (result && result.error) {
                    alert(result.error);
                  }
                  setLoading(null);
                }}
              >
                {loading === 'login' ? 'Loading...' : 'Log in 🚀'}
              </button>
              <button
                type="button"
                className="flex-1 bg-pink-500 hover:bg-pink-600 text-white font-semibold py-2 rounded-lg shadow transition"
                disabled={loading === 'signup'}
                onClick={async (e) => {
  Swal.fire({
    icon: 'info',
    title: 'Please check your email',
    text: 'We have sent you a confirmation email.',
  });
  setLoading('signup');
  const form = e.currentTarget.form;
  if (!form) return;
  const formData = new FormData(form);
  const result = await signup(formData);
  if (result && result.error) {
    // Optionally show error alert here if you want
    // Swal.fire({ icon: 'error', title: 'Sign Up Failed', text: result.error });
  }
  setLoading(null);
}}
              >
                {loading === 'signup' ? 'Loading...' : 'Sign up ✨'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}