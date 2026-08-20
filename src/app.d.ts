declare global {
	namespace App {
		interface Locals {
			visitorId: string;
			lang: 'fr' | 'en' | 'ar' | 'fa';
			theme: 'light' | 'dark';
		}
	}
}

export {};
