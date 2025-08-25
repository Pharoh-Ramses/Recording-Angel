import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import type { Route } from './+types/register';
import { useSession, signUp } from '../lib/auth/client';
import { useState } from 'react';

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Sign Up - Recording Angel" },
    { name: "description", content: "Create your Recording Angel account" },
  ];
}

export default function Register() {
  const navigate = useNavigate();
  const { data: session, isPending: isLoading, error } = useSession();
  const isAuthenticated = !!session;
  
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    ward: 0,
    stake: 0,
    profile_picture: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // No need to clear errors manually with BetterAuth

  const handleChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    
    if (!formData.full_name?.trim()) {
      errors.full_name = 'Full name is required';
    }
    
    if (!formData.email) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Email is invalid';
    }
    
    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    }
    
    if (!formData.ward || formData.ward < 1) {
      errors.ward = 'Ward number is required';
    }
    
    if (!formData.stake || formData.stake < 1) {
      errors.stake = 'Stake number is required';
    }
    
    return errors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setFormErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);
    setFormErrors({});

    try {
      await signUp.email({
        email: formData.email,
        password: formData.password,
        name: formData.full_name,
        fullName: formData.full_name,
        ward: formData.ward,
        stake: formData.stake,
      });
      navigate('/pending-approval', { replace: true });
    } catch (error) {
      console.error('Registration failed:', error);
      setFormErrors({ general: 'Registration failed. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">
          Create your account
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Already have an account?{' '}
          <Link
            to="/login"
            className="font-medium text-blue-600 hover:text-blue-500"
          >
            Sign in
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* Global Error */}
            {(error?.message || formErrors.general) && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-800">{error?.message || formErrors.general}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Full Name Field */}
            <div>
              <label htmlFor="full_name" className="block text-sm font-medium text-gray-700">
                Full Name
              </label>
              <div className="mt-1">
                <input
                  id="full_name"
                  name="full_name"
                  type="text"
                  autoComplete="name"
                  required
                  value={formData.full_name}
                  onChange={(e) => handleChange('full_name', e.target.value)}
                   className={`appearance-none block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900 bg-white ${
                     formErrors.full_name ? 'border-red-300' : 'border-gray-300'
                   }`}
                  placeholder="Enter your full name"
                />
                {formErrors.full_name && (
                  <p className="mt-2 text-sm text-red-600">{formErrors.full_name}</p>
                )}
              </div>
            </div>

            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                   className={`appearance-none block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900 bg-white ${
                     formErrors.email ? 'border-red-300' : 'border-gray-300'
                   }`}
                  placeholder="Enter your email"
                />
                {formErrors.email && (
                  <p className="mt-2 text-sm text-red-600">{formErrors.email}</p>
                )}
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={formData.password}
                  onChange={(e) => handleChange('password', e.target.value)}
                   className={`appearance-none block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900 bg-white ${
                     formErrors.password ? 'border-red-300' : 'border-gray-300'
                   }`}
                  placeholder="Create a password (min. 8 characters)"
                />
                {formErrors.password && (
                  <p className="mt-2 text-sm text-red-600">{formErrors.password}</p>
                )}
              </div>
            </div>

            {/* Ward and Stake Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="ward" className="block text-sm font-medium text-gray-700">
                  Ward Number
                </label>
                <div className="mt-1">
                  <input
                    id="ward"
                    name="ward"
                    type="number"
                    min="1"
                    required
                    value={formData.ward || ''}
                    onChange={(e) => handleChange('ward', parseInt(e.target.value) || 0)}
                     className={`appearance-none block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900 bg-white ${
                       formErrors.ward ? 'border-red-300' : 'border-gray-300'
                     }`}
                    placeholder="Ward #"
                  />
                  {formErrors.ward && (
                    <p className="mt-2 text-sm text-red-600">{formErrors.ward}</p>
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="stake" className="block text-sm font-medium text-gray-700">
                  Stake Number
                </label>
                <div className="mt-1">
                  <input
                    id="stake"
                    name="stake"
                    type="number"
                    min="1"
                    required
                    value={formData.stake || ''}
                    onChange={(e) => handleChange('stake', parseInt(e.target.value) || 0)}
                     className={`appearance-none block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900 bg-white ${
                       formErrors.stake ? 'border-red-300' : 'border-gray-300'
                     }`}
                    placeholder="Stake #"
                  />
                  {formErrors.stake && (
                    <p className="mt-2 text-sm text-red-600">{formErrors.stake}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div>
              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                  isSubmitting
                    ? 'bg-blue-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {isSubmitting ? (
                  <div className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creating account...
                  </div>
                ) : (
                  'Create account'
                )}
              </button>
            </div>

            {/* Terms Notice */}
            <div className="text-xs text-gray-500 text-center">
              By creating an account, you agree to our terms of service and privacy policy.
              Your account will need approval before you can access the system.
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}