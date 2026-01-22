import { createServerClient } from '@supabase/ssr';
import { type Handle, redirect } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

const supabase: Handle = async ({ event, resolve }) => {
	event.locals.supabase = createServerClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
		cookies: {
			getAll: () => event.cookies.getAll(),
			setAll: (cookiesToSet) => {
				// Wrap in try-catch to prevent errors if response has already been sent
				try {
					cookiesToSet.forEach(({ name, value, options }) => {
						try {
							event.cookies.set(name, value, { 
								...options, 
								path: '/',
								sameSite: 'lax',
								secure: true
							});
						} catch (error) {
							// Silently ignore cookie errors (e.g., after response is sent)
							// This can happen with Supabase's async token refresh callbacks
						}
					});
				} catch (error) {
					// Ignore errors from cookie operations after response
				}
			}
		}
	});

	event.locals.safeGetSession = async () => {
		const {
			data: { session }
		} = await event.locals.supabase.auth.getSession();

		if (!session) {
			return { session: null, user: null };
		}

		const {
			data: { user },
			error
		} = await event.locals.supabase.auth.getUser();

		if (error) {
			return { session: null, user: null };
		}

		return { session, user };
	};

	return resolve(event, {
		filterSerializedResponseHeaders(name) {
			return name === 'content-range' || name === 'x-supabase-api-version';
		}
	});
};

const authGuard: Handle = async ({ event, resolve }) => {
	const { session, user } = await event.locals.safeGetSession();
	event.locals.session = session;
	event.locals.user = user;

	// Protected routes
	const protectedRoutes = ['/dashboard', '/imports', '/settings', '/budgets', '/insights'];
	const isProtected = protectedRoutes.some((route) => event.url.pathname.startsWith(route));

	if (isProtected && !session) {
		throw redirect(303, '/login');
	}

	// Redirect logged-in users away from auth pages (but allow callback)
	const authRoutes = ['/login', '/signup'];
	const isAuthRoute = authRoutes.includes(event.url.pathname);
	const isCallbackRoute = event.url.pathname === '/auth/callback';

	if (isAuthRoute && session && !isCallbackRoute) {
		throw redirect(303, '/dashboard');
	}

	return resolve(event);
};

export const handle: Handle = sequence(supabase, authGuard);
