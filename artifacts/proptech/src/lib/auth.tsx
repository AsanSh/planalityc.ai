import {
	createContext,
	type ReactNode,
	useContext,
	useEffect,
	useState,
} from "react";
import { useQuery } from "@tanstack/react-query";
import { getGetMeQueryOptions, setAuthTokenGetter, type User } from "@/api-client";

interface AuthContextType {
	user: User | null;
	isAuthenticated: boolean;
	isLoading: boolean;
	login: (token: string) => void;
	logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
	const [token, setToken] = useState<string | null>(() =>
		localStorage.getItem("auth_token"),
	);

	useEffect(() => {
		setAuthTokenGetter(() => token);
		if (token) {
			localStorage.setItem("auth_token", token);
		} else {
			localStorage.removeItem("auth_token");
		}
	}, [token]);

	const {
		data: user,
		isLoading,
		isError,
		error,
		refetch,
	} = useQuery({
		...getGetMeQueryOptions(),
		enabled: !!token,
		retry: false,
		refetchOnMount: "always",
		refetchOnWindowFocus: false,
	});

	useEffect(() => {
		if (!isError) return;
		// Only force logout on a real auth failure. A 429 (rate limit), 5xx, or
		// network blip must NOT clear the token — otherwise normal active use
		// kicks the user back to /login.
		const status =
			(error as { response?: { status?: number }; status?: number } | null)?.response?.status ??
			(error as { status?: number } | null)?.status;
		if (status === 401 || status === 403) {
			setToken(null);
		}
	}, [isError, error]);

	useEffect(() => {
		if (token && !isLoading && !user && !isError) {
			refetch();
		}
	}, [token, isLoading, user, isError, refetch]);

	const login = (newToken: string) => {
		setToken(newToken);
		// Force refetch user data after setting token
		setTimeout(() => {
			refetch();
		}, 100);
	};

	const logout = () => {
		setToken(null);
	};

	const value = {
		user: user || null,
		isAuthenticated: !!user,
		isLoading: isLoading && !!token,
		login,
		logout,
	};

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
	const context = useContext(AuthContext);
	if (context === undefined) {
		throw new Error("useAuth must be used within an AuthProvider");
	}
	return context;
}
