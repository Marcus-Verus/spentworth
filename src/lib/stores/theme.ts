import { browser } from '$app/environment';

// Simple theme state (no runes in .ts files)
let currentTheme: 'light' | 'dark' = 'light';

export function getTheme(): 'light' | 'dark' {
	return currentTheme;
}

export function setTheme(theme: 'light' | 'dark') {
	currentTheme = theme;
	if (browser) {
		if (theme === 'dark') {
			document.documentElement.classList.add('dark');
		} else {
			document.documentElement.classList.remove('dark');
		}
		localStorage.setItem('theme', theme);
	}
}

export function toggleTheme() {
	setTheme(currentTheme === 'dark' ? 'light' : 'dark');
}

export function initTheme() {
	if (browser) {
		const saved = localStorage.getItem('theme') as 'light' | 'dark' | null;
		// Default to light mode
		const theme = saved || 'light';
		setTheme(theme);
	}
}
