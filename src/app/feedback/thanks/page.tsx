/**
 * Feedback Thank You Page
 *
 * Landing page for users after clicking feedback links in digest emails.
 * Displays appropriate message based on query parameters:
 * - success=true: Thanks message
 * - error=expired: Token expired message
 * - error=invalid: Invalid/missing token message
 *
 * Design Note: This page should be visually simple and reassuring.
 * Users arrive here after a single click from email, so we want
 * to confirm their action was received (or explain why it wasn't).
 */

import Link from "next/link";

interface FeedbackThanksPageProps {
  searchParams: Promise<{ success?: string; error?: string }>;
}

export default async function FeedbackThanksPage({
  searchParams,
}: FeedbackThanksPageProps) {
  const params = await searchParams;
  const isSuccess = params.success === "true";
  const errorType = params.error;

  // Determine display state
  const state = isSuccess
    ? "success"
    : errorType === "expired"
      ? "expired"
      : "invalid";

  const content = {
    success: {
      title: "Thanks for the feedback!",
      message: "Your input helps us improve CityPing for everyone.",
      icon: null, // Avoiding emojis per project guidelines
    },
    expired: {
      title: "Link Expired",
      message:
        "This feedback link has expired. Feedback links are valid for 7 days after the email is sent.",
      icon: null,
    },
    invalid: {
      title: "Invalid Link",
      message:
        "This feedback link is no longer valid. It may have already been used or the link was incomplete.",
      icon: null,
    },
  };

  const { title, message } = content[state];

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center p-8 max-w-md">
        <div
          className={`w-16 h-16 mx-auto mb-6 rounded-full flex items-center justify-center ${
            state === "success"
              ? "bg-green-100 text-green-600"
              : "bg-yellow-100 text-yellow-600"
          }`}
        >
          {state === "success" ? (
            <svg
              className="w-8 h-8"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          ) : (
            <svg
              className="w-8 h-8"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          )}
        </div>

        <h1 className="text-2xl font-bold mb-2 text-gray-900">{title}</h1>

        <p className="text-gray-600 mb-6">{message}</p>

        <Link
          href="/"
          className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Back to CityPing
        </Link>
      </div>
    </main>
  );
}
