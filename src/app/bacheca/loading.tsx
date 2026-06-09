import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'

/**
 * Skeleton mostrato automaticamente da Next.js durante il fetch server-side
 * della bacheca (molte query Supabase). Riduce la percezione di blocco.
 */
export default function BachecaLoading() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 animate-pulse">

        {/* Page header */}
        <div className="bg-white border-b border-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <div className="h-9 w-64 bg-gray-200 rounded-lg" />
            <div className="h-5 w-80 bg-gray-100 rounded-lg mt-3" />
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-6">
          {/* Tabs + toggle */}
          <div className="flex items-center justify-between">
            <div className="h-10 w-44 bg-gray-100 rounded-full" />
            <div className="h-10 w-28 bg-gray-100 rounded-xl" />
          </div>

          {/* Filter bar */}
          <div className="h-28 bg-white border border-gray-100 rounded-2xl shadow-sm" />

          {/* Griglia card */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white border border-gray-100 rounded-2xl p-5 flex flex-col gap-4">
                <div className="h-5 w-3/4 bg-gray-200 rounded" />
                <div className="flex gap-2">
                  <div className="h-6 w-16 bg-gray-100 rounded-full" />
                  <div className="h-6 w-20 bg-gray-100 rounded-full" />
                </div>
                <div className="flex flex-col gap-2 mt-1">
                  <div className="h-4 w-full bg-gray-100 rounded" />
                  <div className="h-4 w-5/6 bg-gray-100 rounded" />
                  <div className="h-4 w-2/3 bg-gray-100 rounded" />
                </div>
                <div className="h-10 w-full bg-gray-100 rounded-xl mt-2" />
              </div>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
