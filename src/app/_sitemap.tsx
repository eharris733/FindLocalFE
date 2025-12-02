// This file tells Expo Router which routes to statically render
// Only simple, SEO-critical pages will be pre-rendered
export async function generateStaticParams() {
  // Only render the homepage statically
  // Other routes will still work dynamically
  return [{}]; // Empty object = root route
}
