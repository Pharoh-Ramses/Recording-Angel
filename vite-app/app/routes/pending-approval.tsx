import { Link } from "react-router";
import type { Route } from "./+types/pending-approval";
import { useSession, signOut } from "../lib/auth/client";

export function meta({}: Route.MetaArgs) {
	return [
		{ title: "Pending Approval - Recording Angel" },
		{ name: "description", content: "Your account is pending approval" },
	];
}

export default function PendingApproval() {
	const { data: session } = useSession();
	const user = session?.user;

	const handleLogout = async () => {
		try {
			await signOut();
		} catch (error) {
			console.error("Logout error:", error);
		}
	};

	return (
		<div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
			<div className="sm:mx-auto sm:w-full sm:max-w-md">
				<div className="flex justify-center">
					<div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center">
						<svg
							className="w-8 h-8 text-yellow-600"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
							/>
						</svg>
					</div>
				</div>

				<div className="mt-6 text-center">
					<h2 className="text-3xl font-bold text-gray-900">
						Account Pending Approval
					</h2>
					<p className="mt-4 text-lg text-gray-600">
						Thanks for registering, {user?.fullName}!
					</p>
					<p className="mt-2 text-sm text-gray-500">
						Your account is currently pending approval from an administrator.
						You'll receive an email notification once your account has been
						approved.
					</p>
				</div>

				<div className="mt-8 bg-white py-6 px-4 shadow sm:rounded-lg sm:px-6">
					<div className="space-y-4">
						<div className="bg-blue-50 border border-blue-200 rounded-md p-4">
							<div className="flex">
								<div className="flex-shrink-0">
									<svg
										className="h-5 w-5 text-blue-400"
										viewBox="0 0 20 20"
										fill="currentColor"
									>
										<path
											fillRule="evenodd"
											d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
											clipRule="evenodd"
										/>
									</svg>
								</div>
								<div className="ml-3">
									<h3 className="text-sm font-medium text-blue-800">
										What happens next?
									</h3>
									<div className="mt-2 text-sm text-blue-700">
										<ul className="list-disc pl-5 space-y-1">
											<li>An administrator will review your registration</li>
											<li>
												They may contact you to verify your ward and stake
												information
											</li>
											<li>
												Once approved, you'll receive an email confirmation
											</li>
											<li>
												You can then sign in and start using Recording Angel
											</li>
										</ul>
									</div>
								</div>
							</div>
						</div>

						<div className="text-center space-y-3">
							<p className="text-sm text-gray-600">
								Questions about your registration?
							</p>
							<div className="flex flex-col sm:flex-row gap-2 justify-center">
								<button
									onClick={handleLogout}
									className="px-4 py-2 cursor-pointer border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50"
								>
									Sign out
								</button>
								<Link
									to="/contact"
									className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
								>
									Contact Support
								</Link>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
