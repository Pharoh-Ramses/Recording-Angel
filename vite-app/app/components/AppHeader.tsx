import { useSession, signOut } from '../lib/auth/client';

export function AppHeader() {
  const { data: session } = useSession();
  const user = session?.user;

  const handleLogout = async () => {
    try {
      console.log('Attempting to sign out...');
      const result = await signOut();
      console.log('Sign out result:', result);
      // Force reload to clear any cached state
      window.location.reload();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo/Title */}
          <div className="flex items-center">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center mr-3">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </div>
            <h1 className="text-lg font-semibold text-gray-900">Recording Angel</h1>
          </div>

          {/* User Info */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <div className="text-sm">
                <div className="font-medium text-gray-900">{user?.fullName}</div>
                <div className="text-gray-500">
                  Ward {user?.ward} • Stake {user?.stake}
                </div>
              </div>
              
              <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                user?.status === 'APPROVED' 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-yellow-100 text-yellow-800'
              }`}>
                {user?.status.toLowerCase()}
              </div>

              <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                user?.role === 'ADMIN' 
                  ? 'bg-purple-100 text-purple-800'
                  : user?.role === 'BISHOP'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {user?.role.toLowerCase()}
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}