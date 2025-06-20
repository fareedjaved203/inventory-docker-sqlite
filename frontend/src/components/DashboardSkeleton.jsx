function DashboardSkeleton() {
  return (
    <div className="p-4 animate-pulse">
      {/* Header */}
      <div className="mb-8">
        <div className="h-8 bg-gray-300 rounded w-48"></div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white p-6 rounded-lg shadow">
            <div className="h-4 bg-gray-300 rounded w-1/2 mb-2"></div>
            <div className="h-8 bg-gray-300 rounded w-3/4"></div>
          </div>
        ))}
      </div>

      {/* Recent Sales Table */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="h-6 bg-gray-300 rounded w-48 mb-6"></div>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex space-x-4">
              <div className="h-4 bg-gray-300 rounded w-32"></div>
              <div className="h-4 bg-gray-300 rounded w-48"></div>
              <div className="h-4 bg-gray-300 rounded w-24"></div>
              <div className="h-4 bg-gray-300 rounded w-20"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default DashboardSkeleton;