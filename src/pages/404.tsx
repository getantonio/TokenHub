export default function Custom404() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <h1 className="text-4xl font-bold mb-4">404 - Page Not Found</h1>
      <p className="text-lg mb-6">Sorry, the page you are looking for doesn't exist.</p>
      <a 
        href="/"
        className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
      >
        Return to Home
      </a>
    </div>
  )
} 